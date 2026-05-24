"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { T, type Lang } from "@/lib/i18n";
import { useUiTheme } from "@/lib/ui/theme";
import { safeGetItem } from "@/lib/ui/safeStorage";

interface CharacterForm {
  id: string; name: string; role: string; personality: string; goals: string; speaking_style: string; relationship_notes: string; secrets: string;
}

const emptyCharacter: CharacterForm = { id: "", name: "", role: "", personality: "", goals: "", speaking_style: "", relationship_notes: "", secrets: "" };

const TEMPLATES = {
  blank: { genre: "", rules: "", opening: "" },
  "modern-mystery": { genre: "modern mystery", rules: "Everyone has a motive.\nThe police are not your friends.\nNothing is what it seems.", opening: "A dinner party ends in tragedy. The host is found dead in the study. Everyone was in the house. No one has an alibi." },
  "sci-fi-conspiracy": { genre: "science fiction conspiracy", rules: "The station AI is always listening.\nTrust no one with a neural implant.\nAir is the most valuable currency.", opening: "Alarms blare through the space station. The captain is missing. The air recyclers are failing. Three crew members know more than they say." },
  "fantasy-adventure": { genre: "dark fantasy", rules: "Magic has a cost — always.\nThe old gods are watching.\nBetrayal is a tradition in this kingdom.", opening: "The ancient castle trembles. The king's advisor has been found dead in the tower. Three suspects stand before the court. The prophecy demands justice before dawn." },
};

