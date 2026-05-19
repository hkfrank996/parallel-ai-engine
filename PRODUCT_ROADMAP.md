# Parallel — AI 世界引擎

> **一句话定义：** 你走进一个 AI 构建的世界，里面每个人都有自己的意志。你探索、对话、发现——而这个世界会根据你的一举一动，实时改变走向。
>
> 这不是固定剧本的游戏。这是**一个活的世界**。
>
> **支持任何类型的世界**：赛博朋克悬疑、暗黑奇幻、科幻阴谋、现代都市……你创建什么，Parallel 就运行什么。

## 核心概念：活的 AI 世界引擎

传统互动叙事 = 固定剧本 + 固定角色 + 固定真相。玩家只是"读剧本"。

Parallel = **AI 总导演** + **动态角色** + **可变真相**。玩家的每一个行为都在影响世界走向：

- 你问了谁，谁就会紧张——下一次他们的台词会不同
- 你揭穿了一个秘密，其他角色会根据这个事实调整自己的策略
- 你忽略了一条线索，总导演可能把它交给另一个角色来"引爆"
- 甚至连**主线本身**都可以变——如果你把故事推向了作者都没想过的方向

**AI 总导演的角色：**

总导演不是简单地"选谁说话"。它是这个世界的造物主：

1. **有主线，但不死守主线** — 总导演心里有一条主剧情，但随时准备放弃它
2. **制造张力** — 当剧情太顺，总导演会制造意外；当剧情太乱，总导演会收敛
3. **角色有自己的意志** — 总导演让角色按照自己的利益行动，而不是按照"剧本需要"
4. **世界自己运转** — 即使用户什么都不做，世界也在发生变化

## 产品愿景

```
玩家不是在"玩一个游戏"，
而是在"进入一个世界"——
这个世界会记住他、回应他、甚至因为他的存在而变得不同。
```

## 发展原则

1. **活的 > 固定的**：每个功能的第一问是"这能让世界更活吗？"
2. **玩家行为驱动世界**：不是脚本驱动，是玩家的一举一动驱动
3. **总导演是灵魂**：AI 总导演的质量决定整个产品的质量
4. **先能玩，再能变，再能造**：闭环优先于复杂度
5. **每个版本都能展示**：截图、录屏、demo —— 别人要能看到"这个世界活了"

## 总体路线

```text
能玩 → 能记 → 会变 → 能造 → 可分享 → 作品级
```

| 版本 | 代号 | 目标 | 你能看到什么 | 状态 |
|------|------|------|-------------|------|
| v0.1 | 入场 | 进入场景，角色会对话 | 3 个有性格的角色跟你说话 | ✅ |
| v0.2 | 记忆 | 角色记得发生过什么 | 第 10 轮引用第 2 轮的事 | ✅ |
| v0.3 | 活的世界 | AI 总导演实时改写剧情 | 角色翻脸、情感状态、叙事张力、关系演变 | ✅ |
| v0.4 | 剧本工坊 | 创建自己的世界 | 不写代码也能造一个世界 | ✅ |
| v0.5 | 产品优化 | 玩家身份+线索+调查+通用引擎 | 从"聊天"变成"调查"，引擎适配任何类型 | ✅ |
| v0.6 | 可扩展 | Docker、CI、多模型、扩展层 | 陌生开发者 10 分钟跑起来 | ✅ |
| v1.0 | 作品级 | 完整作品发布 | 面试官 2 分钟理解项目价值 | ⬜ |

---

## v0.1 — 入场 ✅ 已完成

**目标：** 让用户 3 分钟内进入一个有张力的场景。

**已实现：**
- 3 角色默认场景（Neon Harbor 雨夜市场）
- AI 总导演决定谁说话
- 角色有秘密、会回避、会反问（剧本杀感 prompt）
- 中英双语 + API 设置 + 三级 fallback
- 纯对白输出，无旁白动作描写

**验收标准：**
- [x] 新用户 3 分钟内能进入场景
- [x] 角色不直接回答问题，会回避和反问
- [x] 对话有张力，像剧本杀不像聊天机器人

---

## v0.2 — 记忆 ✅ 已完成

**目标：** 角色真的记得发生过什么。玩家不能"靠刷新重来"——你说过的话，这个世界记得。

