# Parallel UI Redesign — Codex 交接文档

## Codex 接手结果（2026-05-17）

### 已完成
- `components/SettingsModal.tsx`: 移除旧 `zinc-*` 风格，统一为 `void/abyss/deep/edge/amber/prose` 新主题。
- `components/TimelinePanel.tsx`: 适配新主题，移除旧 emoji 事件标签，改为紧凑时间线卡片；中文界面顶部时间显示为“第 N 天 · 黎明/上午/下午/夜晚 · 回合 N”。
- `lib/ui/characterColors.ts`: 新增共享角色色系统，保留 12 个内置角色的定制色，同时为用户新建角色按 ID/名称生成稳定哈希色。
- `components/MessageList.tsx` / `components/WorldSidebar.tsx`: 删除重复 `CHAR_COLORS`，统一调用共享角色色工具。
- `app/globals.css` / `app/page.tsx`: 增加 genre-aware 主题变量，已覆盖 cyberpunk、dark fantasy、science fiction、modern mystery。
- `app/page.tsx`: 移动端隐藏桌面侧栏，新增底部世界/时间线抽屉；移动端保留创建世界入口；验证 390px 宽度无横向溢出。
- 已处理一次 Next 构建产物污染：停止旧进程，删除 `.next`，重新 `npm run build` 后启动生产服务。

### 验证结果
- `npm run lint` 通过。
- `npm run build` 通过。
- HTTP 生产验证：`/` 返回 200，`/api/world` 返回 200 且包含 `Neon Harbor`。
- 生产浏览器验证：桌面侧栏可见，Settings 弹窗可打开且无 `zinc-` 残留，cyberpunk genre 色变量生效（`--color-amber-glow: #61e8e1`）。
- 生产移动端验证：390x844 视口无横向溢出，创建入口可见，世界抽屉包含当前场景/角色，时间线抽屉包含时间线卡片。
- 验收截图：`qa-mobile-timeline.png`。

### 注意
- 浏览器插件日志接口曾保留一次旧的 dev 进程错误 `Cannot find module './331.js'`，根因是 `next dev` 运行期间执行 `next build` 污染 `.next`。当前文件存在 `.next/server/chunks/331.js`，生产 HTTP 验证为 200。

## 项目状态
- **位置**: `C:\Users\asd59\Desktop\AI世界引擎`
- **技术栈**: Next.js 15 + TypeScript + Tailwind CSS v4
- **API**: mimo-v2.5（当前默认文本模型，OpenAI 兼容，`.env.local` 已配置）
- **当前版本**: v0.5 产品优化 ✅ → 下一步 v0.6 可扩展

---

## 已完成的 UI 改造 (本次会话)

### 1. CSS 主题系统 — `app/globals.css` ✅
- 自定义 Tailwind 主题色：void/abyss/deep/panel/surface/elevated/edge/mist
- 琥珀色强调系：amber-accent/amber-glow/amber-dim
- 绯红色警告：crimson/crimson-bright
- 文字层级：prose/prose-dim/prose-muted
- 字体：Playfair Display (衬线) 作为故事字体
- 氛围效果：scene-gradient 径向渐变 + noise-bg 噪点纹理
- 动画：breathe(呼吸灯) / fadeSlideIn / fadeIn
- 消息样式类：`.msg-narrator`(装饰竖线) / `.msg-user`(琥珀左边条) / `.msg-character`(左边线)

### 2. MessageList — `components/MessageList.tsx` ✅
- **旁白消息**: 居中 + `msg-narrator` CSS 类 + 衬线斜体 + 装饰性琥珀渐变竖线
- **用户消息**: 左对齐 + `msg-user` CSS 类 + 琥珀左边条 + 玩家名前缀(大写字母间距)
- **角色消息**: 圆形头像(带角色色发光) + 角色名(角色色) + 对话气泡(角色色左边框 + 角色色半透明背景)
- **角色色系统**: 统一 CHAR_COLORS map，12 个预定义角色 + 默认色
- **空状态**: 大引号装饰 + 衬线体

### 3. MessageComposer — `components/MessageComposer.tsx` ✅
- 调查动作按钮：4 个(环顾/倾听/思考/等待)，SVG 图标替代 emoji
- 按钮样式：圆角 + 细边框 + hover 琥珀色
- 输入框：衬线字体 + 聚焦琥珀色边框
- 发送按钮：琥珀色填充

### 4. 主页面 — `app/page.tsx` ✅
- **Header**: 去掉了 Mock/API/Model 技术指示器(从主视图移除，只在设置里看)
- **世界选择器**: 点击展开下拉，带 genre 标签
- **玩家名 + 时间**: 次要文字，不抢视线
- **玩家名输入遮罩层**: 大引号装饰 + 世界名 + 标语 + 衬线输入框
- **回合通知**: 更柔和的颜色(降低不透明度)，不打断叙事
- **侧边栏**: 更细的分隔线 + 更宽的字间距标题

