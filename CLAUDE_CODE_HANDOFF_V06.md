# Claude Code 接手说明（v0.6 交接稿）

## 1. 先说结论

你接手的是一个已经能跑、已经过一轮完整功能验证的项目，不是从 0 开始做 Demo。

当前状态：

- 项目根目录：`C:\Users\asd59\Desktop\AI世界引擎`
- 当前可访问地址：
  - `http://localhost:3000`
  - `http://192.168.1.12:3000`
  - `http://100.122.120.69:3000`
- 产品能力：已经到 `v0.5`
- 代码构建版本：`package.json` 里还是 `0.4.0`
- 当前默认文本模型：`mimo-v2.5`
- 当前真实可用能力：
  - 首页加载
  - 世界列表 / 世界切换
  - 世界创建
  - 创建校验（角色必须至少有一个 `name + role`）
  - 聊天回合
  - 世界导出 / 导入
  - LLM 连通测试

最近一次本地验证（2026-05-19）已经确认：

- `GET /` 200
- `GET /create` 200
- `GET /api/world?action=list` 200
- `GET /api/world?worldId=test-harbor` 200
- `POST /api/world/create`：
  - 非法角色返回 `400`，错误文案为 `Each character must have both a name and a role.`
  - 合法创建成功
- `POST /api/llm/test` 成功，返回模型是 `mimo-v2.5`
- `POST /api/chat` 成功，`degraded=false`
- `GET /api/world/export` 成功
- `POST /api/world/import` 成功

所以这次接手目标不是“修 bug 为主”，而是把项目从“v0.5 功能完成”推进到“v0.6 可扩展基础完成”。

---

## 2. 这次你要完成的总目标

把项目推进到一个可以对外说清楚、别人能快速跑起来、后续能继续扩模型和扩模块的状态。

具体说，就是一次性完成下面 4 件事：

1. 统一版本口径
2. 补齐 Docker 启动能力
3. 补齐基础 CI
4. 把当前硬编码的模型接入方式整理成可扩展的 provider/extension 基础层

这里必须特别强调：

- 既要支持通用 `OpenAI-compatible` API 格式
- 也要支持 `Anthropic / Claude` 原生 API 格式

注意：

- 本次目标是 `v0.6 基础设施与可扩展性`
- 不是做 `v1.0`
- 不是重写故事引擎
- 不是做 SQLite
- 不是做语音 / TTS
- 不是大改 UI 风格

---

## 3. 必须遵守的范围边界

### 必做

- 把代码版本号和文档版本口径理顺
- 新增 Docker 运行方式
- 新增 GitHub Actions CI
- 扩展模型 provider 架构，支持后续接更多模型来源
- 补齐必要文档

### 不要做

- 不要重写 `runTurn`、Director、Memory、Relationship、Event 等核心世界引擎逻辑
- 不要把 `data/store.json` 改成 SQLite
- 不要引入复杂数据库迁移
- 不要做“插件市场”或真正动态安装插件
- 不要做大规模 UI 重设计
- 不要改现有世界 YAML 格式
- 不要把默认模型从 `mimo-v2.5` 改掉

### 可以接受的小范围 UI 改动

只允许为支持新 provider 选项而修改设置面板：

- `components/SettingsModal.tsx`

除此之外不要顺手改其他界面视觉。

---

## 4. 当前代码里你需要知道的事实

### 4.1 当前 provider 架构现状

当前 provider 逻辑在：

- `lib/llm/provider.ts`
- `lib/llm/openaiProvider.ts`
- `lib/llm/anthropicProvider.ts`
- `lib/llm/mockProvider.ts`

现在实际只支持这 3 类：

- `mock`
- `openai`
- `anthropic`

而且：

- `SettingsModal` 只允许选 `openai` / `anthropic`
- OpenAI-compatible 其实已经可以接很多兼容接口，但在 UI 和文档里没有整理成明确能力

### 4.2 关于“模型接入”的正确理解

这次需求不是“品牌优先”，而是“协议优先”。

真正要支持的是两大类接入方式：

1. `OpenAI-compatible`
   - 典型输入：`base URL + model + 可选 apiKey`
   - 适用于：
     - OpenAI 官方兼容接口
     - 自建兼容网关
     - OpenRouter
     - 本地兼容服务
     - Ollama 的 OpenAI-compatible 入口

2. `Anthropic / Claude native`
   - 典型输入：`base URL + model + apiKey`
   - 使用 Anthropic 原生 API 请求格式

注意：

