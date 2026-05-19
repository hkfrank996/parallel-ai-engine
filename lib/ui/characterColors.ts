export interface CharacterColors {
  accent: string;
  avatar: string;
  bg: string;
  border: string;
  glow: string;
}

const CURATED_COLORS: Record<string, CharacterColors> = {
  mira: {
    accent: "#34d399",
    avatar: "#065f46",
    bg: "rgba(6,95,70,0.12)",
    border: "rgba(52,211,153,0.35)",
    glow: "rgba(52,211,153,0.25)",
  },
  ren: {
    accent: "#a78bfa",
    avatar: "#4c1d95",
    bg: "rgba(76,29,149,0.12)",
    border: "rgba(167,139,250,0.35)",
    glow: "rgba(167,139,250,0.25)",
  },
  june: {
    accent: "#fbbf24",
    avatar: "#78350f",
    bg: "rgba(120,53,15,0.12)",
    border: "rgba(251,191,36,0.35)",
    glow: "rgba(251,191,36,0.25)",
  },
  seraphina: {
    accent: "#c084fc",
    avatar: "#581c87",
    bg: "rgba(88,28,135,0.12)",
    border: "rgba(192,132,252,0.35)",
    glow: "rgba(192,132,252,0.25)",
  },
  gareth: {
    accent: "#f87171",
    avatar: "#7f1d1d",
    bg: "rgba(127,29,29,0.12)",
    border: "rgba(248,113,113,0.35)",
    glow: "rgba(248,113,113,0.25)",
  },
  elara: {
    accent: "#38bdf8",
    avatar: "#0c4a6e",
    bg: "rgba(12,74,110,0.12)",
    border: "rgba(56,189,248,0.35)",
    glow: "rgba(56,189,248,0.25)",
  },
  kuroda: {
    accent: "#94a3b8",
    avatar: "#334155",
    bg: "rgba(51,65,85,0.12)",
    border: "rgba(148,163,184,0.35)",
    glow: "rgba(148,163,184,0.22)",
  },
  yuki: {
    accent: "#f472b6",
    avatar: "#831843",
    bg: "rgba(131,24,67,0.12)",
    border: "rgba(244,114,182,0.35)",
    glow: "rgba(244,114,182,0.25)",
  },
  takeshi: {
    accent: "#fb923c",
    avatar: "#7c2d12",
    bg: "rgba(124,45,18,0.12)",
    border: "rgba(251,146,60,0.35)",
    glow: "rgba(251,146,60,0.25)",
  },
  dr_wei: {
    accent: "#22d3ee",
    avatar: "#164e63",
    bg: "rgba(22,78,99,0.12)",
    border: "rgba(34,211,238,0.35)",
    glow: "rgba(34,211,238,0.25)",
  },
  kovac: {
    accent: "#fb7185",
    avatar: "#881337",
    bg: "rgba(136,19,55,0.12)",
    border: "rgba(251,113,133,0.35)",
    glow: "rgba(251,113,133,0.25)",
  },
  nova: {
    accent: "#818cf8",
    avatar: "#312e81",
    bg: "rgba(49,46,129,0.12)",
    border: "rgba(129,140,248,0.35)",
    glow: "rgba(129,140,248,0.25)",
  },
};

const HASH_PALETTE = [
  { h: 156, s: 67, l: 52 },
  { h: 187, s: 72, l: 55 },
  { h: 212, s: 76, l: 61 },
  { h: 244, s: 72, l: 67 },
  { h: 268, s: 70, l: 67 },
  { h: 292, s: 66, l: 64 },
  { h: 326, s: 73, l: 65 },
  { h: 349, s: 75, l: 66 },
  { h: 22, s: 82, l: 61 },
  { h: 42, s: 84, l: 58 },
  { h: 83, s: 61, l: 55 },
  { h: 132, s: 58, l: 56 },
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fromHash(seed: string): CharacterColors {
  const color = HASH_PALETTE[hashString(seed) % HASH_PALETTE.length];
  return {
    accent: `hsl(${color.h} ${color.s}% ${color.l}%)`,
    avatar: `hsl(${color.h} ${Math.max(36, color.s - 24)}% 24%)`,
    bg: `hsl(${color.h} ${Math.max(32, color.s - 20)}% 16% / 0.16)`,
    border: `hsl(${color.h} ${color.s}% ${color.l}% / 0.38)`,
    glow: `hsl(${color.h} ${color.s}% ${color.l}% / 0.26)`,
  };
}

export function getCharacterColors(characterId?: string | null, characterName?: string | null): CharacterColors {
  const normalizedId = characterId?.trim().toLowerCase();
  if (normalizedId && CURATED_COLORS[normalizedId]) {
    return CURATED_COLORS[normalizedId];
  }

  const seed = normalizedId || characterName?.trim().toLowerCase() || "parallel-character";
  return fromHash(seed);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