### 5. WorldSidebar — `components/WorldSidebar.tsx` ✅
- 所有文字降低不透明度(更柔和)
- 角色卡：统一 CHAR_COLORS 系统(与 MessageList 共享)
- 关系条：更细(0.5px) + 半透明颜色
- 线索卡：角色色标签 + 翠绿色边框
- 区域标题：9px + uppercase + 0.2em tracking

### 6. 压力测试 — 12/12 PASS ✅
- 首页加载、World API、世界列表、世界切换、创建页、Build
- 英文对话、中文对话、调查动作、多轮记忆(30 msgs/15 facts/13 clues)
- YAML 导出、跨类型世界(暗黑奇幻)

---

## 未完成 — Codex 接手清单

### 🔴 高优先级

#### 1. SettingsModal 样式未适配 ✅ 已完成（v0.6）
- **文件**: `components/SettingsModal.tsx`
- **v0.6 改动**: 扩展为 4 种 provider（OpenAI / OpenRouter / Ollama / Anthropic），注册表驱动，自动 placeholder，兼容旧 localStorage 数据
- **注意**: 样式仍用现有 `settings-*` CSS 类，未做主题色适配（那是 UI 优化范畴）

#### 2. TimelinePanel 样式可能需要同步
- **文件**: `components/TimelinePanel.tsx`
- **问题**: 可能还在用旧配色，未确认
- **需要**: 检查并统一到新主题色

#### 3. 创建世界页面 (`app/create/page.tsx`) 细节优化
- **文件**: `app/create/page.tsx`
- **状态**: 基本适配了(用了 scene-gradient、font-serif、amber-dim)，但可以更精致
- **需要**: 模板按钮可以加图标；Field 组件的 focus 状态可以更突出

### 🟡 中优先级

#### 4. 角色色系统不完善
- **问题**: CHAR_COLORS 只预定义了 12 个角色，用户自己创建的角色会回退到默认灰色
- **需要**: 基于角色 ID 或角色名生成稳定哈希色的函数
- **位置**: MessageList.tsx 和 WorldSidebar.tsx 各有一份 CHAR_COLORS(重复)
- **建议**: 抽成共享模块 `lib/ui/characterColors.ts`

#### 5. Genre-aware 视觉主题
- **问题**: 所有世界类型都是同一套暗色+琥珀色，没有根据世界类型调整
- **需要**: 根据 `world.genre` 切换主色调
  - cyberpunk → 琥珀/霓虹
  - dark fantasy → 深紫/银白
  - sci-fi → 冷蓝/白
  - modern mystery → 灰黑/红
- **影响**: globals.css 的 CSS 变量 + 各组件的 accent 色

#### 6. 响应式布局
- **问题**: 目前侧边栏固定 w-80，手机端无法使用
- **需要**: 移动端侧边栏折叠为抽屉/底部面板
- **影响**: page.tsx 的布局结构

### 🟢 低优先级

#### 7. 消息气泡动效增强
- 新消息滑入动画可以更流畅(当前 0.25s translateY)
- 连续同一角色消息可以合并(减少视觉噪音)

#### 8. Loading 状态优化
- 等待 LLM 响应时(70-90s)，可以显示打字机效果的 loading 提示
- 例如：角色头像 + 呼吸灯 + "正在思考..."

#### 9. 空状态优化
- 首次进入世界时(还没输入名字)，可以显示角色剪影或场景插画

---

## 文件清单

| 文件 | 本次改动 | 状态 |
|------|---------|------|
| `app/globals.css` | 全新主题色 + 消息样式 + 动画 | ✅ 完成 |
| `app/page.tsx` | 重写 Header + 玩家名遮罩 + 通知样式 | ✅ 完成 |
| `components/MessageList.tsx` | 全新消息渲染(旁白/用户/角色) | ✅ 完成 |
| `components/MessageComposer.tsx` | SVG 图标 + 重新布局 | ✅ 完成 |
| `components/WorldSidebar.tsx` | 统一配色 + 柔化文字 | ✅ 完成 |
| `components/SettingsModal.tsx` | v0.6：扩展为 4 种 provider + 注册表驱动 | ✅ 完成 |
| `components/TimelinePanel.tsx` | **未确认** — 可能需要适配 | ⬜ 待确认 |
| `app/create/page.tsx` | 自动适配了基本样式，可进一步优化 | ⬜ 可选 |
| `app/layout.tsx` | 之前已改(meta description) | ✅ 已有 |

---

## API 端点(未改动，供参考)

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/world` | GET | 加载世界数据(messages/facts/memories/clues/relationships/events) |
| `/api/world?action=list` | GET | 世界列表 |
| `/api/world?worldId=xxx` | GET | 切换世界 |
| `/api/world/export?worldId=xxx` | GET | 导出世界 YAML |
| `/api/world/import` | POST | 导入世界 YAML |
| `/api/world/create` | POST | 创建新世界 |
| `/api/chat` | POST | 对话(body: sessionId, message, language, worldId, playerName, llmConfig?) |

---

## 启动方式

```bash
cd "C:\Users\asd59\Desktop\AI世界引擎"
npx next dev --port 3000
# 浏览器打开 http://localhost:3000
```