**已实现：**
- 每轮自动提取世界事实 + 角色记忆
- 角色发言前检索自己的记忆注入 prompt
- 侧边栏展示记忆面板
- 重启后记忆不丢失

**验收标准：**
- [x] 第 10 轮对话能自然引用第 2 轮发生的事
- [x] 重启后世界事实和角色记忆仍在
- [x] UI 展示记忆写入和命中

---

## v0.3 — 活的世界 ✅ 已完成

**目标：** 这个世界不再只是"角色记住你说的话"——它会**因为你而改变**。

### 核心机制：AI 总导演的三个层级

```
第一层：反应层（v0.1-v0.2 已实现）
  → 角色基于对话上下文回应

第二层：变化层（v0.3 已实现）
  → 总导演主动改变世界状态：
  - 角色之间的关系会变化（信任→背叛、敌意→合作）
  - 新事件会发生（有人被杀、有线索出现、有势力介入）
  - 场景会切换（雨夜市场→地下赌场→废弃码头）

第三层：叙事层（v0.3 已实现基础，后续增强）
  → 总导演有自己的叙事意图：
  - "这个玩家的推理太快了，提前引爆一个反转"
  - "这个玩家完全走偏了，给一个暗示把他引回来——或者不引，让他创造新故事"
  - "主线太无聊了，让一个角色突然翻盘"
```

### v0.3 已实现功能

**1. 世界时间推进** ✅
- day counter + 时间段（黎明/上午/下午/夜晚）
- 每 4 轮对话推进一个时段
- 时间影响场景氛围（night = "Neon flickers in the rain"）
- 角色可用性受时间影响

**2. 关系系统** ✅
- 角色间关系维度：trust(0-100) / hostility(0-100) / dependency(0-100)
- 玩家行为影响关系（帮了 Mira → Mira 信任度↑，出钱买情报 → June 敌意↑）
- LLM 每轮分析对话，输出关系变化（delta -20~+20）
- 初始关系从 YAML 加载
- UI 展示关系进度条

**3. 动态事件引擎** ✅
- 总导演根据玩家行为 + 关系张力 + 世界状态生成新事件
- 事件类型：plot_twist / character_action / environment / revelation / escalation
- 有触发条件：高敌意(60+)、信任崩塌、叙事停滞
- 不是随机事件，是有叙事目的的事件

**4. 总导演升级** ✅
- 从"选谁说话"升级为"世界状态管理者"
- 接收关系数据 + 时间数据 + 事件历史
- 叙事张力追踪：calm → simmering → tense → breaking_point
- 停滞度检测：太久没事件时主动制造冲突
- 角色状态追踪（active/incapacitated）

**5. 情感状态引擎** ✅
- 纯计算（无额外 LLM 调用），从关系+记忆+时间+性格推导角色当前情绪
- 7 种 mood：烦躁/不安/温和/警惕/低落/平静/紧绷
- arousal 等级影响反应强度
- 注入角色提示："你现在的心理状态——你整个人绷得很紧"
- 时间段修正：夜晚更警惕，上午更放松
- 性格偏向：多疑角色天然倾向 suspicious，暴躁角色天然倾向 angry

**6. 角色反思（Reflection）** ✅
- 记忆提取新增 `reflection` 类别
- 角色从累积记忆中形成高层洞察（"Ren 似乎在把人命当价码"）
- 反思类记忆检索时优先展示
- 角色表现出"学习"和"成长"

### 理论基础

| 理论 | 应用 |
|------|------|
| Stanford Generative Agents | Memory Stream → Retrieval → Reflection → Planning 架构 |
| Drama Management | 叙事张力弧：setup → rising action → climax → resolution |
| Emotional State Machine | 持续情感状态影响对话基调 |
| Emergent Narrative | 故事从系统交互中涌现，而非预设脚本 |

### 不做
- 复杂战斗系统
- 开放世界地图
- 多用户实时协作

### 验收标准
- [x] 角色之间的关系会因为对话而变化
- [x] 总导演能在关键时刻制造剧情反转
- [x] 总导演有叙事弧线意识（张力追踪 + 停滞检测）
- [x] 角色有持续的情感状态，影响对话语气
- [x] 角色能从记忆中形成高层洞察（反思）
- [x] 玩家离开几轮回来，世界发生了新事件（Wait 按钮推进时间 + 停滞度触发事件）
- [x] 时间线能让玩家回看"这个世界怎么变成现在这样"（Timeline 选项卡）

