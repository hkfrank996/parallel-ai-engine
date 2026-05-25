export type Lang = "zh" | "en";

const t: Record<string, { zh: string; en: string }> = {
  // Loading / errors
  "loading.title": { zh: "Parallel", en: "Parallel" },
  "loading.subtitle": { zh: "正在进入世界...", en: "Entering the world..." },
  "loadError.title": { zh: "世界加载失败", en: "The world refused to load." },

  // Header
  "header.newWorld": { zh: "创建世界", en: "New World" },
  "header.switchWorld": { zh: "切换世界", en: "Switch World" },
  "header.reset": { zh: "清空记录", en: "Reset" },

  // Reset confirm modal
  "resetModal.title": { zh: "确认清空当前世界记录？", en: "Confirm clearing current world data?" },
  "resetModal.description": { zh: "这会清空当前世界的聊天记录、事件、线索、关系变化和时间进度，但不会删除世界设定，也不会影响其他世界。", en: "This will clear the current world's chat history, events, clues, relationship changes, and time progress. World settings and other worlds will not be affected." },
  "resetModal.cancel": { zh: "取消", en: "Cancel" },
  "resetModal.confirm": { zh: "确认清空", en: "Confirm" },
  "resetModal.clearing": { zh: "清空中...", en: "Clearing..." },
  "resetModal.error": { zh: "清空失败", en: "Failed to clear" },

  // Sidebar tabs
  "tab.world": { zh: "世界", en: "World" },
  "tab.timeline": { zh: "时间线", en: "Timeline" },

  // WorldSidebar
  "world.time": { zh: "世界时间", en: "World Time" },
  "world.day": { zh: "第{d}天", en: "Day {d}" },
  "world.turn": { zh: "回合 {n}", en: "Turn {n}" },
  "world.scene": { zh: "当前场景", en: "Current Scene" },
  "world.facts": { zh: "世界事实 ({n})", en: "Facts ({n})" },
  "world.characters": { zh: "角色", en: "Characters" },
  "world.events": { zh: "世界事件 ({n})", en: "World Events ({n})" },
  "world.memories": { zh: "记忆", en: "Memories" },
  "world.mockMode": { zh: "模拟模式 — 未配置 API Key", en: "Mock Mode — No API key configured" },

  // Timeline
  "timeline.title": { zh: "时间线", en: "Timeline" },
  "timeline.empty": { zh: "故事尚未开始。", en: "The story has not started yet." },

  // Messages
  "msg.empty": { zh: "说第一句话，开启这段故事...", en: "The story awaits your first words..." },
  "msg.emptySub": { zh: "对场景说话，角色会回应你。", en: "Speak to the scene, and the characters will respond." },
  "msg.narrator": { zh: "旁白", en: "Narrator" },

  // Composer
  "composer.placeholder": { zh: "对场景说话...", en: "Speak to the scene..." },
  "composer.sending": { zh: "角色正在说话...", en: "Characters are speaking..." },
  "composer.directing": { zh: "导演调度中...", en: "Directing scene..." },
  "composer.investigating": { zh: "探索环境中...", en: "Investigating..." },
  "composer.extracting": { zh: "整理线索中...", en: "Extracting details..." },
  "composer.send": { zh: "发送", en: "Send" },
  "composer.wait": { zh: "等待", en: "Wait" },

  // Player identity
  "player.title": { zh: "你是谁？", en: "Who are you?" },
  "player.placeholder": { zh: "输入你的名字...", en: "Enter your name..." },
  "player.enter": { zh: "进入世界", en: "Enter the World" },
  "player.hint": { zh: "角色会记住你的名字，用这个身份开始你的故事", en: "Characters will address you by name. Begin your story." },
  "player.greeting": { zh: "欢迎来到", en: "Welcome to" },

  // Investigation actions
  "action.look": { zh: "环顾四周", en: "Look Around" },
  "action.listen": { zh: "竖耳倾听", en: "Listen" },
  "action.think": { zh: "整理思路", en: "Think" },

  // Notices
  "notice.memories": { zh: "本轮记忆", en: "Memories" },
  "notice.fallback": { zh: "本轮使用了备用模型", en: "Fallback model used" },

  // Create page
  "create.title": { zh: "创建新世界", en: "Create New World" },
  "create.back": { zh: "← 返回", en: "← Back" },
  "create.save": { zh: "保存世界", en: "Save World" },
  "create.saving": { zh: "保存中...", en: "Saving..." },
  "create.created": { zh: "世界 \"{name}\" 创建成功！ID: {id}", en: "World \"{name}\" created! ID: {id}" },
  "create.failed": { zh: "创建失败", en: "Creation failed" },
  "create.templates": { zh: "快速模板", en: "Quick Templates" },
  "create.tplBlank": { zh: "空白", en: "Blank" },
  "create.tplModern": { zh: "现代悬疑", en: "Modern Mystery" },
  "create.tplScifi": { zh: "科幻阴谋", en: "Sci-Fi Conspiracy" },
  "create.tplFantasy": { zh: "暗黑奇幻", en: "Dark Fantasy" },
  "create.worldInfo": { zh: "世界信息", en: "World Info" },
  "create.worldName": { zh: "世界名称", en: "World Name" },
  "create.genre": { zh: "类型", en: "Genre" },
  "create.tagline": { zh: "一句话介绍", en: "Tagline" },
  "create.sceneName": { zh: "场景名称", en: "Scene Name" },
  "create.sceneDesc": { zh: "场景描述", en: "Scene Description" },
  "create.rules": { zh: "世界规则（每行一条）", en: "World Rules (one per line)" },
  "create.opening": { zh: "开场白", en: "Opening Narrative" },
  "create.chars": { zh: "角色（1-6 个）", en: "Characters (1-6)" },
  "create.addChar": { zh: "+ 添加角色", en: "+ Add Character" },
  "create.charN": { zh: "角色 {n}", en: "Character {n}" },
  "create.remove": { zh: "删除", en: "Remove" },
  "create.charName": { zh: "名字", en: "Name" },
  "create.charRole": { zh: "角色/职业", en: "Role" },
  "create.charId": { zh: "ID（自动）", en: "ID (auto)" },
  "create.charPersonality": { zh: "性格（逗号分隔）", en: "Personality (comma-separated)" },
  "create.charStyle": { zh: "说话风格", en: "Speaking Style" },
  "create.charGoals": { zh: "内心目标（每行一个）", en: "Goals (one per line)" },
  "create.charSecrets": { zh: "秘密（每行一个）", en: "Secrets (one per line)" },
  "create.charRelNotes": { zh: "对其他角色的看法（名字: 看法）", en: "Relationship Notes (name: note)" },
};

export function T(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = t[key];
  if (!entry) return key;
  let text = entry[lang] || entry.en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