- `OpenRouter`、`Ollama` 不是这次需求的本质
- 它们只是用来证明“当前配置系统不能只假设 apiKey 永远必填”
- 真正要交付的是：
  - 通用 `OpenAI-compatible` 链路
  - `Claude` 原生链路

### 4.3 当前缺失的基础设施

下面这些现在都没有：

- `Dockerfile`
- `.dockerignore`
- `.github/workflows/*`

### 4.4 当前版本信息不一致

- `package.json` 还是 `0.4.0`
- 文档口径已经认为产品能力在 `v0.5`

所以如果你完成的是 `v0.6` 的基础设施建设：

- 不要把 `package.json` 直接升到 `1.0.0`
- 请把版本口径处理清楚

建议：

- 如果本次交付仅完成 `v0.6` 的“基础设施阶段”，可把代码版本升到 `0.5.1` 或 `0.6.0`
- 但必须在文档里解释清楚“代码语义版本”和“产品阶段版本”的关系

为了减少混乱，我更推荐：

- `package.json` 升到 `0.6.0`
- README 明确说明：`v0.6 foundation build`

前提是你确实把本说明里的必做项全部完成。

---

## 5. 具体任务拆解

## 任务 A：统一版本与文档口径

### 目标

让任何新接手的人一眼知道：

- 现在已经完成什么
- 当前默认模型是什么
- 当前阶段是 `v0.6`
- 怎么本地启动
- 怎么 Docker 启动
- 怎么跑基础验证

### 必改文件

- `package.json`
- `README.md`
- `PRODUCT_ROADMAP.md`
- `UI_REDESIGN_HANDOFF.md`

### 具体要求

1. `package.json` 的 `version` 必须更新
2. `README.md` 顶部版本说明必须同步
3. 文档里所有“当前默认模型”必须保持为 `mimo-v2.5`
4. 文档里如果提到 `gpt-5.5` 或 `mimo-v2.5-pro`，只能作为历史信息保留，不能再写成当前默认
5. README 必须新增以下内容：
   - Docker 启动说明
   - CI 简述
   - provider 支持矩阵
   - `.env.local` 配置示例
   - 本地验证命令

### 验收标准

- 新人只看 README 就能知道怎么跑起来
- 版本口径不再互相打架

---

## 任务 B：补齐 Docker 运行能力

### 目标

让别人不需要手动装一堆环境，也能在 10 分钟内把项目跑起来。

### 必做文件

- `Dockerfile`
- `.dockerignore`

### 推荐实现方式

使用 Next.js 标准 Node 运行方式即可，不要求极限优化。

建议原则：

- 基于 Node 20 或 Node 22
- 使用 `npm ci`
- 先 `npm run build`
- 再 `npm run start`
- 容器内默认监听 `3000`
- 不把 `.env.local` 和真实密钥打进镜像
- `data/` 目录必须允许通过 volume 挂载持久化

### 必须支持的用法

README 里必须给出可直接复制的命令，例如：

```bash
docker build -t parallel .
docker run --rm -p 3000:3000 --env-file .env.local -v ${PWD}/data:/app/data parallel
```

如果你考虑 Windows PowerShell 路径差异，也可以额外提供一条 Windows 版本。

### 额外要求

- 容器里无 API key 时仍应能以 Mock Mode 启动
- 容器启动后打开 `http://localhost:3000` 应能进入首页

### 验收标准

- `docker build` 成功
- `docker run` 成功
- 首页可打开
- `GET /api/world?action=list` 可返回世界列表

---

## 任务 C：补齐基础 CI

### 目标

让仓库至少具备最基础的自动检查，避免后续提交把构建搞坏。

### 必做文件

- `.github/workflows/ci.yml`

### CI 最低要求

在 `push` 和 `pull_request` 上运行：

1. `npm ci`
2. `npm run lint`
3. `npm run build`

### 推荐但非强制

- 使用 Node 20
- 开启 npm cache

### 不要做

- 不要把需要真实 API key 的聊天回归放进 CI
- 不要做网络依赖很重的 E2E

### 验收标准

- workflow 文件结构正确
- 本地逻辑与 CI 命令一致
- 不依赖私有密钥即可通过

---

## 任务 D：把模型接入层整理成可扩展架构

### 目标

不是“多加几个 if”，而是把现在的模型接入整理成一个可以继续扩的结构。

### 当前问题

现在 `lib/llm/provider.ts` 是硬编码分支：

- `openai`
- `anthropic`
- `mock`

这会导致后面每加一个 provider 都要继续堆条件分支。

### 你要做成什么样

