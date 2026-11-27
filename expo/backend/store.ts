/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import {
  Property,
  User,
  Conversation,
  ChatMessage,
  Booking,
  AppNotification,
  Review,
  Session,
  AuditEntry,
  Payment,
  Payout,
} from "../types/property";
import { seedProperties } from "./seed";
import { hashPassword, isHashed, randomToken } from "./security";

// Seed credentials are stored only as PBKDF2 hashes.
const ADMIN_PASSWORD_HASH =
  "pbkdf2$100000$76Td+bUjkpU5LuZX+9Lm0A==$G2h+k7epc/HZ06RMdVDpctUWWlyvODVUulsBjMeYbP4=";
const SUPERADMIN_PASSWORD_HASH =
  "pbkdf2$100000$zrl4kXLcKAiAFBl0gDj2rw==$vwX463f+Nc+YDuDl6oMKXkSwwBoDfm1+C9Gv67qnglE=";

export const SUPERADMIN_ID = "superadmin1";
/** Pseudo-recipient for notifications every staff member should see. */
export const ADMINS_INBOX = "admins";

const superAdminSeed: User = {
  id: SUPERADMIN_ID,
  name: "Super Admin",
  email: "superadmin@perfectspace.com",
  password: SUPERADMIN_PASSWORD_HASH,
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  phone: "",
  role: "superadmin",
  bio: "Platform owner with full oversight of Perfect Space.",
  propertiesCount: 0,
  reviewsCount: 0,
  rating: 5,
  memberSince: "Nov 2026",
  verified: true,
  isActive: true,
  authProvider: "password",
  passwordSet: true,
};

const US_CITY_STATE: Record<string, string> = {
  "new york": "New York",
  "san francisco": "California",
  "los angeles": "California",
  austin: "Texas",
  boston: "Massachusetts",
  chicago: "Illinois",
  miami: "Florida",
  denver: "Colorado",
  seattle: "Washington",
  portland: "Oregon",
};

export interface StoredBlob {
  id: string;
  mime: string;
  data: Uint8Array;
  ownerId: string;
  isPrivate: boolean;
  /** Capability key required to read a private blob (ID documents). */
  accessKey?: string;
  createdAt: string;
}

const seedUsers: User[] = [
  {
    id: "admin1",
    name: "Admin Panel",
    email: "admin@perfectspace.com",
    password: ADMIN_PASSWORD_HASH,
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    phone: "+1 (555) 000-0000",
    role: "admin",
    bio: "Platform administrator managing Perfect Space.",
    propertiesCount: 0,
    reviewsCount: 0,
    rating: 5,
    memberSince: "Jan 2024",
    verified: true,
    isActive: true,
    authProvider: "password",
    passwordSet: true,
  },
  superAdminSeed,
];

const seedConversations: Conversation[] = [];
const seedChatMessages: ChatMessage[] = [];
const seedReviews: Review[] = [];
const seedBookings: Booking[] = [];
const seedNotifications: AppNotification[] = [];

interface UserSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled?: boolean;
  darkMode: boolean;
}

// ── Persistence ─────────────────────────────────────────────────────────────
// Every collection is mirrored to a snapshot shortly after each mutation, so
// user data survives restarts and deploys. Seeds are only used when no
// snapshot exists yet.
//
// Two backends:
//  - FileSnapshotAdapter (default): JSON file on disk — local dev (Bun) and
//    Node serverless.
//  - Injected adapter: the Cloudflare Durable Object registers a SQLite-backed
//    adapter via setPersistenceAdapter() before serving any request.

export interface PersistenceAdapter {
  /** Return the persisted snapshot, or null when none exists. */
  load(): Partial<PersistedData> | null;
  /** Durably store the snapshot. Synchronous when the backend allows it. */
  save(data: PersistedData): void;
  /** Binary storage for uploaded images (kept out of the JSON snapshot). */
  putBlob?(blob: StoredBlob): void;
  getBlob?(id: string): StoredBlob | null;
  deleteBlob?(id: string): void;
}

let persistenceAdapter: PersistenceAdapter | null = null;

