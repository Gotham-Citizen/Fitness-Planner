[English](README.md) | [中文](README.zh.md)

# Fitness Planner

一个围绕 1,324 个动作库搭建的全栈健身训练规划器。按 身体部位 → 目标肌肉 浏览动作、观看动画演示、创建自己的训练列表、配合休息计时器记录训练组数，并追踪恢复状态、体重与力量均衡分析。支持中英文界面。
[![Demo](./media/demo.gif)](./media/demo.mp4)

## ▶️ 在线体验

<a href="https://gotham-citizen.github.io/Fitness-Planner/">
  <img src="./public/images/demo.png" alt="Fitness Planner Gif" width="600">
</a>

点击链接立即体验！部署在前端页面的请求会打到运行于 [Cloudflare Worker](https://fitness-planner.myenglishnameisbennie.workers.dev/api/health) 上的 API（数据库为 Cloudflare D1）。游客可以直接浏览动作库；注册登录后即可创建训练列表、记录训练并追踪进度。

## 快速开始

### 前置要求

- Node.js（v24+）
- 可选：Cloudflare 账号 —— 仅在需要部署自己的 API 或连接远程 D1 数据库时需要

### 安装

```bash
npm install
npm run fetch:data        # 下载数据集 + 动作媒体文件到 public/ 和 server/data/
npm run db:gen           # 从数据集生成 server/seed.sql
npm run db:schema:local  # 创建本地（Miniflare）D1 表结构
npm run db:data:local    # 导入种子数据
npm run dev              # Vite（网页端，:5173）+ wrangler dev --local（API，:8787）
```

打开 `http://localhost:5173`，完全离线可用。

> `server/data/` 和 `server/seed.sql` 按设计被 gitignore —— 新 clone 的仓库通过 `npm run fetch:data` + `npm run db:gen` 重新生成。登录功能还需要 `JWT_SECRET`：本地开发请在 `server/.dev.vars`（已 gitignore）中配置，例如 `JWT_SECRET=任意长随机字符串`。

本地开发的所有配置项均可省略（模板见 `.env.example`）：

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE` | 前端部署在其他域名（如 GitHub Pages）时的 Worker API 绝对地址；同源部署可省略 |
| `VITE_BASE` | 应用被托管的基础路径 —— 默认 `/`，GitHub Pages 项目页为 `/<仓库名>/`（由部署工作流自动设置） |
| `CORS_ORIGIN` | 服务端允许调用 API 的来源，默认 `*` |
| `API_TARGET` | Vite 开发代理 `/api` 的目标 —— 默认指向本地 wrangler 开发服务器（`http://localhost:8787`） |

### 部署 Worker

```bash
npx wrangler login
npx wrangler d1 create fitness-db
#    将返回的 database_id 填入 server/wrangler.jsonc

npm run db:schema:remote
npm run db:data:remote

npx wrangler secret put JWT_SECRET --config server/wrangler.jsonc
npm run deploy                     # 构建前端，并把整套应用部署为一个 Worker
```

该 Worker 将前端产物、全部媒体和 API 部署在同一域名下（`nodejs_compat` + SPA 回退的静态资源）。也可以只运行网页端：

```bash
npm run dev:web   # 仅 Vite —— /api 走代理（默认本地 Worker，设置了 API_TARGET 则代理到已部署的 Worker）
npm run dev:api   # 仅 wrangler dev --local（端口 8787）
```

### 将前端部署到 GitHub Pages

GitHub Pages 只能托管静态文件，因此 API 继续留在 Cloudflare Workers 上：

1. 先部署 Worker（见上一步），记下它的地址，例如 `https://fitness-planner.<你的子域>.workers.dev`。
2. 将仓库推送到 GitHub，并添加一个名为 `VITE_API_BASE` 的仓库**变量**，值为该 Worker 地址。
3. 在 **Settings → Pages** 中将 Source 设为 **"GitHub Actions"**。
4. 推送到 `main` 分支。[部署工作流](.github/workflows/deploy-pages.yml) 会以 `VITE_BASE=/<仓库名>/` + `VITE_API_BASE` 构建，并发布 `dist/`。

跨域请求由 `server/app.js` 中的 CORS 中间件放行（通过 `CORS_ORIGIN` 控制）。

### 生产构建

```bash
npm run build
npm run preview
```

## 功能特性

- **1,324 个动作的动作库** —— 按 身体部位 → 目标肌肉 → 动作 逐级浏览，附循环播放的 GIF 演示、缩略图、器械、目标/主要/次要肌肉和分步讲解
- **支持中文的搜索** —— 同时匹配英文、中文或拼音（输入 `wo tui` 即可找到 腿部 动作）；搜索框做了 IME 安全处理，拼音输入过程中不会误触发
- **器械浏览** —— 23 张实拍卡片（每种器械一张 PNG，位于 `public/equipment/`，"其他"固定在末尾），点击进入该器械的动作列表；可按数量、A→Z 或难度排序
- **自定义动作** —— 创建、编辑、删除自己的动作（名称、分类、目标肌肉、器械）；自动并入动作库，仅对你的账号可见
- **账号体系** —— 邮箱 + 密码注册/登录（JWT 会话）；个人资料含昵称、性别、体重 + 单位（kg/lb）、力度量表、计时器提醒设置和界面语言
- **训练列表** —— 命名列表，支持添加/移除动作、逐动作休息计时配置、重命名和删除；大小写不敏感的重复名检测
- **实时训练** —— 从任意列表开始训练；逐组记录次数、重量、kg/lb 和力度；可编辑或删除某组；**结束训练** 时拦截"有重量但没填次数"的组
- **RIR / RPE 力度记录** —— 组可按 RIR（0–4，0 = 力竭）或 RPE（6–10，10 = 力竭）评分；平均值、正式组划分和每周力度统计设有最低评分数门槛
- **休息计时器** —— 逐动作休息配置，支持声音（哔声 / 钟声 / 铃声）、振动和闪光提醒，全部可在 账户 → 计时器提醒 中设置
- **训练总结** —— 结束后展示逐动作的组数统计与段位进阶（坚韧 → 王者，以 StrengthLevel 全社区 1RM 均值校准），并与你之前的训练对比
- **单列表历史** —— 回看任意一次历史训练的总结；可删除单次记录或清空整个列表的历史
- **训练日志** —— 按天记录、按列表筛选，另有体重打卡、趋势曲线和目标体重
- **肌肉均衡** —— 已练/未练肌肉地图，以及 **结构均衡**：你的估算 1RM（Epley 类公式）对照按体重折算的力量标准，区分性别
- **恢复追踪** —— 根据近期训练计算每个目标肌肉的恢复状态，展示在训练页
- **最近肌肉** —— 最近浏览/训练过的目标会重新出现在动作库的"最近"标签里，并标注"尚未探索"
- **双语、主题、响应式** —— 中/英文界面（浏览器检测，登录后跟随账号设置）、深色/浅色主题、移动端底部标签栏布局

## 工作原理

1. 动作库通过 API（`/api/exercises`）加载 —— 1,324 个动作来自 [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)，GIF 和缩略图全部本地打包在 `public/` 中。
2. 游客可自由浏览（该接口使用可选鉴权）；登录后解锁自定义动作、训练列表和记录功能。
3. 从列表创建实时训练（`POST /api/workoutlists/:id/sessions`）；每一组都即时单独保存，因此刷新页面训练不丢，还能在训练中修改。
4. 结束训练（`PUT /api/sessions/:id/complete`）会校验各组、保存总结，并驱动日志、历史、恢复、均衡和段位等全部由客户端根据历史计算的功能。
5. 同一个 Express 应用（`server/app.js`）既能跑在 Cloudflare Worker 上（`server/worker.js` + D1），也能在本地运行（`wrangler dev --local` + Miniflare D1）—— 两套环境一条代码路径。

### API 参考

| 方法 | 路由 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 存活检查 |
| POST | `/api/auth/signup` | 注册 `{ email, password, name, gender? }` |
| POST | `/api/auth/login` | 登录 `{ email, password }` |
| GET | `/api/auth/me` | 当前用户 |
| PUT | `/api/auth/profile` | 更新 `{ email?, name?, gender?, bodyweight?, bodyweightUnit?, effortScale?, timerSound?, timerPlaySound?, timerVibrate?, timerFlash?, language? }` |
| DELETE | `/api/auth/me` | 注销账号 |
| GET | `/api/exercises` | 全部动作（游客获得种子动作库；登录用户额外包含其自定义动作） |
| POST | `/api/exercises` | 创建自定义动作 |
| GET | `/api/exercises/:id` | 单个动作详情 |
| PUT | `/api/exercises/:id` | 更新自定义动作 |
| DELETE | `/api/exercises/:id` | 删除自定义动作 |
| GET | `/api/workoutlists` | 全部训练列表及其动作 |
| POST | `/api/workoutlists` | 创建列表 `{ name, exerciseId? }` |
| PUT | `/api/workoutlists/:id` | 重命名列表 `{ name }` |
| DELETE | `/api/workoutlists/:id` | 删除列表（历史记录仍保留在日志中） |
| POST | `/api/workoutlists/:id/exercises` | 添加动作 `{ exerciseId }` |
| DELETE | `/api/workoutlists/:id/exercises/:exerciseId` | 从列表移除动作 |
| PUT | `/api/workoutlists/:id/exercises/:exerciseId` | 更新逐动作设置（休息计时） |
| POST | `/api/workoutlists/:id/sessions` | 开始一次训练 |
| GET | `/api/workoutlists/:id/sessions` | 单个列表的训练历史 |
| DELETE | `/api/workoutlists/:id/sessions` | 清空列表历史 |
| GET | `/api/sessions` | 你的全部训练记录（含已删除列表） |
| GET | `/api/sessions/:sessionId` | 单次训练及其组记录 |
| DELETE | `/api/sessions/:sessionId` | 删除一次训练 |
| PUT | `/api/sessions/:sessionId/complete` | 校验并结束训练 |
| PUT | `/api/sessions/:sessionId/bodyweight` | 训练中记录体重 |
| POST | `/api/sessions/:sessionId/sets` | 记录一组 `{ exerciseId, setNumber, reps, weight, weightUnit, rir, effortScale }` |
| PUT | `/api/sessions/:sessionId/sets/:setId` | 修改一组 |
| DELETE | `/api/sessions/:sessionId/sets/:setId` | 删除一组 |
| GET | `/api/bodyweight` | 体重打卡历史 |
| POST | `/api/bodyweight` | 记录体重 `{ weight, unit, loggedAt }` |
| DELETE | `/api/bodyweight/:id` | 删除一条体重记录 |
| PUT | `/api/bodyweight/goal` | 设置目标体重 |

## 技术栈

### 前端

- **React 19** —— UI 组件与 hooks
- **Vite** —— 开发服务器、代理与构建工具
- **i18next + react-i18next** —— 完整的国际化方案，含浏览器语言检测与按账号记忆语言；翻译文件位于 `src/utils/locales/{en,zh}/translation.js`
- **原子化组件架构** —— `src/components/` 按 atoms → molecules → organisms → templates 分层，每层提供桶文件 `index.js`

### 后端 / 基础设施

- **Express 5** —— API 路由，通过 `server/worker.js` 运行在 Cloudflare Workers（`nodejs_compat`）上
- **Cloudflare D1**（SQLite）—— 动作、自定义动作、用户、训练列表、训练记录、组数、体重打卡（`server/schema.sql`）
- **jose** —— JWT 签发/校验（HS256），密钥仅保存在服务端
- **Web Crypto PBKDF2** —— 密码哈希（10 万次迭代，SHA-256，每用户独立盐值）
- **Wrangler** —— Workers/D1 命令行工具，用于本地开发（Miniflare）与部署
- **GitHub Actions** —— CI/CD 流水线，构建并部署到 GitHub Pages
- **pinyin-pro** —— 拼音转换，由种子生成脚本（`scripts/generate-seed.mjs`）用于预计算动作的拼音搜索列

## 项目结构

```
├── index.html                       # HTML 外壳
├── vite.config.js                   # Vite 配置（/api 开发代理、VITE_BASE）
├── eslint.config.js                 # ESLint flat 配置
├── .env.example                     # 可选 .env 配置模板
├── .github/workflows/
│   └── deploy-pages.yml             # GitHub Actions：构建并部署到 Pages
├── public/                          # 原样托管的静态媒体
│   ├── images/                      # 1,324 张动作缩略图
│   ├── videos/                      # 1,324 个动作 GIF 演示
│   └── equipment/                   # 器械卡片照片（<slug>.png，共 23 张卡片）
├── scripts/
│   ├── download-assets.mjs          # 下载数据集 + 媒体到 public/ 和 server/data/
│   └── generate-seed.mjs            # 从数据集 JSON 生成 server/seed.sql
├── shared/                          # 客户端与服务端共用模块
│   ├── normalize.js                 # 力度量表 / 语言 / 单位归一化
│   └── setRules.js                  # 组有效性规则（有重量无次数等）
├── server/
│   ├── app.js                       # Express 应用：CORS、鉴权、全部 API 路由
│   ├── worker.js                    # Cloudflare Workers 入口
│   ├── db.js                        # D1 数据访问层（用户、动作、列表、训练、体重）
│   ├── auth.js                      # PBKDF2 哈希 + JWT 签发/校验（jose）
│   ├── authMiddleware.js            # requireAuth / optionalAuth 鉴权中间件
│   ├── validate.js                  # 邮箱 / 性别 / 数字校验
│   ├── schema.sql                   # D1 表结构
│   ├── exercises-columns-migration.sql # 一次性远程 D1 迁移（拼音/难度字段）
│   ├── test-data.sql                # 本地开发测试数据（测试账号 + 跨时间段训练记录）
│   ├── wrangler.jsonc               # Worker 配置（静态资源、D1 绑定、nodejs_compat）
│   ├── .dev.vars                    # 本地密钥（gitignored）—— JWT_SECRET
│   └── data/                        # 生成的数据集与种子文件（gitignored）
└── src/
    ├── main.jsx                     # React 挂载入口
    ├── index.css                     # 全局样式 + 主题变量
    ├── app/                         # 每个页面一个文件夹
    │   ├── App.jsx                  # 根状态机：鉴权、列表、训练、导航
    │   ├── HomePage.jsx             # 首页仪表盘 + 搜索入口
    │   ├── PlannerPage.jsx          # 动作库浏览（层级 / 搜索 / 器械）
    │   ├── WorkoutsPage.jsx         # 训练列表 + 恢复面板
    │   ├── SessionPage.jsx          # 实时训练记录
    │   ├── SummaryPage.jsx          # 训练后总结（段位、历史最佳）
    │   ├── HistoryPage.jsx          # 单列表训练历史
    │   ├── JournalPage.jsx          # 按天日志 + 体重卡片
    │   ├── BalancePage.jsx          # 肌肉均衡 + 结构均衡
    │   ├── AccountPage.jsx          # 个人资料设置
    │   ├── AuthPage.jsx             # 登录 / 注册
    │   └── TimerAlertsPage.jsx      # 休息计时器提醒设置
    ├── components/
    │   ├── atoms/                   # 单一职责 UI（Button、TextInput、LineChart、
    │   │                            #   EquipmentImage、ThemeToggle、SegmentedToggle 等）
    │   ├── molecules/               # 原子组合（SearchBar、RestTimer、ExerciseBrowser、
    │   │                            #   CustomExerciseForm、MuscleBodyMap、WeighInsModal 等）
    │   ├── organisms/               # 完整视图（ExerciseLibrary、MovementDetail、
    │   │                            #   WorkoutSessionView、StructuralBalance、RecoveryPanel 等）
    │   └── templates/               # 页面骨架（AppShell、AuthTemplate、PlannerTemplate 等）
    ├── hooks/
    │   └── usePanelDrawer.js        # 抽屉开合的 a11y hook
    ├── lib/                         # 领域逻辑（纯模块，可单元测试）
    │   ├── api.js                   # API 客户端（fetch + JWT + 同源或 VITE_API_BASE）
    │   ├── muscles.js               # 层级构建、搜索（英/中/拼音）、媒体地址
    │   ├── equipmentGroups.js       # 器械归组（23 张卡片、"其他"桶）
    │   ├── effort.js                # RIR/RPE 换算 + 力度统计
    │   ├── ranks.js                 # 坚韧→王者 段位表（StrengthLevel 校准）
    │   ├── onerm.js                 # 1RM 估算公式
    │   ├── structuralBalance.js     # 力量标准 vs 体重（区分性别）
    │   ├── recovery.js              # 逐肌肉恢复计算
    │   ├── bodyweight.js            # 体重换算 + 个人资料辅助
    │   ├── summary.js               # 训练总结聚合
    │   ├── journal.js               # 日志日期键 + 训练分组
    │   ├── timerAlert.js            # 计时声音（哔/钟/铃）、振动、闪光
    │   └── …                        # dates、units、storage、recent、setValidation 等
    └── utils/
        ├── i18n.js                  # i18next 初始化 + 语言持久化
        ├── locale.js                # 应用语言 → Intl 区域映射
        ├── format.js                # 数字/日期格式化
        ├── validation.js            # 客户端表单校验
        └── locales/
            ├── en/translation.js    # 英文 UI 文案 + 肌肉/器械词典
            └── zh/translation.js    # 中文 UI 文案 + 肌肉/器械词典
```

## 语言支持

未登录时，界面跟随浏览器语言。登录后切换为账号保存的语言（缓存在 `localStorage`，刷新不闪烁）；退出登录会清除缓存并回到浏览器语言。新账号默认使用注册时的界面语言。搜索同时匹配英文、中文和拼音。

| 语言 | UI 检测 | 搜索匹配 |
| --- | --- | --- |
| English | `navigator.language` 兜底（默认） | 英文文本 |
| 中文 | 浏览器以 `zh` 开头，或个人资料设置 | 中文字符 + 拼音输入（预计算的 `name_pinyin` 列） |

新增语言的方法：在 `src/utils/locales/<lang>/` 下添加 `translation.js`（包含用于身体部位/器械名称的 `muscles.*` 词典），在 `src/utils/i18n.js` 中注册，扩展 `src/utils/locale.js` 的语言映射，并在服务端的资料更新接口中放行新语言值。拼音匹配仅限中文，可跳过。

## 安全说明

密码绝不会以明文离开服务器 —— 在 `server/auth.js` 中使用 Web Crypto PBKDF2（10 万次迭代、SHA-256、16 字节每用户盐值）哈希。会话令牌为由服务端 `JWT_SECRET` 签名的 JWT（生产环境为 Worker secret，本地为 `server/.dev.vars` —— 两者均已 gitignore）；客户端只保存令牌并以 Bearer 头发送。CORS 通过 `CORS_ORIGIN` 配置（默认 `*` —— 生产环境建议限制为你的 Pages 域名）。没有任何第三方追踪器或外部媒体：全部 GIF、缩略图和器械照片均随应用本地打包。
