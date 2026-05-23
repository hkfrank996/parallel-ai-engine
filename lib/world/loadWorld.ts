import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { worldSchema, World } from "./types";

const WORLDS_DIR = path.join(process.cwd(), "data", "worlds");

export function normalizeWorldId(worldId: string): string {
  return worldId
    .trim()
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function assertSafeWorldId(worldId: string): string {
  const normalized = normalizeWorldId(worldId);
  if (!normalized || normalized !== worldId) {
    throw new Error(`Invalid world id: ${worldId}`);
  }
  return normalized;
}

export function loadWorld(worldId: string): World {
  const safeWorldId = assertSafeWorldId(worldId);
  const filePath = path.join(WORLDS_DIR, `${safeWorldId}.yaml`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`World not found: ${safeWorldId}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw, { schema: yaml.CORE_SCHEMA });
  return worldSchema.parse(parsed);
}

export function loadDefaultWorld(): World {
  return loadWorld("neon-harbor");
}

export function listWorlds(): { id: string; name: string; genre: string; tagline: string }[] {
  if (!fs.existsSync(WORLDS_DIR)) return [];
  const files = fs.readdirSync(WORLDS_DIR).filter((f) => f.endsWith(".yaml"));
  return files.map((f) => {
    try {
      const raw = fs.readFileSync(path.join(WORLDS_DIR, f), "utf-8");
      const parsed = yaml.load(raw, { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>;
      return {
        id: (parsed.id as string) || f.replace(".yaml", ""),
        name: (parsed.name as string) || f,
        genre: (parsed.genre as string) || "",
        tagline: (parsed.tagline as string) || "",
      };
    } catch {
      return { id: f.replace(".yaml", ""), name: f, genre: "", tagline: "" };
    }
  });
}

export function saveWorld(world: World): void {
  if (!fs.existsSync(WORLDS_DIR)) {
    fs.mkdirSync(WORLDS_DIR, { recursive: true });
  }
  const safeWorldId = assertSafeWorldId(world.id);
  const filePath = path.join(WORLDS_DIR, `${safeWorldId}.yaml`);
  const content = yaml.dump(world, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(filePath, content, "utf-8");
}
