import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

export interface Message {
  id: string;
  sessionId: string;
  speakerType: "user" | "character" | "system" | "narrator";
  speakerId: string | null;
  speakerName: string;
  content: string;
  createdAt: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  summary: string;
  turnIndex: number;
  createdAt: string;
}

export interface Session {
  id: string;
  worldId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorldFact {
  id: string;
  sessionId: string;
  fact: string;
  turnIndex: number;
  createdAt: string;
}

export interface CharacterMemory {
  id: string;
  sessionId: string;
  characterId: string;
  category: "impression" | "conflict" | "affinity" | "secret" | "promise" | "event" | "reflection";
  about: string;
  content: string;
  turnIndex: number;
  createdAt: string;
}

export type TimeOfDay = "dawn" | "morning" | "afternoon" | "night";

export interface WorldTime {
  sessionId: string;
  day: number;
  timeOfDay: TimeOfDay;
  turnCount: number;
}

export interface Relationship {
  id: string;
  sessionId: string;
  fromId: string;
  toId: string;
  trust: number;
  hostility: number;
  dependency: number;
  reason?: string;
  turnIndex: number;
  updatedAt: string;
}

export interface WorldEvent {
  id: string;
  sessionId: string;
  type: "plot_twist" | "character_action" | "environment" | "revelation" | "escalation";
  description: string;
  impact: string;
  turnIndex: number;
  createdAt: string;
}

export interface Clue {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  source: "dialogue" | "examination" | "deduction" | "document";
  relatedCharacterId?: string;
  turnIndex: number;
  createdAt: string;
}

export interface RelationshipHistory {
  id: string;
  sessionId: string;
  fromId: string;
  toId: string;
  previousTrust: number;
  previousHostility: number;
  previousDependency: number;
  newTrust: number;
  newHostility: number;
  newDependency: number;
  reason: string;
  turnIndex: number;
  createdAt: string;
}

interface StoreData {
  sessions: Session[];
  messages: Message[];
  events: SessionEvent[];
  worldFacts: WorldFact[];
  characterMemories: CharacterMemory[];
  worldTime: WorldTime[];
  relationships: Relationship[];
  worldEvents: WorldEvent[];
  relationshipHistory: RelationshipHistory[];
  clues: Clue[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const STORE_TMP_FILE = path.join(DATA_DIR, "store.json.tmp");

function cloneEmptyStore(): StoreData {
  return {
    sessions: [],
    messages: [],
    events: [],
    worldFacts: [],
    characterMemories: [],
    worldTime: [],
    relationships: [],
    worldEvents: [],
    relationshipHistory: [],
    clues: [],
  };
}

function read(): StoreData {
  if (!fs.existsSync(STORE_FILE)) {
    return cloneEmptyStore();
  }
  try {
    const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8").replace(/^\uFEFF/, ""));
    return {
      sessions: data.sessions || [],
      messages: data.messages || [],
      events: data.events || [],
      worldFacts: data.worldFacts || [],
      characterMemories: data.characterMemories || [],
      worldTime: data.worldTime || [],
      relationships: data.relationships || [],
      worldEvents: data.worldEvents || [],
      relationshipHistory: data.relationshipHistory || [],
      clues: data.clues || [],
    };
  } catch (e) {
    console.error("store.json is corrupted, backing up and resetting:", e);
    try {
      const backupFile = path.join(DATA_DIR, `store.recovered-${Date.now()}.json`);
      fs.copyFileSync(STORE_FILE, backupFile);
    } catch {}
    write(cloneEmptyStore());
    return cloneEmptyStore();
  }
}

function write(data: StoreData) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_TMP_FILE, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(STORE_TMP_FILE, STORE_FILE);
}

export function getOrCreateSession(worldId: string): Session {
  const data = read();
  let session = data.sessions.find((s) => s.worldId === worldId);
  if (!session) {
    session = {
      id: `session-${uuid()}`,
      worldId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.sessions.push(session);
    write(data);
  }
  return session;
}

export function getSession(sessionId: string): Session | null {
  return read().sessions.find((s) => s.id === sessionId) || null;
}

export function getMessages(sessionId: string): Message[] {
  return read().messages.filter((m) => m.sessionId === sessionId);
}

export function getEvents(sessionId: string): SessionEvent[] {
  return read().events.filter((e) => e.sessionId === sessionId);
}

export function addMessage(msg: Message) {
  const data = read();
  data.messages.push(msg);
  const session = data.sessions.find((s) => s.id === msg.sessionId);
  if (session) session.updatedAt = new Date().toISOString();
  write(data);
}

export function addEvent(evt: SessionEvent) {
  const data = read();
  data.events.push(evt);
  write(data);
}

export function getRecentMessages(sessionId: string, limit = 12): Message[] {
  return getMessages(sessionId).slice(-limit);
}

export function getWorldFacts(sessionId: string): WorldFact[] {
  return read().worldFacts.filter((f) => f.sessionId === sessionId);
}

export function getCharacterMemories(sessionId: string, characterId?: string): CharacterMemory[] {
  const mems = read().characterMemories.filter((m) => m.sessionId === sessionId);
  if (characterId) return mems.filter((m) => m.characterId === characterId);
  return mems;
}

export function addWorldFacts(facts: WorldFact[]) {
  const data = read();
  data.worldFacts.push(...facts);
  write(data);
}

export function addCharacterMemories(memories: CharacterMemory[]) {
  const data = read();
  data.characterMemories.push(...memories);
  write(data);
}

export function getWorldTime(sessionId: string): WorldTime {
  const data = read();
  let wt = data.worldTime.find((w) => w.sessionId === sessionId);
  if (!wt) {
    wt = { sessionId, day: 1, timeOfDay: "night", turnCount: 0 };
    data.worldTime.push(wt);
    write(data);
  }
  return wt;
}

export function updateWorldTime(wt: WorldTime) {
  const data = read();
  const idx = data.worldTime.findIndex((w) => w.sessionId === wt.sessionId);
  if (idx >= 0) {
    data.worldTime[idx] = wt;
  } else {
    data.worldTime.push(wt);
  }
  write(data);
}

export function getRelationships(sessionId: string): Relationship[] {
  return read().relationships.filter((r) => r.sessionId === sessionId);
}

export function updateRelationship(rel: Relationship) {
  const data = read();
  const key = (r: Relationship) => `${r.sessionId}-${r.fromId}-${r.toId}`;
  const idx = data.relationships.findIndex((r) => key(r) === key(rel));
  const prev = idx >= 0 ? data.relationships[idx] : null;

  if (idx >= 0) {
    data.relationships[idx] = rel;
  } else {
    data.relationships.push(rel);
  }

  if (prev && (prev.trust !== rel.trust || prev.hostility !== rel.hostility || prev.dependency !== rel.dependency)) {
    data.relationshipHistory.push({
      id: uuid(),
      sessionId: rel.sessionId,
      fromId: rel.fromId,
      toId: rel.toId,
      previousTrust: prev.trust,
      previousHostility: prev.hostility,
      previousDependency: prev.dependency,
      newTrust: rel.trust,
      newHostility: rel.hostility,
      newDependency: rel.dependency,
      reason: rel.reason || "",
      turnIndex: rel.turnIndex,
      createdAt: rel.updatedAt,
    });
  }

  write(data);
}

export function addWorldEvent(evt: WorldEvent) {
  const data = read();
  data.worldEvents.push(evt);
  write(data);
}

export function getWorldEvents(sessionId: string): WorldEvent[] {
  return read().worldEvents.filter((e) => e.sessionId === sessionId);
}

export function getRelationshipHistory(sessionId: string): RelationshipHistory[] {
  return read().relationshipHistory.filter((h) => h.sessionId === sessionId);
}

export function addClue(clue: Clue) {
  const data = read();
  const existing = data.clues.find(
    (c) => c.sessionId === clue.sessionId && c.name === clue.name
  );
  if (existing) return false;
  data.clues.push(clue);
  write(data);
  return true;
}

export function getClues(sessionId: string): Clue[] {
  return read().clues.filter((c) => c.sessionId === sessionId);
}

export function findSessionByWorldId(worldId: string): Session | undefined {
  return read().sessions.find((s) => s.worldId === worldId);
}

export function getSessionDataForExport(sessionId: string) {
  const data = read();
  return {
    messages: data.messages.filter((m) => m.sessionId === sessionId),
    events: data.events.filter((e) => e.sessionId === sessionId),
    worldFacts: data.worldFacts.filter((f) => f.sessionId === sessionId),
    characterMemories: data.characterMemories.filter((m) => m.sessionId === sessionId),
    worldEvents: data.worldEvents.filter((e) => e.sessionId === sessionId),
    worldTime: data.worldTime.find((t) => t.sessionId === sessionId) || null,
    relationships: data.relationships.filter((r) => r.sessionId === sessionId),
    relationshipHistory: data.relationshipHistory.filter((h) => h.sessionId === sessionId),
    clues: data.clues.filter((c) => c.sessionId === sessionId),
  };
}

export function clearSessionData(sessionId: string): void {
  const data = read();
  data.messages = data.messages.filter((m) => m.sessionId !== sessionId);
  data.events = data.events.filter((e) => e.sessionId !== sessionId);
  data.worldFacts = data.worldFacts.filter((f) => f.sessionId !== sessionId);
  data.characterMemories = data.characterMemories.filter((m) => m.sessionId !== sessionId);
  data.worldTime = data.worldTime.filter((w) => w.sessionId !== sessionId);
  data.relationships = data.relationships.filter((r) => r.sessionId !== sessionId);
  data.worldEvents = data.worldEvents.filter((e) => e.sessionId !== sessionId);
  data.relationshipHistory = data.relationshipHistory.filter((h) => h.sessionId !== sessionId);
  data.clues = data.clues.filter((c) => c.sessionId !== sessionId);
  write(data);
}

export function importSessionData(
  sessionId: string,
  worldId: string,
  sessionData: {
    messages?: Message[];
    events?: SessionEvent[];
    worldFacts?: WorldFact[];
    characterMemories?: CharacterMemory[];
    worldTime?: WorldTime;
    relationships?: Relationship[];
    worldEvents?: WorldEvent[];
    relationshipHistory?: RelationshipHistory[];
    clues?: Clue[];
  }
) {
  const data = read();

  const existingIdx = data.sessions.findIndex((s) => s.id === sessionId);
  if (existingIdx >= 0) {
    data.sessions[existingIdx].updatedAt = new Date().toISOString();
  } else {
    data.sessions.push({
      id: sessionId,
      worldId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  write(data);

  // Clear existing session data before importing to prevent duplicates
  clearSessionData(sessionId);
  const freshData = read();

  const remap = <T extends { sessionId: string }>(arr: T[]) =>
    arr.map((item) => ({ ...item, sessionId }));

  if (sessionData.messages) freshData.messages.push(...remap(sessionData.messages));
  if (sessionData.events) freshData.events.push(...remap(sessionData.events));
  if (sessionData.worldFacts) freshData.worldFacts.push(...remap(sessionData.worldFacts));
  if (sessionData.characterMemories) freshData.characterMemories.push(...remap(sessionData.characterMemories));
  if (sessionData.worldTime) freshData.worldTime.push({ ...sessionData.worldTime, sessionId });
  if (sessionData.relationships) freshData.relationships.push(...remap(sessionData.relationships));
  if (sessionData.worldEvents) freshData.worldEvents.push(...remap(sessionData.worldEvents));
  if (sessionData.relationshipHistory) freshData.relationshipHistory.push(...remap(sessionData.relationshipHistory));
  if (sessionData.clues) freshData.clues.push(...remap(sessionData.clues));

  write(freshData);
}