### 实测验证（2026-05-16）
- 角色说话自然，语气区分度高（Ren 圆滑 vs June 直接）
- 关系随对话演变（出钱 → Ren 信任上升，June 敌意上升）
- Director 场景更新有洞察力（"附近摊贩的交谈声短暂压低"）
- 记忆提取准确（conflict/impression/affinity/event/reflection）
- 当前默认模型为 `mimo-v2.5`；旧测试中 `mimo-v2.5-pro` 路径每轮约 70-90 秒（5-7 次 LLM 调用）
- 后处理已并行化（记忆提取+关系分析+事件生成 Promise.all）
- 角色生成保持串行（后面角色能看到前面角色的发言）
- 记忆窗口放大：30 条近期消息 + 5 条世界事实 + 10 条角色记忆（利用 1M token 上下文）
- API 已从 `gpt-5.5` 迁移到 MiMo 系列；当前默认是 `mimo-v2.5`，历史上曾使用 `mimo-v2.5-pro`

### 已知问题（待修复）

| 优先级 | 问题 | 状态 | 说明 |
|--------|------|------|------|
| ~~P0~~ | ~~角色偶尔只输出"……"~~ | ✅ 已修复 | `runTurn.ts` 后处理检测+重试+fallback 台词 |
| ~~P0~~ | ~~角色偶尔输出动作描写 `（xxx）`~~ | ✅ 已修复 | `runTurn.ts` 正则移除括号+星号内容 |
| ~~P1~~ | ~~记忆提取归因错误~~ | ✅ 已修复 | `memoryExtractor.ts` 玩家标注+归因规则 3 条 |
| ~~P1~~ | ~~没有关系变化历史~~ | ✅ 已修复 | `store.ts` 新增 RelationshipHistory 自动记录 |
| ~~P2~~ | ~~Timeline turnIndex 猜算~~ | ✅ 已修复 | `SessionEvent.turnIndex` 存储实际值 |
| P1 | `mimo-v2.5-pro` 路径每轮 70-90 秒（历史测试） | ⚠️ 已知 | 后处理已并行，推理瓶颈主要来自较慢模型 |
| P2 | store.json 全量写入性能 | ❌ v0.4 | 50+ 轮后考虑 SQLite |

### 简历价值
**这是项目的核心差异化。** Character.AI 是聊天，SillyTavern 是角色扮演，Parallel 是**活的世界模拟**。

详细开发文档见 `V0.3_DEVELOPMENT_SPEC.md`。

---

## v0.4 — 剧本工坊 ✅ 已完成

**目标：** 别人能造自己的世界。

### 已实现
- 世界创建页面：设定场景、角色、关系、秘密、规则、开场白
- YAML 存储：世界数据保存为 `data/worlds/{id}.yaml`
- 一键导出/导入世界包（API: `/api/world/export`, `/api/world/import`）
- 世界列表 + 切换下拉菜单
- 内置 4 个模板：空白 / 现代悬疑 / 科幻阴谋 / 暗黑奇幻
- 全面回归测试通过（创建→YAML保存→列表→对话→切换）

### 验收标准
- [x] 不写代码，也能创建一个完整的世界
- [x] 世界包能被导出、分享、重新导入
- [x] 4 个模板都能跑通核心循环

### 未实现（低优先级）
- 角色关系图可视化编辑
- 主线剧情编辑器（定义初始冲突和关键节点）

---

## v0.5 — 产品优化 ✅ 已完成

**目标：** 从"聊天"变成"游戏"。基于竞品分析和沉浸式玩家视角，补齐核心体验缺失。

### 已实现

**1. 玩家身份系统** ✅
- 进入世界前输入名字，overlay 沉浸式入口
- 角色用名字称呼玩家（"Chen, you've got sharp eyes"）
- 名字传递全链路：page → API → runTurn → director + buildPrompt + message
- 名字持久化 localStorage

**2. 开场自动叙事** ✅
- 新 session 首次交互时，自动插入 `world.opening` 作为旁白消息
- 第一印象从"空聊天框"变成"电影开场"