/**
 * Install (or remove) a persistence backend. When a snapshot exists it is
 * loaded immediately so the store serves durable data from the first request.
 */
export function setPersistenceAdapter(adapter: PersistenceAdapter | null): void {
  persistenceAdapter = adapter;
  if (adapter) store.reloadFrom(adapter.load());
}

const DATA_DIR = path.join(dataRoot(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

/**
 * Resolve a writable root for the snapshot. Uses this module's location on
 * Node/Bun (local dev + Vercel). Edge runtimes (Cloudflare Workers) have no
 * filesystem and may expose a non-file import.meta.url — persistence then
 * silently disables and the store runs fully in-memory from seeds.
 */
function dataRoot(): string {
  try {
    const here = new URL(".", import.meta.url).pathname;
    if (here && here.startsWith("/") && fs.existsSync(here)) return here;
  } catch {
    // fall through
  }
  return "/tmp";
}

export type PersistedData = {
  users: User[];
  properties: Property[];
  conversations: Conversation[];
  chatMessages: ChatMessage[];
  bookings: Booking[];
  notifications: AppNotification[];
  reviews: Review[];
  savedProperties: Record<string, string[]>;
  userSettings: Record<string, UserSettings>;
  sessions: Session[];
  auditLog: AuditEntry[];
  payments: Payment[];
  payouts: Payout[];
};

const MAX_AUDIT = 3000;
const MAX_SESSIONS = 3000;

function loadPersisted(): Partial<PersistedData> {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.users)) {
      console.log(
        "[Store] Restored snapshot:",
        parsed.users.length,
        "users,",
        (parsed.properties ?? []).length,
        "properties"
      );
      return parsed as Partial<PersistedData>;
    }
  } catch (e) {
    console.error("[Store] Snapshot unreadable, starting from seeds:", e);
  }
  return {};
}

/** Wrap an array/object so any mutation flags the store dirty. */
function tracked<T extends object>(target: T, markDirty: () => void): T {
  return new Proxy(target, {
    set(t, prop, value) {
      const ok = Reflect.set(t, prop, value);
      markDirty();
      return ok;
    },
    deleteProperty(t, prop) {
      markDirty();
      return Reflect.deleteProperty(t, prop);
    },
  });
}

class Store {
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private _users = tracked<User[]>([...seedUsers], () => this.markDirty());
  private _properties = tracked<Property[]>([...seedProperties], () =>
    this.markDirty()
  );
  private _conversations = tracked<Conversation[]>(
    [...seedConversations],
    () => this.markDirty()
  );
  private _chatMessages = tracked<ChatMessage[]>(
    [...seedChatMessages],
    () => this.markDirty()
  );
  private _bookings = tracked<Booking[]>([...seedBookings], () =>
    this.markDirty()
  );
  private _notifications = tracked<AppNotification[]>(
    [...seedNotifications],
    () => this.markDirty()
  );
  private _reviews = tracked<Review[]>([...seedReviews], () =>
    this.markDirty()
  );
  private _savedProperties = tracked<Record<string, string[]>>({}, () =>
    this.markDirty()
  );
  private _userSettings = tracked<Record<string, UserSettings>>({}, () =>
    this.markDirty()
  );
  private _sessions = tracked<Session[]>([], () => this.markDirty());
  private _auditLog = tracked<AuditEntry[]>([], () => this.markDirty());
  private _payments = tracked<Payment[]>([], () => this.markDirty());
  private _payouts = tracked<Payout[]>([], () => this.markDirty());
  private memoryBlobs = new Map<string, StoredBlob>();
  private migration: Promise<void> | null = null;

  private idCounter = Date.now();

  constructor() {
    this.reloadFrom(loadPersisted());
  }

