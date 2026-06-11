# Parallel — AI叙事世界引擎

> 一个会记忆、会演化、会推动剧情的 AI 剧本杀世界。

[English Docs](README.md)

Parallel 把玩家放进一个场景：角色会记住你、关系会变化、时间在流逝、世界会因你的行为而改变。这不是单角色聊天机器人，而是一个活的小世界——AI 总导演掌控剧情，角色有自己的意志，连真相本身都可以被改写。

## 当前状态

**v1.0.0 已准备发布（2026-05-24）**

- Phase 1（稳定层）：SSRF 防护、错误脱敏、测试套件 ✅
- Phase 2（展示世界）：9 个演示世界覆盖 4 种类型 ✅
- Phase 3（发布文档）：README、docs/、package 审查 ✅
- Phase 4（发布前 QA）：安全审查、浏览器 smoke、CI 绿 ✅
- v1.0 收口：版本号、CHANGELOG、release notes 已准备 ✅

---

## 流式响应（Streaming）

`POST /api/chat` 支持可选的流式响应。请求体中设置 `stream: true`，响应将以 **NDJSON**（`application/x-ndjson`）格式逐行返回事件：

- **narration_done** — 旁白文本最先到达，早于角色对话
- **character_delta** — Anthropic 兼容 provider（包括 MiniMax）支持逐 token 流式输出；其他 provider 返回完整角色消息
- **character_reset** — 流式中途失败时发出，前端应清除该角色已累积的文本
- **done** — 全部 store 写入完成后，返回完整 `TurnResult`

**流式改善的是什么：** 首次文本时间从约 18 秒降到约 7 秒（用户更快看到内容）。

**流式不改善的是什么：** 总耗时不会减少，甚至可能略增（streaming 本身有开销）。流式是体验优化，不是速度优化。

逐 token 流式目前仅支持 **Anthropic 兼容 provider**。其他 provider（OpenAI、Ollama、Mock）退化为阶段流式（旁白 → 完整角色消息）。

详见 [docs/API.md](docs/API.md)。

---

## 快速开始

### 环境要求

- Node.js 20+
- npm

### 本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

### Docker

```bash
docker build -t parallel .
docker run --rm -p 3000:3000 --env-file .env.local -v ${PWD}/data:/app/data parallel
```

Windows PowerShell：

```powershell
docker run --rm -p 3000:3000 --env-file .env.local -v "${PWD}/data:/app/data" parallel
```

如果没有配置 Provider，容器会以 Mock Mode 运行。如果配置了 OpenAI 兼容 Provider 但 key 为空，会发送不含 Authorization 头的请求（不是 Mock Mode）。

### Windows（无终端）

双击 `start.bat`，然后打开 `http://localhost:3000`。

---

## 模型配置

Parallel 仅在完全没有配置 Provider 时才进入 Mock Mode。OpenAI 兼容 Provider（openai、ollama）不需要 API key——它们只是省略 Authorization 头。Anthropic 和 OpenRouter 需要 API key。

复制 `.env.local.example` 为 `.env.local`，配置一个 Provider：

```env
# OpenAI（官方）
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# OpenRouter
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=your_openrouter_api_key_here
# OPENROUTER_MODEL=openai/gpt-4o-mini

# Ollama（本地，不需要 key）
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434/v1
# OLLAMA_MODEL=llama3

# 自定义 OpenAI 兼容端点（如自建或第三方）
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_custom_api_key_here
# OPENAI_BASE_URL=https://your-custom-endpoint.example.com/v1
# OPENAI_MODEL=your-model-name
```

### Provider 支持矩阵

| Provider | 协议 | 配置项 | 需要 API Key |
|----------|------|--------|-------------|
| **OpenAI 兼容** | `/v1/chat/completions` | `OPENAI_API_KEY` | 否（空 = 无 auth 头） |
| **Anthropic** | `/v1/messages` | `ANTHROPIC_API_KEY` | **是** |
| **OpenRouter** | `/v1/chat/completions` | `OPENROUTER_API_KEY` | **是** |
| **Ollama** | `/v1/chat/completions` | — | 否 |
| **Mock Mode** | — | — | 否（仅在无 Provider 配置时） |

应用内设置弹窗也支持 Provider 选择和连接测试。

---

## 验证