**3. 线索/证据系统** ✅
- LLM 从对话中自动提取线索（`clueEngine.ts`）
- 线索数据模型：name + description + source + relatedCharacterId
- 去重存储（同名字不重复添加）
- 侧边栏线索面板：来源标签 + 关联角色 + 描述
- 回合通知中显示新发现线索

**4. 调查动作系统** ✅
- 环顾四周 / 竖耳倾听 / 整理思路 — 三个调查动作按钮
- 调查动作跳过 Director 和角色对话，走专用旁白 prompt
- 输出电影级感官描写（环境细节、角色微表情、暗示性线索）
- 正常对话仍走 Director + 角色生成

**5. 通用引擎（去 murder-mystery 硬编码）** ✅
- 7 个引擎模块 + 1 个 meta 文件全部改为 genre-aware
- Director 读 `world.genre` + `world.rules` + `world.tagline` 动态适配
- 角色行为 prompt 根据类型调整（悬疑→有秘密会撒谎；奇幻→超自然言行）
- 线索引擎支持 genre-specific discovery 类型
- 交叉验证：赛博朋克悬疑 + 暗黑奇幻两种类型实测通过

### 验收标准
- [x] 玩家有身份，角色用名字称呼
- [x] 开场有电影级叙事
- [x] 线索能从对话中自动提取
- [x] 调查动作产出沉浸式旁白
- [x] 引擎适配任何世界类型

### 实测验证（2026-05-17）
- 旁白质量极高（"雨声敲打着头顶的塑料棚，霓虹灯管在积水里投下扭曲的倒影"）
- 调查动作输出电影感（Look: 角色微表情；Listen: 偷听到对话片段）
- 线索提取准确（3 条/轮，含 relatedCharacterId 去重）
- 暗黑奇幻世界测试：Aelira "the cost will be in years" / Thalen "the tower groans like it knows"
- 赛博朋克世界测试：Ren "finder of things you didn't lose" / June "Jobs don't care about the hour"

---

## v0.6 — 可扩展 ✅ 已完成

**目标：** 陌生开发者能跑起来、能扩展。

### 已实现

**1. 版本统一** ✅
- `package.json` 升至 `0.6.0`
- README、ROADMAP、HANDOFF 文档版本口径统一
- 明确说明：代码语义版本 `0.6.0` = 产品阶段 v0.6

**2. Docker 支持** ✅
- `Dockerfile`：多阶段构建（deps → builder → runner），Node 20 Alpine
- `.dockerignore`：排除 node_modules、.next、.env.local、store.json（保留 data/worlds）
- `next.config.ts`：添加 `output: "standalone"` 支持
- 默认世界（neon-harbor 等）通过 COPY 打进镜像
- `data/store.json` 可 volume 挂载持久化
- 无 API key 时自动进入 Mock Mode
- 实测：`docker pull` + `docker build` + `docker run` 全部通过

**3. GitHub Actions CI** ✅
- `.github/workflows/ci.yml`：push/PR 触发
- 步骤：`npm ci` → `npm run lint` → `npm run build`
- Node 20 + npm cache
- 不依赖真实 API key

**4. 可扩展 Provider 架构** ✅
- `lib/llm/catalog.ts`：Provider 注册表（元信息、默认 URL、是否需要 key）
- `lib/llm/provider.ts`：重构为基于注册表的解析逻辑
- 支持 5 种 provider：openai / anthropic / openrouter / ollama / mock
- 两条明确链路：OpenAI-compatible（/v1/chat/completions）+ Anthropic native（/v1/messages）
- 核心修复：有明确 provider 配置但无 key → 不再静默走 Mock
- openrouter 默认 `https://openrouter.ai/api/v1`
- ollama 默认 `http://localhost:11434/v1`（不需要 key）
- 兼容旧 localStorage 配置数据

**5. Settings UI 扩展** ✅
- `components/SettingsModal.tsx`：4 种 provider 按钮
- 选择 provider 自动带默认 placeholder / base URL
- 无 key 也可保存配置（不再删除）
- Test 按钮不前端拦死（后端决定是否需要 key）
- 保留现有保存 / 测试连接逻辑

**6. 扩展接口层** ✅
- `lib/extensions/types.ts`：4 类扩展点接口
  - `ModelProviderAdapter` — 新增 LLM 提供者
  - `MemoryProvider` — 替换记忆存储
  - `EventGenerator` — 自定义事件生成
  - `WorldTemplateProvider` — 新增世界模板