  /**
   * Replace collections with persisted data (through the setters, which
   * re-wrap in tracked proxies). A snapshot always wins over seeds. Called
   * with the file snapshot at startup and again whenever a new persistence
   * adapter is installed.
   */
  reloadFrom(saved: Partial<PersistedData> | null) {
    this.migration = null; // re-run migrations against the new data
    if (!saved) return;
    if (saved.users?.length) this.users = saved.users;
    if (saved.properties?.length) {
      // Migration: listings created before the country field existed default
      // to the seed marketplace so country filters behave predictably.
      this.properties = saved.properties.map((p) => ({
        country: "United States",
        ...p,
      }) as typeof saved.properties[number]);
    }
    if (saved.conversations?.length) this.conversations = saved.conversations;
    if (saved.chatMessages?.length) this.chatMessages = saved.chatMessages;
    if (saved.bookings?.length) this.bookings = saved.bookings;
    if (saved.notifications?.length) this.notifications = saved.notifications;
    if (saved.reviews?.length) this.reviews = saved.reviews;
    if (saved.savedProperties)
      this.savedProperties = saved.savedProperties;
    if (saved.userSettings) this.userSettings = saved.userSettings;
    if (saved.sessions) this.sessions = saved.sessions;
    if (saved.auditLog) this.auditLog = saved.auditLog;
    if (saved.payments) this.payments = saved.payments;
    if (saved.payouts) this.payouts = saved.payouts;
  }

  /**
   * One-time, idempotent data migrations. Async because password hashing uses
   * WebCrypto; awaited before every request is handled (see createContext).
   */
  ensureMigrated(): Promise<void> {
    if (!this.migration) {
      this.migration = this.migrate().catch((e) => {
        console.error("[Store] Migration failed:", e);
        this.migration = null;
      });
    }
    return this.migration;
  }

  private async migrate() {
    // 1. Super admin account always exists (password is never reset if changed).
    if (!this.users.some((u) => u.id === SUPERADMIN_ID)) {
      this.users.push({ ...superAdminSeed });
      console.log("[Store] Seeded super admin account");
    }

    // 2. Hash any plaintext password; classify Google accounts.
    for (let i = 0; i < this.users.length; i++) {
      const u = this.users[i];
      const patch: Partial<User> = {};
      if (u.password && u.password.startsWith("google_oauth_")) {
        patch.password = undefined;
        patch.authProvider = "google";
        patch.passwordSet = false;
      } else if (u.password && !isHashed(u.password)) {
        patch.password = await hashPassword(u.password);
        patch.passwordSet = true;
        if (!u.authProvider) patch.authProvider = "password";
      } else {
        if (!u.authProvider) patch.authProvider = u.password ? "password" : "google";
        if (u.passwordSet === undefined) patch.passwordSet = !!u.password;
      }
      if (Object.keys(patch).length) this.users[i] = { ...this.users[i], ...patch };
    }

    // 3. Admin notifications go to the shared staff inbox.
    for (let i = 0; i < this.notifications.length; i++) {
      if (this.notifications[i].userId === "admin1") {
        this.notifications[i] = { ...this.notifications[i], userId: ADMINS_INBOX };
      }
    }

    // 4. Region backfill for US listings created before regions existed.
    for (let i = 0; i < this.properties.length; i++) {
      const p = this.properties[i];
      if (!p.region && (p.country ?? "United States") === "United States") {
        const state = US_CITY_STATE[p.city.trim().toLowerCase()];
        if (state) this.properties[i] = { ...p, region: state };
      }
    }

    // 5. Expire stale sessions.
    this.pruneSessions();
  }

  pruneSessions() {
    const now = Date.now();
    let changed = false;
    const next = this.sessions.map((s) => {
      if (!s.loggedOutAt && Date.parse(s.expiresAt) < now) {
        changed = true;
        return { ...s, loggedOutAt: s.expiresAt, endReason: "expired" as const };
      }
      return s;
    });
    if (next.length > MAX_SESSIONS) {
      // Drop the oldest ended sessions first.
      next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      next.length = MAX_SESSIONS;
      changed = true;
    }
    if (changed) this.sessions = next;
  }

  audit(entry: Omit<AuditEntry, "id" | "at">) {
    this.auditLog.unshift({
      id: `a_${Date.now().toString(36)}${randomToken(4)}`,
      at: new Date().toISOString(),
      ...entry,
    });
    if (this.auditLog.length > MAX_AUDIT) this.auditLog.length = MAX_AUDIT;
  }