做一个“注册表/目录式”的 provider 架构，让后续新增 provider 不需要继续在主逻辑里堆很多条件。

### 最低交付要求

保留现有能力，并新增清晰支持以下 provider 类型：

- `mock`
- `openai`
- `anthropic`
- `openrouter`
- `ollama`

### 具体要求

1. `openai`：
   - 继续表示“通用 OpenAI-compatible”
   - 仍支持自定义 base URL
   - 必须允许“只有 `base URL + model`、没有 `apiKey`”的场景通过到下游解析层
   - 不允许前端或 API 路由把“没有 `apiKey`”直接当成“不能配置 / 不能测试 / 不能聊天”

2. `anthropic`：
   - 保持现状可用
   - 必须明确表示这是 `Claude` 原生 API 格式
   - 不能被降级成“走 OpenAI-compatible 兼容模式凑合”

3. `openrouter`：
   - 作为一个明确 provider 类型存在
   - 默认 base URL 应为 `https://openrouter.ai/api/v1`
   - model 由用户填写

4. `ollama`：
   - 作为一个明确 provider 类型存在
   - 默认 base URL 应为 `http://localhost:11434/v1`
   - model 由用户填写
   - 走 OpenAI-compatible 调用方式即可，不要求另写全新协议层
   - 重点不是“必须单独优化 Ollama”，而是验证“无 key 的 OpenAI-compatible provider 也能打通”

5. `mock`：
   - 必须保留

### Settings UI 要求

修改：

- `components/SettingsModal.tsx`

把 provider 选项扩成至少：

- OpenAI-compatible
- OpenRouter
- Ollama
- Anthropic（Claude native）

要求：

- 选择 provider 后自动带默认 placeholder/base URL
- 兼容旧 localStorage 数据
- 不破坏现有保存 / 测试连接逻辑
- 必须允许用户配置：
  - OpenAI-compatible：`base URL + model + 可选 apiKey`
  - Claude native：`base URL + model + apiKey`

### 连接测试要求

这里要写得非常清楚：

1. `Claude / Anthropic` 原生链路：
   - `apiKey` 依然必填
   - 走 Anthropic 原生 API 测试逻辑

2. `OpenAI-compatible` 链路：
   - 不能再把 `apiKey` 写死为前置必填
   - 是否真的需要 key，由 provider 能力决定
   - 至少要允许像本地兼容服务这类“无 key”场景进入测试逻辑

3. `/api/chat` 发送逻辑：
   - 不能因为没有 `apiKey` 就不传 `llmConfig`
   - 只要用户明确配置了 provider / `base URL` / model，就应该把配置送到后端解析

### API 层要求

涉及文件：

- `app/api/llm/test/route.ts`
- `app/api/chat/route.ts`
- `app/api/world/route.ts`
- `lib/llm/provider.ts`

要求：

- 不改变现有请求结构的大方向
- 现有 `llmConfig` 结构尽量向后兼容
- 保证没有任何配置时仍然走 Mock Mode
- 但“无 key”不能再自动等于 “Mock Mode”
- 必须区分：
  - 用户完全没配置任何 provider
  - 用户明确配置了一个无需 key 或 key 可选的 OpenAI-compatible provider

### 你应该新增的抽象

至少整理出一层类似下面的结构，命名可调整，但职责要明确：

- `lib/llm/catalog.ts` 或 `registry.ts`
  - 定义 provider 元信息
  - 包含默认 URL、显示名、是否需要 API key、是否走 OpenAI-compatible

- `lib/llm/provider.ts`
  - 负责根据配置解析出实际 provider

- `lib/llm/types.ts`
  - 放清晰的 provider 类型定义

### 验收标准

- 旧的 OpenAI-compatible 配置继续可用
- Anthropic / Claude 原生链路继续可用
- OpenRouter / Ollama 至少在配置层和路由层可用
- 无 key 的 OpenAI-compatible provider 不能被前端和测试接口提前拦死
- Mock Mode 不被破坏
- `SettingsModal` 能正确保存和恢复新 provider 类型

---

## 任务 E：做一个“轻量扩展接口层”，但不要做成大工程

### 目标

`v0.6` 需要“可扩展”，但这里的意思不是做动态插件安装系统，而是先把未来要扩展的点抽象出来。

### 你要做的不是

- 不是 npm 插件系统
- 不是运行时自动加载第三方脚本
- 不是插件 marketplace

### 你要做的是

提供一层清晰的 TypeScript 接口，为后续扩展预留边界。

### 建议新增目录

- `lib/extensions/types.ts`
- `lib/extensions/registry.ts`

