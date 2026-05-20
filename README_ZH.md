# Parallel — AI叙事世界引擎

> 一个会记忆、会演化、会推动剧情的 AI 剧本杀世界。

[English Docs](README.md)

Parallel 把玩家放进一个场景：角色会记住你、关系会变化、时间在流逝、世界会因你的行为而改变。这不是单角色聊天机器人，而是一个活的小世界——AI 总导演掌控剧情，角色有自己的意志，连真相本身都可以被改写。

## 当前版本

**v0.6 — 可扩展基础**

本版本聚焦基础设施和可扩展性：

- Docker 一键启动
- GitHub Actions CI（lint + build）
- 可扩展 Provider 注册表（OpenAI / Anthropic / OpenRouter / Ollama / Mock）
- 架构和 API 文档

产品能力：v0.5 功能完整（世界创建、多角色回合、AI 总导演、记忆、关系、事件、线索、调查动作）。v0.6 新增基础设施层。

默认模型：**mimo-v2.5**（OpenAI 兼容）。

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

双击 `start.bat` 或 `启动Parallel.bat`，然后打开 `http://localhost:3000`。

---

## 模型配置

Parallel 仅在完全没有配置 Provider 时才进入 Mock Mode。OpenAI 兼容 Provider（openai、ollama）不需要 API key——它们只是省略 Authorization 头。Anthropic 和 OpenRouter 需要 API key。

复制 `.env.local.example` 为 `.env.local`，配置一个 Provider：

```env
LLM_PROVIDER=openai

OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=mimo-v2.5

# 或使用其他 Provider：
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=openai/gpt-4o-mini

# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434/v1
# OLLAMA_MODEL=llama3
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
npm run lint      # TypeScript 类型检查
npm run build     # 生产构建
```

### 冒烟测试（启动开发服务器后）

```bash
curl http://localhost:3000/
curl http://localhost:3000/create
curl http://localhost:3000/api/world?action=list
curl http://localhost:3000/api/world?worldId=neon-harbor
```

---

## 演示世界

默认世界是 **Neon Harbor**，一个雨夜市场的赛博朋克悬疑故事。

- **Mira Voss**：谨慎的街头医生
- **Ren Kaito**：迷人的情报贩子
- **June**：逃跑的快递学徒

一个数据快递员失踪了。每个人都知道的比他们承认的多。

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
data/         世界 YAML 文件 + 运行时存储
lib/engine/   核心世界引擎（总导演、记忆、关系、事件）
lib/llm/      LLM Provider 层（注册表、OpenAI、Anthropic、Mock）
lib/extensions/ 扩展点接口
docs/         ARCHITECTURE.md、API.md
```

---

## 文档

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — 目录结构、请求链路、Provider 系统、扩展层
- **[docs/API.md](docs/API.md)** — API 端点参考
- **[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)** — 产品愿景和版本历史（中文）
- **[docs/PRODUCT_ROADMAP_EN.md](docs/PRODUCT_ROADMAP_EN.md)** — 产品路线图（英文）

---

## 已知限制

- 运行时数据存储在 `data/store.json`（非数据库）。
- 关系历史尚未单独存储。
- 多世界存档管理尚未实现。

---

## 许可证

MIT