- `lib/extensions/registry.ts`：类型安全的注册/查找

**7. 工程文档** ✅
- `docs/ARCHITECTURE.md`：目录结构、请求链路、Provider 系统、扩展层说明
- `docs/API.md`：全部 7 个 API 端点的请求/响应/错误文档
- `.env.local.example`：更新为 v0.6 格式，含全部 provider 配置示例

### 验收标准
- [x] `npm run lint` 通过
- [x] `npm run build` 通过
- [x] Docker 构建成功
- [x] Docker 运行成功，首页可访问
- [x] 新人只看 README 就知道怎么跑
- [x] 版本口径不再打架
- [x] Provider 注册表可用，旧配置兼容
- [x] Mock Mode 未被破坏

---

## v1.0 — 作品级发布 ⬜

**目标：** 面试官打开 GitHub，2 分钟内理解这个项目有多牛逼。

### 功能范围
- 3-5 个完整 demo worlds
- 在线 demo 或高清录屏
- 完整文档站 + 架构图 + 数据流图
- "How it works" 技术文章
- Roadmap / Issues / Contributing / Changelog

### 验收标准
- 面试官 2 分钟内理解：这不是聊天机器人，这是一个活的剧本杀世界
- 开发者 10 分钟内跑起来
- 玩家 5 分钟内感受到"这个世界会记住我，而且因为我的存在而不同"

### 简历价值

> Built an AI-driven interactive story engine with persistent world state, dynamic narrative rewriting, character-specific memory, and a real-time AI Showrunner that adapts the entire storyline based on player behavior.

---

## 功能优先级铁律

**优先做能产生"这个世界活了"的功能。**

### 高优先级
- AI 总导演的叙事能力
- 角色关系动态变化
- 世界事件引擎
- 动态场景切换
- 角色记忆
- 时间线

### 低优先级
- 语音、头像、市场
- 数字分身、移动端
- 多用户在线
- 复杂权限系统

## 核心技术挑战

### 挑战 1：总导演的叙事质量
总导演需要同时管理"谁说话"、"关系怎么变"、"什么事件该发生"、"剧情往哪走"。这需要很强的 LLM 能力和 prompt 工程。**解决方案：** 分层 prompt —— 一层管叙事弧线，一层管角色调度，一层管世界状态。

### 挑战 2：剧情连贯性
长对话中，世界状态会越来越复杂。角色需要知道自己经历过什么、关系发生了什么变化。**解决方案：** v0.2 的记忆系统是基础。v0.3 实现了结构化的世界状态（关系值、事件日志、情感状态、角色反思）。角色通过记忆检索+情感状态注入保持连贯。

### 挑战 3：Token 成本
多角色 + 总导演 + 记忆检索 + 事件生成 = 每轮多次 LLM 调用。**解决方案：** 总导演用小模型快速决策，角色扮演用大模型保证质量。记忆检索用简单过滤，不用向量搜索。

### 挑战 4：不可预测性
活的世界意味着总导演会做出开发者没想到的事。这是特性不是 bug —— 但需要安全边界。**解决方案：** 世界规则（YAML 中的 rules）作为总导演的约束。超出规则的行为被拒绝。

## 最终判断

Parallel 的第一性原理：

> **这是一个活的世界。玩家走进去，世界因为他而变得不同。**
>
> 传统互动叙事：剧本写好了，玩家只是执行者。
> Parallel：AI 总导演根据玩家的每一步，实时改写这个世界的剧情、关系、甚至真相。
>
> 没有两次游戏是一样的。因为没有一个玩家是一样的。因为没有一个世界是一样的。

---

## GitHub 更新节奏

### 每周
- 周一：开 milestone，写本周目标
- 周三：发 progress note、截图或 demo gif
- 周五：合并可见改进，打小版本

### 每两周
- 一篇技术笔记或产品复盘
- 一个可展示 demo
- README 更新

### 可写文章标题
- Building a Living Murder Mystery Engine
- How Parallel's AI Showrunner Rewrites the Story in Real-Time
- Not a Chatbot, Not a Game — A Living World
- Dynamic Narrative: When the AI Director Changes the Plot Because of You
- From Chatbot to Living World: Building Parallel