  // ── Blob storage (uploaded images) ───────────────────────────────────────
  putBlob(blob: StoredBlob) {
    if (persistenceAdapter?.putBlob) return persistenceAdapter.putBlob(blob);
    this.memoryBlobs.set(blob.id, blob);
    try {
      const dir = path.join(DATA_DIR, "blobs");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, blob.id), blob.data);
      fs.writeFileSync(
        path.join(dir, blob.id + ".json"),
        JSON.stringify({ ...blob, data: undefined })
      );
    } catch {
      // in-memory only
    }
  }

  getBlob(id: string): StoredBlob | null {
    if (!/^[a-zA-Z0-9_]+$/.test(id)) return null;
    if (persistenceAdapter?.getBlob) return persistenceAdapter.getBlob(id);
    const cached = this.memoryBlobs.get(id);
    if (cached) return cached;
    try {
      const dir = path.join(DATA_DIR, "blobs");
      const meta = JSON.parse(fs.readFileSync(path.join(dir, id + ".json"), "utf8"));
      const data = new Uint8Array(fs.readFileSync(path.join(dir, id)));
      return { ...meta, data } as StoredBlob;
    } catch {
      return null;
    }
  }

  get users() {
    return this._users;
  }
  set users(v: User[]) {
    this._users = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get properties() {
    return this._properties;
  }
  set properties(v: Property[]) {
    this._properties = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get conversations() {
    return this._conversations;
  }
  set conversations(v: Conversation[]) {
    this._conversations = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get chatMessages() {
    return this._chatMessages;
  }
  set chatMessages(v: ChatMessage[]) {
    this._chatMessages = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get bookings() {
    return this._bookings;
  }
  set bookings(v: Booking[]) {
    this._bookings = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get notifications() {
    return this._notifications;
  }
  set notifications(v: AppNotification[]) {
    this._notifications = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get reviews() {
    return this._reviews;
  }
  set reviews(v: Review[]) {
    this._reviews = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get savedProperties() {
    return this._savedProperties;
  }
  set savedProperties(v: Record<string, string[]>) {
    this._savedProperties = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get userSettings() {
    return this._userSettings;
  }
  set userSettings(v: Record<string, UserSettings>) {
    this._userSettings = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get sessions() {
    return this._sessions;
  }
  set sessions(v: Session[]) {
    this._sessions = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get payments() {
    return this._payments;
  }
  set payments(v: Payment[]) {
    this._payments = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get payouts() {
    return this._payouts;
  }
  set payouts(v: Payout[]) {
    this._payouts = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  get auditLog() {
    return this._auditLog;
  }
  set auditLog(v: AuditEntry[]) {
    this._auditLog = tracked(v, () => this.markDirty());
    this.markDirty();
  }

  generateId(prefix: string): string {
    // Collision-proof: never rely on the in-memory counter alone — the DO can
    // restart with persisted rows created by an older counter, and a fresh
    // counter would mint duplicate ids and overwrite real users/listings.
    this.idCounter++;
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}${random}`;
  }

  /** Debounced so bursts of mutations write once, not per keystroke. */
  private markDirty() {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 800);
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    const data: PersistedData = {
      users: this.users,
      properties: this.properties,
      conversations: this.conversations,
      chatMessages: this.chatMessages,
      bookings: this.bookings,
      notifications: this.notifications,
      reviews: this.reviews,
      savedProperties: this.savedProperties,
      userSettings: this.userSettings,
      sessions: this.sessions,
      auditLog: this.auditLog,
      payments: this.payments,
      payouts: this.payouts,
    };
    if (persistenceAdapter) {
      try {
        persistenceAdapter.save(data);
      } catch (e) {
        console.error("[Store] Adapter save failed:", e);
      }
      return;
    }
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = DATA_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) {
      console.error("[Store] Snapshot write failed:", e);
    }
  }
}

export const store = new Store();

// Make sure the latest state is written before the process exits.
// (Edge runtimes have no long-lived process or signals — guard everything.)
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("exit", () => store.flush());
  process.on("SIGINT", () => {
    store.flush();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    store.flush();
    process.exit(0);
  });
}