export default function CreateWorldPage() {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [genre, setGenre] = useState("");
  const [sceneName, setSceneName] = useState("");
  const [sceneDesc, setSceneDesc] = useState("");
  const [rules, setRules] = useState("");
  const [opening, setOpening] = useState("");
  const [characters, setCharacters] = useState<CharacterForm[]>([{ ...emptyCharacter }]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { uiTheme, setUiTheme, themeReady } = useUiTheme();
  const [language, setLanguage] = useState<Lang>("zh");
  const lang: Lang = language;
  const L = (key: string, vars?: Record<string, string | number>) => T(key, lang, vars);
  const hasValidCharacter = characters.some((c) => c.name.trim() && c.role.trim());
  const canSave = !!name.trim() && hasValidCharacter && !saving;

  useEffect(() => {
    setLanguage(safeGetItem("parallel-language") === "en" ? "en" : "zh");
  }, []);

  const addCharacter = () => { if (characters.length < 6) setCharacters([...characters, { ...emptyCharacter }]); };
  const removeCharacter = (index: number) => { if (characters.length > 1) setCharacters(characters.filter((_, i) => i !== index)); };

  const updateCharacter = (index: number, field: keyof CharacterForm, value: string) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "name" && !updated[index].id) updated[index].id = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    setCharacters(updated);
  };

  const applyTemplate = (template: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[template];
    setGenre(t.genre); setRules(t.rules); setOpening(t.opening);
    if (template === "blank") { setName(""); setTagline(""); setSceneName(""); setSceneDesc(""); setCharacters([{ ...emptyCharacter }]); }
  };

  const toggleTheme = () => {
    setUiTheme(uiTheme === "night" ? "day" : "night");
  };

  const handleSave = async () => {
    if (!name.trim() || !hasValidCharacter) {
      setResult({
        success: false,
        message: lang === "zh" ? "至少填写一个角色的名字和职业再保存。" : "Fill at least one character name and role before saving.",
      });
      return;
    }
    setSaving(true); setResult(null);
    const world = {
      id: id || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"), name, tagline, genre,
      rules: rules.split("\n").map((r) => r.trim()).filter(Boolean),
      opening,
      scene: { id: sceneName.toLowerCase().replace(/\s+/g, "-") || "main-scene", name: sceneName, description: sceneDesc },
      characters: characters.map((c) => {
        const notes: Record<string, string> = {};
        c.relationship_notes.split("\n").filter(Boolean).forEach((line) => { const [target, note] = line.split(":").map((s) => s.trim()); if (target && note) notes[target.toLowerCase().replace(/\s+/g, "-")] = note; });
        return { id: c.id || c.name.toLowerCase().replace(/[^a-z0-9]/g, "-"), name: c.name, role: c.role, personality: c.personality.split(",").map((p) => p.trim()).filter(Boolean), goals: c.goals.split("\n").map((g) => g.trim()).filter(Boolean), speaking_style: c.speaking_style, relationship_notes: notes, secrets: c.secrets.split("\n").map((s) => s.trim()).filter(Boolean) };
      }),
    };
    try {
      const res = await fetch("/api/world/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(world) });
      const data = await res.json();
      setResult(res.ok ? { success: true, message: L("create.created", { name: world.name, id: data.worldId }) } : { success: false, message: data.error || L("create.failed") });
    } catch (e) { setResult({ success: false, message: String(e) }); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-void text-prose scene-gradient">
      <header className="app-header border-b border-edge bg-abyss/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-prose-muted hover:text-amber-glow transition text-sm">{L("create.back")}</Link>
            <h1 className="text-lg font-serif font-bold text-amber-glow">{L("create.title")}</h1>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={toggleTheme}
              suppressHydrationWarning
              className="create-toggle rounded-lg border px-3 py-2 text-xs font-medium transition"
              title={themeReady ? (uiTheme === "night" ? "Switch to day mode" : "Switch to night mode") : "Toggle theme"}
            >
              {uiTheme === "night" ? (lang === "zh" ? "白天" : "Day") : (lang === "zh" ? "夜间" : "Night")}
            </button>
            <button onClick={handleSave} disabled={!canSave} className="create-primary rounded-lg px-5 py-2 text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed">
              {saving ? L("create.saving") : L("create.save")}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-8 sm:px-6 sm:py-8">
        {result && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${result.success ? "bg-emerald-950/30 border-emerald-800/30 text-emerald-300" : "bg-crimson/10 border-crimson/30 text-crimson-bright"}`}>{result.message}</div>
        )}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-amber-dim mb-3">{L("create.templates")}</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((t) => (
              <button key={t} onClick={() => applyTemplate(t)} className="create-secondary rounded-lg border px-4 py-2 text-xs transition">
                {t === "blank" ? L("create.tplBlank") : t === "modern-mystery" ? L("create.tplModern") : t === "sci-fi-conspiracy" ? L("create.tplScifi") : L("create.tplFantasy")}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-amber-dim">{L("create.worldInfo")}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={L("create.worldName")} value={name} onChange={setName} placeholder="e.g. Neon Harbor" />
            <Field label={L("create.genre")} value={genre} onChange={setGenre} placeholder="e.g. cyberpunk mystery" />
          </div>
          <Field label={L("create.tagline")} value={tagline} onChange={setTagline} placeholder="What's the core conflict?" />
          <Field label={L("create.sceneName")} value={sceneName} onChange={setSceneName} placeholder="e.g. Rain Market" />
          <Field label={L("create.sceneDesc")} value={sceneDesc} onChange={setSceneDesc} multiline placeholder="What does it look like?" />
          <Field label={L("create.rules")} value={rules} onChange={setRules} multiline placeholder="One rule per line" />
          <Field label={L("create.opening")} value={opening} onChange={setOpening} multiline placeholder="The scene opens with..." />
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-amber-dim">{L("create.chars")}</h2>
            <button onClick={addCharacter} disabled={characters.length >= 6} className="create-secondary rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-30">{L("create.addChar")}</button>
          </div>
          {characters.map((char, i) => (
            <div key={i} className="case-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-dim">{L("create.charN", { n: i + 1 })}</span>
                {characters.length > 1 && <button onClick={() => removeCharacter(i)} className="text-xs text-crimson/50 hover:text-crimson-bright transition">{L("create.remove")}</button>}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label={L("create.charName")} value={char.name} onChange={(v) => updateCharacter(i, "name", v)} placeholder="Mira Voss" />
                <Field label={L("create.charRole")} value={char.role} onChange={(v) => updateCharacter(i, "role", v)} placeholder="Street doctor" />
                <Field label={L("create.charId")} value={char.id} onChange={(v) => updateCharacter(i, "id", v)} placeholder="mira" />
              </div>
              <Field label={L("create.charPersonality")} value={char.personality} onChange={(v) => updateCharacter(i, "personality", v)} placeholder="guarded, compassionate" />
              <Field label={L("create.charStyle")} value={char.speaking_style} onChange={(v) => updateCharacter(i, "speaking_style", v)} placeholder="Short, dry, restrained." />
              <Field label={L("create.charGoals")} value={char.goals} onChange={(v) => updateCharacter(i, "goals", v)} multiline placeholder="One goal per line" />
              <Field label={L("create.charSecrets")} value={char.secrets} onChange={(v) => updateCharacter(i, "secrets", v)} multiline placeholder="One secret per line" />
              <Field label={L("create.charRelNotes")} value={char.relationship_notes} onChange={(v) => updateCharacter(i, "relationship_notes", v)} multiline placeholder="name: note" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const cls = "create-field w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition";
  return (
    <div>
      <label className="block text-[10px] text-prose-muted mb-1 uppercase tracking-wider">{label}</label>
      {multiline ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} /> : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
    </div>
  );
}
