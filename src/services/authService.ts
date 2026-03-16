import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/* ===== TYPES ===== */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  onboardingCompleted: boolean;
  writingProfile: WritingProfile;
  createdAt: string;
  updatedAt: string;
}

export interface WritingProfile {
  destination?: string;
  tone?: string;
  sentenceStyle?: string;
  structure?: string;
  lengthPreference?: string;
  perspective?: string;
  personalStories?: string;
  hookPreference?: string;
  formattingHabits?: string[];
  topicDomains?: string[];
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthStore {
  users: UserRecord[];
  sessions: SessionRecord[];
}

const DEFAULT_AUTH_STORE: AuthStore = {
  users: [],
  sessions: [],
};

/* ===== PASSWORD HASHING ===== */

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(derived, expected);
}

/* ===== SESSION DURATION ===== */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/* ===== AUTH SERVICE ===== */

export class AuthService {
  private readonly storePath: string;
  private state: AuthStore = structuredClone(DEFAULT_AUTH_STORE);

  constructor(storePath = `${process.cwd()}/data/auth.json`) {
    this.storePath = storePath;
    this.load();
  }

  private load(): void {
    if (!existsSync(this.storePath)) {
      this.persist();
      return;
    }
    const raw = readFileSync(this.storePath, "utf8").trim();
    if (!raw) {
      this.persist();
      return;
    }
    const parsed = JSON.parse(raw) as Partial<AuthStore>;
    this.state = {
      ...structuredClone(DEFAULT_AUTH_STORE),
      ...parsed,
    };
  }

  private persist(): void {
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  /* ===== REGISTRATION ===== */

  register(email: string, password: string, name: string): { user: UserRecord; token: string } {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = this.state.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    // Validate
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (!name.trim()) {
      throw new Error("Please enter your name.");
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const now = new Date().toISOString();

    const user: UserRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      salt,
      onboardingCompleted: false,
      writingProfile: {},
      createdAt: now,
      updatedAt: now,
    };

    this.state.users.push(user);
    const token = this.createSession(user.id);
    this.persist();

    return { user, token };
  }

  /* ===== LOGIN ===== */

  login(email: string, password: string): { user: UserRecord; token: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email === normalizedEmail);

    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      throw new Error("Invalid email or password.");
    }

    const token = this.createSession(user.id);
    this.persist();

    return { user, token };
  }

  /* ===== SESSION MANAGEMENT ===== */

  private createSession(userId: string): string {
    // Clean up expired sessions for this user
    const now = new Date();
    this.state.sessions = this.state.sessions.filter(
      (s) => new Date(s.expiresAt) > now
    );

    const token = randomUUID();
    const session: SessionRecord = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
    };

    this.state.sessions.push(session);
    return token;
  }

  validateToken(token: string): UserRecord | null {
    const session = this.state.sessions.find((s) => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      // Expired — clean up
      this.state.sessions = this.state.sessions.filter((s) => s.token !== token);
      this.persist();
      return null;
    }

    return this.state.users.find((u) => u.id === session.userId) ?? null;
  }

  logout(token: string): void {
    this.state.sessions = this.state.sessions.filter((s) => s.token !== token);
    this.persist();
  }

  /* ===== WRITING PROFILE ===== */

  updateWritingProfile(userId: string, profile: WritingProfile): UserRecord | null {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return null;

    user.writingProfile = { ...user.writingProfile, ...profile };
    user.updatedAt = new Date().toISOString();
    this.persist();
    return user;
  }

  completeOnboarding(userId: string, profile: WritingProfile): UserRecord | null {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return null;

    user.writingProfile = profile;
    user.onboardingCompleted = true;
    user.updatedAt = new Date().toISOString();
    this.persist();
    return user;
  }

  getUser(userId: string): UserRecord | null {
    return this.state.users.find((u) => u.id === userId) ?? null;
  }

  /* ===== SAFE USER (no password fields) ===== */

  static safeUser(user: UserRecord): Omit<UserRecord, "passwordHash" | "salt"> {
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }
}