### 至少定义 4 类扩展点

1. `ModelProviderAdapter`
2. `MemoryProvider`
3. `EventGenerator`
4. `WorldTemplateProvider`

### 要求

- 先给接口和默认实现映射
- 当前项目内部逻辑仍可继续使用现有实现
- 不要求真的支持第三方热插拔
- 重点是把“未来从哪里扩”定义清楚

### 验收标准

- 代码里已经有明确边界
- 文档里能说清楚扩展点分别干什么
- 不引入新的复杂运行时风险

---

## 任务 F：补齐最少但够用的工程文档

### 目标

让后续开发者不需要读完整个代码库，也能理解项目结构。

### 必做文档

至少新增下面两个文档：

- `docs/ARCHITECTURE.md`
- `docs/API.md`

### `docs/ARCHITECTURE.md` 必须包含

- 顶层目录结构说明
- 请求主链路：
  - Page
  - API route
  - provider
  - engine
  - storage
- 世界数据来源：
  - `data/worlds/*.yaml`
  - `data/store.json`
- Mock Mode / Real provider 模式说明
- 新的 provider registry / extension layer 说明

### `docs/API.md` 必须包含

- `GET /api/world`
- `GET /api/world?action=list`
- `POST /api/world/create`
- `GET /api/world/export`
- `POST /api/world/import`
- `POST /api/llm/test`
- `POST /api/chat`

每个接口至少写：

- 用途
- 请求字段
- 返回字段
- 常见错误

---

## 6. 明确不要碰的东西

下面这些不是本次交付目标，请不要顺手展开：

- SQLite 重构
- 完整测试框架重建
- 长对话性能重构
- 角色逻辑重写
- 世界状态存储格式迁移
- 多用户系统
- 权限系统
- 云部署平台脚本
- TTS / Voice / Omni

如果你觉得其中某项“顺手做更好”，请不要做。先把本次范围收紧。

---

## 7. 你实际要改到哪些文件

### 高概率会修改

- `package.json`
- `README.md`
- `PRODUCT_ROADMAP.md`
- `UI_REDESIGN_HANDOFF.md`
- `components/SettingsModal.tsx`
- `lib/llm/provider.ts`
- `lib/llm/types.ts`
- `app/api/llm/test/route.ts`
- `app/api/chat/route.ts`

### 高概率会新增

- `Dockerfile`
- `.dockerignore`
- `.github/workflows/ci.yml`
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `lib/llm/catalog.ts` 或同类注册表文件
- `lib/extensions/types.ts`
- `lib/extensions/registry.ts`

---

## 8. 最终必须交付什么

你交付结束时，仓库里必须至少有：

1. 可工作的 Docker 启动方式
2. 可工作的基础 CI
3. 更清晰的 provider 架构
4. Settings 里新增 provider 选项
5. OpenAI-compatible 与 Claude native 两条链路都被清楚支持
6. 统一后的版本口径
7. 能读懂项目的基础文档

如果这些里有任何一项没完成，就不要宣称 “v0.6 完成”。

---

## 9. 你完成后必须自己验证

至少跑这些：

```bash
npm run lint
npm run build
```

如果你本地启动 dev server，再补跑这些 smoke：

```bash
GET  /
GET  /create
GET  /api/world?action=list
GET  /api/world?worldId=test-harbor
POST /api/world/create   (非法角色应返回 400)
POST /api/world/create   (合法创建应成功)
```

如果你完成了 Docker，还必须额外验证：

1. `docker build` 成功
2. `docker run` 成功
3. 容器启动后打开首页成功
4. `GET /api/world?action=list` 成功

---

## 10. 交付时你的输出格式

请按下面格式汇报，不要只说“做完了”：

1. 改了哪些文件
2. 每个改动解决什么问题
3. 哪些属于 v0.6 必做项，哪些只是顺手优化
4. 跑了哪些验证命令，结果是什么
5. 还有哪些已知没做，为什么没做

---

## 11. 一句最短任务描述（可以直接贴给 Claude Code）

在不重写现有故事引擎的前提下，把 `Parallel` 从“v0.5 功能完成但基础设施薄弱”的状态推进到“v0.6 可扩展基础完成”：统一版本口径，新增 Docker 和 GitHub Actions CI，把模型接入改成可扩展的 provider registry，明确同时支持通用 `OpenAI-compatible` 和 `Claude / Anthropic` 原生 API 两条链路，并在此基础上支持 `openai / anthropic / openrouter / ollama / mock`，扩展 SettingsModal 对应配置，并补齐 Architecture/API 文档。
