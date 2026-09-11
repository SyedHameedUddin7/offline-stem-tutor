import Dexie, { type EntityTable } from "dexie";
import type { ChatMessage, FlaggedItem } from "../types";

/**
 * Local-first persistence. This is the actual proof of "offline-first" as an
 * architecture, not just a feature: nothing in the app reads or writes
 * through a network call to function. Sync (see lib/sync.ts) is a strictly
 * optional, additive step that runs only when connectivity returns.
 */
class TutorDB extends Dexie {
  messages!: EntityTable<ChatMessage, "id">;
  flaggedItems!: EntityTable<FlaggedItem, "id">;

  constructor() {
    super("stem-offline-tutor");
    this.version(1).stores({
      messages: "id, subjectId, timestamp, synced",
      flaggedItems: "id, subjectId, teacherStatus, synced",
    });
  }
}

export const db = new TutorDB();