```bash
npm run test     # 47 个 vitest 测试（SSRF、错误脱敏、导入安全）
npm run lint     # TypeScript 类型检查
npm run build    # 生产构建
```

---

## 展示世界

9 个演示世界覆盖 4 种类型——打开应用直接体验：

| 世界 | 类型 | 一句话介绍 |
|------|------|-----------|
| **Neon Harbor** | 赛博朋克悬疑 | 雨夜市场，失踪的快递员，三个各怀秘密的人 |
| **Crimson Keep** | 暗黑奇幻 | 死去的顾问，预言，黎明前必须找到叛徒 |
| **Orbital Station Sigma** | 科幻阴谋 | 空气告急，船长已死，空间站 AI 时刻在听 |
| **Shadow Realm** | 暗黑奇幻 | 濒死的水晶，三个法师，逼近的暗影 |
| **Jade Sect Summons** | 仙侠暗黑奇幻 | 三个修士应召而来，玉山之下禁制将破 |
| **Hollow Creek** | 现代悬疑 | 小镇溪水泛红，没人报警，没人离开 |
| **Last Light Station** | 科幻生存 | 深空中继站，氧气将尽，通讯里传来不该出现的声音 |
| **Glass Tower** | 赛博朋克悬疑 | CEO 失踪，每层楼都有秘密，封锁已启动 |
| **Vermillion Manor** | 暗黑奇幻悬疑 | 死去的族长，上锁的房间，三个有动机的继承人 |

每个世界：3 个角色，各有独特性格、关系网、秘密和目标。

---

## 核心功能

- YAML 世界定义
- 多角色回合引擎
- AI 总导演 / 秀场导演
- 角色级记忆检索
- 世界事实和角色记忆
- 关系值：信任、敌意、依赖
- 世界时间推进
- 动态事件生成
- 情感状态注入
- 时间线面板
- 等待动作（让世界在你不说话时继续运转）
- 回退警告（当回合使用备用 Provider 或 Mock 时）

---

## 项目结构

完整目录结构、请求链路和 Provider 系统见 `docs/ARCHITECTURE.md`。

```text
app/          Next.js 页面和 API 路由
components/   React UI 组件
data/worlds/  世界 YAML 定义（9 个展示世界）
lib/engine/   核心世界引擎（总导演、记忆、关系、事件）
lib/llm/      LLM Provider 层（注册表、SSRF 防护、错误脱敏）
lib/extensions/ 扩展点接口
docs/         ARCHITECTURE、API、CONFIG、WORLD_FORMAT、ROADMAP
```

---

## 导入 / 导出

导出世界及其会话数据：

```bash
curl "http://localhost:3000/api/world/export?worldId=neon-harbor"
# 返回：{ worldId, yaml, sessionData }
```

从 YAML 导入世界：

```bash
curl -X POST http://localhost:3000/api/world/import \
  -H "Content-Type: application/json" \
  -d '{"yaml": "id: my-world\nname: My World\n..."}'
```

限制：YAML 最大 500 KB，会话条目最大 10,000。导入先校验再写盘——失败不留脏文件。

## 安全

- `.env.local` — 已 gitignore，绝不提交 API key
- `data/store.json` — 已 gitignore，运行时会话数据
- `CODEX_HANDOFF.md` — 已 gitignore，私有交接文件
- SSRF 防护拦截私有 IP、云元数据、localhost
- 错误消息已脱敏（URL 和 API key 被剥离）
- YAML 解析使用 `CORE_SCHEMA`（不执行代码）

## 文档

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — 目录结构、请求链路、Provider 系统、扩展层
- **[docs/API.md](docs/API.md)** — API 端点参考
- **[docs/CONFIG.md](docs/CONFIG.md)** — LLM Provider 配置指南
- **[docs/WORLD_FORMAT.md](docs/WORLD_FORMAT.md)** — 世界 YAML schema、字段说明、常见坑
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — Product roadmap (English)
- **[docs/ROADMAP_ZH.md](docs/ROADMAP_ZH.md)** — 产品路线图（中文）
- **[docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)** — Phase 4 + v1.0 发布清单

---

## 已知限制

- 运行时数据存储在 `data/store.json`（非数据库）。
- 多世界存档管理尚未实现。

---

## 许可证

MIT
