// functions/perfect-space-store.ts — the durable home of Perfect Space data.
//
// A single "global" instance runs the whole Hono + tRPC app INSIDE the Durable
// Object, backed by its SQLite storage. Every request is serialized through
// this one strongly-consistent object, so bookings, listings (and their
// images), users, chats and reviews survive worker restarts, evictions and
// deploys — until an owner or admin deletes them.
//
// Persistence plumbs into the shared store via setPersistenceAdapter(); the
// store calls save() after each mutation and the DO persists to SQLite.

import { DurableObject } from "cloudflare:workers";

// @ts-expect-error — cross-folder import; resolved by the bundler.
import app from "../expo/backend/hono";
// @ts-expect-error — cross-folder import; resolved by the bundler.
import { store, setPersistenceAdapter, type PersistedData } from "../expo/backend/store";

type StateRow = { key: string; value: string };

export class PerfectSpaceStore extends DurableObject {
  private ready: Promise<void>;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);

    // Load persisted state and install the SQLite adapter BEFORE serving any
    // request, so even the first call sees durable data instead of seeds.
    this.ready = ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS state (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      const readAll = (): Record<string, unknown> => {
        const rows = ctx.storage.sql
          .exec<StateRow>("SELECT key, value FROM state")
          .toArray();
        const out: Record<string, unknown> = {};
        for (const row of rows) {
          try {
            out[row.key] = JSON.parse(row.value);
          } catch (e) {
            console.error(`[DO] corrupt row ${row.key}:`, e);
          }
        }
        return out;
      };

      setPersistenceAdapter({
        load() {
          const saved = readAll();
          if (!Object.keys(saved).length) return null;
          return saved as Partial<PersistedData>;
        },
        save(data: PersistedData) {
          const entries: [string, unknown][] = [
            ["users", data.users],
            ["properties", data.properties],
            ["conversations", data.conversations],
            ["chatMessages", data.chatMessages],
            ["bookings", data.bookings],
            ["notifications", data.notifications],
            ["reviews", data.reviews],
            ["savedProperties", data.savedProperties],
            ["userSettings", data.userSettings],
          ];
          for (const [key, value] of entries) {
            ctx.storage.sql.exec(
              `INSERT INTO state (key, value) VALUES (?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
              key,
              JSON.stringify(value)
            );
          }
        },
      });
    });
  }

  override async fetch(request: Request): Promise<Response> {
    await this.ready;

    // The full API (health, tRPC, auth, chat, uploads-as-URLs) runs here.
    const response = await app.fetch(request);

    // Durably persist anything the request mutated before responding. The
    // store coalesces bursts via its own dirty flag, and SQLite writes are
    // synchronous and local, so this adds negligible latency.
    try {
      store.flush();
    } catch (e) {
      console.error("[DO] flush failed:", e);
    }

    return response;
  }
}
