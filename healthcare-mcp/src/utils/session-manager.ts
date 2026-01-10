// Session management with TTL and capacity limits
// Prevents memory leaks and ensures predictable resource usage

import { sessionLogger, logEvents } from "./logger.js";
import type { HealthcareChat } from "../ai/chat.js";

// Configuration
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // Check every minute

interface SessionEntry {
  chat: HealthcareChat;
  createdAt: number;
  lastAccessedAt: number;
  messageCount: number;
}

interface SessionStats {
  totalSessions: number;
  oldestSessionAge: number;
  totalMessages: number;
  sessionsCreated: number;
  sessionsExpired: number;
  sessionsEvicted: number;
}

type ChatFactory = (sessionId: string) => HealthcareChat;

class SessionManager {
  private sessions = new Map<string, SessionEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private chatFactory: ChatFactory | null = null;

  // Lifetime stats
  private stats = {
    sessionsCreated: 0,
    sessionsExpired: 0,
    sessionsEvicted: 0,
  };

  constructor() {
    this.startCleanup();
  }

  /**
   * Set the factory function for creating new chat instances
   */
  setChatFactory(factory: ChatFactory): void {
    this.chatFactory = factory;
  }

  /**
   * Get or create a session
   */
  getSession(sessionId: string): HealthcareChat | null {
    if (!this.chatFactory) {
      sessionLogger.error("Chat factory not configured");
      return null;
    }

    const existing = this.sessions.get(sessionId);

    if (existing) {
      // Update last accessed time
      existing.lastAccessedAt = Date.now();
      return existing.chat;
    }

    // Check capacity before creating new session
    if (this.sessions.size >= MAX_SESSIONS) {
      this.evictOldest();
    }

    // Create new session
    const chat = this.chatFactory(sessionId);
    const now = Date.now();

    this.sessions.set(sessionId, {
      chat,
      createdAt: now,
      lastAccessedAt: now,
      messageCount: 0,
    });

    this.stats.sessionsCreated++;
    logEvents.sessionCreated(sessionId, this.sessions.size);

    return chat;
  }

  /**
   * Record a message in a session (for stats)
   */
  recordMessage(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messageCount++;
      session.lastAccessedAt = Date.now();
    }
  }

  /**
   * Delete a specific session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logEvents.sessionExpired(sessionId, "manual");
    }
    return deleted;
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get current session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get detailed statistics
   */
  getStats(): SessionStats {
    const now = Date.now();
    let oldestAge = 0;
    let totalMessages = 0;

    for (const session of this.sessions.values()) {
      const age = now - session.createdAt;
      if (age > oldestAge) {
        oldestAge = age;
      }
      totalMessages += session.messageCount;
    }

    return {
      totalSessions: this.sessions.size,
      oldestSessionAge: oldestAge,
      totalMessages,
      ...this.stats,
    };
  }

  /**
   * Evict the least recently used session
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, session] of this.sessions) {
      if (session.lastAccessedAt < oldestTime) {
        oldestTime = session.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.sessions.delete(oldestKey);
      this.stats.sessionsEvicted++;
      logEvents.sessionEvicted(oldestKey, this.sessions.size);
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const timeSinceAccess = now - session.lastAccessedAt;
      if (timeSinceAccess >= SESSION_TTL_MS) {
        expiredIds.push(sessionId);
      }
    }

    for (const sessionId of expiredIds) {
      this.sessions.delete(sessionId);
      this.stats.sessionsExpired++;
      logEvents.sessionExpired(sessionId, "ttl");
    }

    if (expiredIds.length > 0) {
      sessionLogger.info(
        { expired: expiredIds.length, remaining: this.sessions.size },
        "session cleanup"
      );
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    // Don't prevent process exit
    this.cleanupTimer.unref();
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all sessions (for testing or shutdown)
   */
  clear(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    sessionLogger.info({ cleared: count }, "all sessions cleared");
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Export configuration for reference
export const SessionConfig = {
  TTL_MS: SESSION_TTL_MS,
  MAX_SESSIONS,
  CLEANUP_INTERVAL_MS,
} as const;

export default sessionManager;
