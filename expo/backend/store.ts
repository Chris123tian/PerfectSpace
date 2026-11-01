import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Property,
  User,
  Conversation,
  ChatMessage,
  Booking,
  AppNotification,
  Review,
} from "@/types/property";
import { seedProperties } from "./seed";

const seedUsers: User[] = [
  {
    id: "admin1",
    name: "Admin Panel",
    email: "admin@perfectspace.com",
    password: "admin123",
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
  },
];

const seedConversations: Conversation[] = [];
const seedChatMessages: ChatMessage[] = [];
const seedReviews: Review[] = [];
const seedBookings: Booking[] = [];
const seedNotifications: AppNotification[] = [];

interface UserSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  darkMode: boolean;
}

// ── Disk persistence ─────────────────────────────────────────────────────────
// Every collection is mirrored to a JSON snapshot shortly after each mutation,
// so user data survives server restarts and deploys. Seeds are only used when
// no snapshot exists yet.

const DATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data"
);
const DATA_FILE = path.join(DATA_DIR, "db.json");

type PersistedData = {
  users: User[];
  properties: Property[];
  conversations: Conversation[];
  chatMessages: ChatMessage[];
  bookings: Booking[];
  notifications: AppNotification[];
  reviews: Review[];
  savedProperties: Record<string, string[]>;
  userSettings: Record<string, UserSettings>;
};

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

  private idCounter = Date.now();

  constructor() {
    const saved = loadPersisted();
    // Replace collections wholesale (through the setters, which re-wrap in
    // tracked proxies) so an existing snapshot always wins over seeds.
    if (saved.users?.length) this.users = saved.users;
    if (saved.properties?.length) this.properties = saved.properties;
    if (saved.conversations?.length) this.conversations = saved.conversations;
    if (saved.chatMessages?.length) this.chatMessages = saved.chatMessages;
    if (saved.bookings?.length) this.bookings = saved.bookings;
    if (saved.notifications?.length) this.notifications = saved.notifications;
    if (saved.reviews?.length) this.reviews = saved.reviews;
    if (saved.savedProperties)
      this.savedProperties = saved.savedProperties;
    if (saved.userSettings) this.userSettings = saved.userSettings;
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

  generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${this.idCounter.toString(36)}`;
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
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = DATA_FILE + ".tmp";
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
      };
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) {
      console.error("[Store] Snapshot write failed:", e);
    }
  }
}

export const store = new Store();

// Make sure the latest state is written before the process exits.
process.on("exit", () => store.flush());
process.on("SIGINT", () => {
  store.flush();
  process.exit(0);
});
process.on("SIGTERM", () => {
  store.flush();
  process.exit(0);
});
