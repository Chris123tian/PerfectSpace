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
import { store, setPersistenceAdapter, type PersistedData, type StoredBlob } from "../expo/backend/store";
// @ts-expect-error — cross-folder import; resolved by the bundler.
import { setServerEnv } from "../expo/backend/env";
// @ts-expect-error — cross-folder import; resolved by the bundler.
import { drainOutbox } from "../expo/backend/sms";

type StateRow = { key: string; value: string };
type BlobRow = {
  id: string;
  mime: string;
  data: ArrayBuffer;
  owner_id: string;
  is_private: number;
  access_key: string | null;
  created_at: string;
};

export class PerfectSpaceStore extends DurableObject {
  private ready: Promise<void>;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    // Secrets (Paystack, mNotify) reach the shared backend through here.
    setServerEnv(env);

    // Load persisted state and install the SQLite adapter BEFORE serving any
    // request, so even the first call sees durable data instead of seeds.
    this.ready = ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS state (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
      // Uploaded photos/documents live as binary rows (kept out of the JSON
      // snapshot, which is limited to ~2 MB per row).
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS blobs (
          id         TEXT PRIMARY KEY,
          mime       TEXT NOT NULL,
          data       BLOB NOT NULL,
          owner_id   TEXT NOT NULL,
          is_private INTEGER NOT NULL DEFAULT 0,
          access_key TEXT,
          created_at TEXT NOT NULL
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
            ["sessions", data.sessions],
            ["auditLog", data.auditLog],
            ["payments", data.payments ?? []],
            ["payouts", data.payouts ?? []],
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
        putBlob(blob: StoredBlob) {
          ctx.storage.sql.exec(
            `INSERT OR REPLACE INTO blobs (id, mime, data, owner_id, is_private, access_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            blob.id,
            blob.mime,
            blob.data.buffer.slice(blob.data.byteOffset, blob.data.byteOffset + blob.data.byteLength),
            blob.ownerId,
            blob.isPrivate ? 1 : 0,
            blob.accessKey ?? null,
            blob.createdAt
          );
        },
        getBlob(id: string): StoredBlob | null {
          const row = ctx.storage.sql
            .exec<BlobRow>("SELECT * FROM blobs WHERE id = ?", id)
            .toArray()[0];
          if (!row) return null;
          return {
            id: row.id,
            mime: row.mime,
            data: new Uint8Array(row.data),
            ownerId: row.owner_id,
            isPrivate: !!row.is_private,
            accessKey: row.access_key ?? undefined,
            createdAt: row.created_at,
          };
        },
        deleteBlob(id: string) {
          ctx.storage.sql.exec("DELETE FROM blobs WHERE id = ?", id);
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

    // Send any SMS the request queued (mNotify). Never fail the request on it.
    try {
      await drainOutbox();
    } catch (e) {
      console.error("[DO] sms drain failed:", e);
    }

    return response;
  }
}
