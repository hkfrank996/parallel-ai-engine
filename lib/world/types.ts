import { z } from "zod";

const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  personality: z.array(z.string()),
  goals: z.array(z.string()),
  speaking_style: z.string(),
  relationship_notes: z.record(z.string(), z.string()),
  initial_relationships: z.record(z.string(), z.object({
    trust: z.number().min(0).max(100),
    hostility: z.number().min(0).max(100),
    dependency: z.number().min(0).max(100),
  })).optional(),
});

const sceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const worldSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  genre: z.string(),
  rules: z.array(z.string()),
  opening: z.string(),
  scene: sceneSchema,
  characters: z.array(characterSchema).min(1),
});

export type World = z.infer<typeof worldSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Scene = z.infer<typeof sceneSchema>;
