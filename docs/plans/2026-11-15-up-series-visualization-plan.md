# 《人生七年》人物轨迹可视化 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个中英双语、可以离线打开的单文件网页，展示 *Seven Up!*（1964）到 *70 Up*（2026）中 14 位人物的出身、各年龄的状态和最终状态，并附上导演问题库。每条事实都有出处。

**Architecture:**
- 数据和界面分开。所有事实都存成 `data/` 下的 JSON，由同一个 `validateDataset()` 在测试和构建时把关，校验不通过就不出页面。
- 界面是 Svelte 5 单页应用，用 hash 路由切换页面。各页面共用一套纯函数，包括生命线布局、单元格取值、问题筛选、猜一猜出题，这些纯函数单独做单元测试。
- 资料生产分两类：脚本负责抓取字幕、提取候选问句；子代理按固定的提示词模板做标注和研究，另一个子代理独立核对。

**Tech Stack:**
- Node 26、Vite、TypeScript（strict）、Svelte 5
- d3-scale、vite-plugin-singlefile
- Vitest、@testing-library/svelte、jsdom
- 浏览器端检查用 Firefox headless（工作区自带）

**Spec:** `docs/specs/2026-11-15-up-series-visualization-design.md`（下文简称"设计 §n"）

## Global Constraints

- 工程根目录是 `~/workspace/up-series/`，原始下载放在 `~/workspace/up-series-raw/<来源名>/`。原始下载**永远不进**工程目录，脚本通过参数接收这个路径。
- 状态为 `confirmed` 的事实、所有问题、`intentKind: "sourced"` 的主题，都至少要有一个 `sourceId`，而且这个 id 必须在数据里能找到。查不到的写 `{ status: "not_found" }`，界面上显示"未查到 / Not found"。
- 原话摘录（`answerQuote`）每人每部片最多 3 条，每条的英文最多两句话。其他问答只写 `answerSummary`，也就是我们转述的要点，中英各一句。
- 发布的数据和产物里不能出现这几个字符串：`subtitlecat`、`springfieldspringfield`、`stockq`。
- 片中内容的出处：`sourceId` 指向这部影片本身（`kind: "film"`）；`locator` 写成"第几集 · 人物段落"，例如 `{zh:"第 1 集 · Symon 段落", en:"Part 1 · Symon segment"}`。
- 默认语言是中文。中文模式下问答显示译文，鼠标悬停（`title` 属性）显示英文原文。人名始终用英文原名。语言选择存在 `localStorage` 的 `up-lang` 里。
- 出身分组和颜色槽位对应如下：
  - `priv` 富裕家庭 · 私立学校 → `--series-1`
  - `east` 伦敦东区 · 公立小学 → `--series-2`
  - `home` 儿童之家 → `--series-3`
  - `rural` 约克郡山谷农场 → `--series-4`
  - `lpool` 利物浦郊区 → `--series-5`
- 配色取值：
  - 浅色：`#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4`，背景 `#fcfcfb`
  - 深色：`#3987e5 #d95926 #199e70 #c98500 #d55181`，背景 `#1a1a19`
  - 文字只用墨色（`#0b0b0b / #52514e / #898781`，深色模式用 `#f0efec / #c3c2b7 / #898781`），不用系列色。
- 页面上不放截图、视频和完整字幕；不做防剧透；不给人物打阶级分；没有后端、账号和统计埋点；不链接字幕网站。
- 解读性质的内容必须标"解读 / Interpretation"（`intentKind: "interpretation"`）。
- 抓取工具被拒绝的网站（Guardian、Independent、Slant），不能用其他手段绕过，只能请用户贴正文。
- 交付物是 `dist/index.html` 一个文件，用 `file://` 打开就能完整运行，不请求任何外部资源。
- 每个任务结束时提交到本地 git，不推送。提交信息最后一行是 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。

## Review Focus

1. **有缺席、去世、特殊出镜的人物，在每个页面都要显示正确。** 包括：Charles 28–63 岁缺席、70 岁只有录音；Lynn 63、70 岁时已去世；Nick 70 岁是生前访谈；Suzy 63 岁只出现在旧片段里。总览滑杆、个人页、对比、猜一猜都要显示正确的状态文字，不能空白也不能报错。对应测试放在 Task 4、5、6、12。
2. **操作到一半切换语言，当前状态要保留，文字全部切换。** 例如猜一猜答到一半、问题库正在筛选时切换：当前状态不丢，不出现 key 名、`undefined` 或另一种语言残留。对应测试放在 Task 3、9、12。
3. **搜索中文、带标点或大小写不一的英文都要能搜到。** 例如 `CABBIE?` 和 `出租车` 都要能命中同一条；没有结果时显示"没有找到"。对应测试放在 Task 9。
4. **用 `file://` 直接打开构建产物。** 路由、字体、图标都要正常，不发出任何网络请求。对应检查放在 Task 13。
5. **只归到影片、没有提问对象的问题（`personId: null`）。** 按人物筛选时不出现；按影片筛选时出现，并标"只归到影片"；`fromRecap` 为真的问题标"来自回放"。对应测试放在 Task 9。

---

### Task 1: 工程骨架、数据类型和校验器

**Files:**
- Create: `package.json`、`vite.config.ts`、`tsconfig.json`、`svelte.config.js`、`.gitignore`（忽略 `node_modules dist`）
- Create: `src/lib/data/types.ts`、`src/lib/data/validate.ts`、`src/lib/data/read-node.ts`、`scripts/validate-data.ts`
- Test: `tests/unit/validate.test.ts`、`tests/fixtures/dataset.ts`

**Interfaces:**
- Produces（`types.ts`）：
  - `Lang = 'zh'|'en'`、`Bilingual = {zh:string; en:string}`
  - `FilmId = 'f07'|'f14'|'f21'|'f28'|'f35'|'f42'|'f49'|'f56'|'f63'|'f70'`
  - `PersonId = 'andrew'|'charles'|'john'|'suzy'|'bruce'|'jackie'|'lynn'|'sue'|'tony'|'paul'|'symon'|'nick'|'peter'|'neil'`
  - `GroupId = 'priv'|'east'|'home'|'rural'|'lpool'`
  - `Participation = 'present'|'absent'|'audio_only'|'archival_interview'|'footage_only'|'deceased'`
  - `SourceKind = 'wiki'|'news'|'review'|'interview'|'broadcaster'|'film'|'other'`
  - `Source {id; url?; title; publisher; accessed; kind}`：`kind !== 'film'` 时 `url` 必填。
  - `Film {id; age; year; title; firstAired; lastAired; director; broadcaster; episodes; transcriptCoverage: 'full'|'partial'|'none'; sourceIds}`
  - `Group {id; name: Bilingual; colorVar: '--series-1'|'--series-2'|'--series-3'|'--series-4'|'--series-5'; order}`
  - `Person {id; name; fullName; group; background: Bilingual; born?; died?; participation: Record<FilmId,Participation>; participationNotes?: Partial<Record<FilmId,Bilingual>>; sourceIds}`
  - `DimKey = 'education'|'work'|'family'|'residence'|'events'|'outlook'`
  - `DimValue = {status:'confirmed'; text:Bilingual; sourceIds:string[]; questionIds?:string[]} | {status:'not_found'} | {status:'not_applicable'; reason:Bilingual}`
  - `StateRow {personId; filmId; dims: Record<DimKey,DimValue>}`
  - `FinalState {personId; asOfFilmId; text:Bilingual; sourceIds}`
  - `Theme {id; name:Bilingual; intent:Bilingual; intentKind:'sourced'|'interpretation'; sourceIds}`
  - `Question {id; filmId; personId: PersonId|null; attribution:'confirmed'|'film_only'; fromRecap:boolean; en; zh; themeIds; answerSummary?:Bilingual; answerQuote?:Bilingual; sourceId; locator:Bilingual}`
  - `OriginsContent {blocks: Array<{id; text:Bilingual; kind:'quote'|'fact'|'interpretation'; sourceIds}>}`
  - `Dataset {sources; films; groups; people; states; finals; themes; questions; origins; ui: Record<string,Bilingual>}`
  - `ValidationError {code; path; message}`
- Produces（`validate.ts`）：`validateDataset(ds: Dataset, opts: {strictFinals?: boolean} = {}): ValidationError[]`，`code` 取以下值之一：
  `MISSING_SOURCE | DANGLING_REF | BAD_ENUM | MISSING_LANG | MISSING_STATE | MISSING_FINAL | QUOTE_LIMIT | QUOTE_TOO_LONG | FORBIDDEN_DOMAIN | STATE_PARTICIPATION_CONFLICT | FILM_SOURCE_URL`

  其中 `MISSING_FINAL` 只在 `strictFinals` 为真时检查。`scripts/validate-data.ts` 读取环境变量 `STRICT_FINALS=1`，以此决定是否传入 `strictFinals`。
- Produces（`read-node.ts`）：`readDatasetFromDisk(dataDir: string): Dataset`，读取并合并以下文件：
  `sources/*.json`、`films.json`、`groups.json`、`people.json`、`states/*.json`（每个文件是 `{rows: StateRow[]; final: FinalState}`）、`themes.json`、`questions/*.json`、`origins.json`、`ui.json`
- Produces（`tests/fixtures/dataset.ts`）：`makeFixture(): Dataset`。包括 10 部片、5 个分组，以及 5 个人物：
  - `andrew`：全部出镜
  - `charles`：`f28` 到 `f63` 缺席，`f70` 为 `audio_only`
  - `suzy`：`f63` 为 `footage_only`
  - `lynn`：`f63`、`f70` 为 `deceased`，`died: '2013-05'`
  - `nick`：`f70` 为 `archival_interview`，`died: '2023-07-23'`

  另外有 3 条问题：一条 `confirmed` 的 `f07` 问题，带 `answerQuote`；一条 `film_only`；一条 `fromRecap`。

- [ ] **Step 1:** 运行 `git init`。用 `npm create vite@latest . -- --template svelte-ts` 生成骨架，然后加上 `vitest @testing-library/svelte jsdom d3-scale vite-plugin-singlefile`。`package.json` 里的脚本：
  - `test` = `vitest run`
  - `validate` = `node scripts/validate-data.ts data`
  - `build` = `npm run validate && vite build`
- [ ] **Step 2:** 写失败测试 `tests/unit/validate.test.ts`：
  - `fixture passes`：`expect(validateDataset(makeFixture())).toEqual([])`
  - `confirmed dim without source`：去掉一个 `confirmed` 值的 `sourceIds`，期望出现 `code === 'MISSING_SOURCE'`
  - `missing state row`：删除 `andrew/f35` 这一行，期望出现 `MISSING_STATE`
  - `4 quotes for one person in one film`：期望出现 `QUOTE_LIMIT`
  - `quote with 3 sentences`（`"I was. I am. I will be."`）：期望出现 `QUOTE_TOO_LONG`
  - `forbidden domain anywhere`：把某个 `Source.url` 改成 `https://www.subtitlecat.example/x`，期望出现 `FORBIDDEN_DOMAIN`
  - `absent cell with confirmed work`：`charles/f35` 的 `work` 设为 `confirmed`，期望出现 `STATE_PARTICIPATION_CONFLICT`；同一格的 `events` 设为 `confirmed` 时，不报这个错
  - `audio_only and archival cells may hold confirmed dims`：不报错
  - `missing en text`：期望出现 `MISSING_LANG`
  - `dangling personId in question`：期望出现 `DANGLING_REF`
  - `film source with url`：期望出现 `FILM_SOURCE_URL`；非 film 来源缺 url 时，期望出现 `MISSING_SOURCE`
- [ ] **Step 3:** 运行 `npx vitest run tests/unit/validate.test.ts`，期望结果是 FAIL（`validateDataset` 还不存在）。
- [ ] **Step 4:** 实现 `validateDataset`。几个实现要点：
  - 句子计数：`en.split(/(?<=[.!?…])\s+/).filter(Boolean).length`
  - 禁用域名：对 `JSON.stringify(ds).toLowerCase()` 做子串匹配
  - 与出镜状态冲突：在 `absent`、`footage_only`、`deceased` 的格子里，除 `events` 以外，任何维度都不能是 `confirmed`
- [ ] **Step 5:** 运行 `npx vitest run`，期望结果是 PASS。
- [ ] **Step 6:** 实现 `readDatasetFromDisk` 和 `scripts/validate-data.ts`：打印所有错误，有错误时以退出码 1 结束，没有错误时打印 `OK`。
- [ ] **Step 7:** 提交，提交信息为 `feat: scaffold, data types and validator`。

### Task 2: 核心数据（影片、人物、出镜情况）交叉核对后入库

**Files:**
- Create: `data/films.json`、`data/groups.json`、`data/people.json`、`data/sources/core.json`、`data/ui.json`（先只放导航和状态文字）、`data/origins.json`（`blocks: []`）、`data/themes.json`（`[]`）、`data/questions/.gitkeep`
- Create: `scripts/init-states.ts`
- Create: `data/states/<personId>.json`，14 个
- Test: `tests/unit/init-states.test.ts`

**Interfaces:**
- Consumes: Task 1 的类型和 `validateDataset`
- Produces: `initStates(people: Person[], films: Film[]): Record<PersonId,{rows: StateRow[]; final: FinalState|null}>`。生成规则：
  - `participation` 为 `present`、`audio_only`、`archival_interview` 的格子：全部维度都是 `not_found`。
  - `absent`、`footage_only`、`deceased` 的格子：全部维度都是 `not_applicable`，`reason` 取对应的状态文字。
  - 已有的 `states/*.json` 文件不覆盖。

  另外，研究完成之前 `final` 允许为 `null`。在 Task 10 打开 `STRICT_FINALS=1` 之前，校验器不检查这一项。

- [ ] **Step 1:** 写失败测试 `init-states.test.ts`：
  - `14×10 rows`
  - `charles f35 is not_applicable with reason 'absent'`
  - `lynn f63 not_applicable 'deceased'`
  - `nick f70 dims are not_found`
  - `does not overwrite existing file`（用临时目录测试）
- [ ] **Step 2:** 实现 `initStates`，跑测试，期望结果是 PASS。
- [ ] **Step 3（研究）:** 派一个子代理核对设计 §5 的影片表、人物分组和出镜矩阵：
  - 至少要有维基百科之外的第二个来源，比如 ITV 或 BBC 的节目页、播出当年的报道。
  - 确认几处细节：Nick 在维基表格里的脚注、Suzy 63 岁、Charles 63 岁、Lynn 去世的日期。
  - 输出到 `data/*.json` 和 `data/sources/core.json`。
  - 来源打不开时记录下来，不猜测。和设计 §5 不一致的地方，列给用户。
- [ ] **Step 4:** 运行 `node scripts/init-states.ts data`，再运行 `npm run validate`，期望输出 `OK`。
- [ ] **Step 5:** 提交，提交信息为 `data: core films, people, participation`。

### Task 3: 双语、路由和应用外壳

**Files:**
- Create: `src/lib/i18n.svelte.ts`、`src/lib/route.ts`、`src/lib/data/load.ts`、`src/lib/data/index.ts`
- Create: `src/App.svelte`、`src/components/Nav.svelte`、`src/components/LangToggle.svelte`、`src/components/Bi.svelte`
- Test: `tests/unit/route.test.ts`、`tests/components/shell.test.ts`

**Interfaces:**
- Produces:
  - `i18n`：一个 `$state` 对象 `{lang: Lang}`
  - `setLang(l: Lang): void`：写入 `localStorage` 的 `up-lang`，同时设置 `document.documentElement.lang`
  - `t(key: string): string`：key 缺失时抛错（测试里会捕获到）
  - `pick(b: Bilingual): string`
  - `Route = {name:'origins'} | {name:'overview'; age?: number} | {name:'person'; id: PersonId} | {name:'guess'} | {name:'questions'; film?: FilmId; person?: PersonId; theme?: string; q?: string; open?: string} | {name:'compare'; a?: PersonId; b?: PersonId}`
  - `parseRoute(hash: string): Route`：默认路由是 `origins`，无效的 id 也回到 `origins`
  - `toHash(r: Route): string`
  - `loadDataset(): Dataset`：用 `import.meta.glob(..., {eager:true})` 读取 `/data/**/*.json`
  - `buildIndex(ds: Dataset): DataIndex`，提供：
    - `person(id)`、`film(id)`、`films`（按年龄排序）
    - `peopleOrdered`（先按分组的 `order`，再按 `people.json` 中的顺序）
    - `state(personId, filmId): StateRow`、`final(personId)`
    - `questionsByFilm`、`questionsByPerson`
    - `theme(id)`、`source(id)`
  - `<Bi text={Bilingual} original?={string}>`：中文模式显示 `zh`，并且有 `original` 时把它放进 `title`；英文模式显示 `en`。
- [ ] **Step 1:** 写失败测试：
  - `route.test.ts`：`parseRoute('#/person/nick')` → `{name:'person', id:'nick'}`；`'#/person/zzz'` → `origins`；`'#/questions?film=f28&q=cab'` 往返转换后不变；`''` → `origins`
  - `shell.test.ts`：
    - 渲染 `App` 后点击 `EN`，导航文字变成 `Origins / Overview / Guess / Questions / Compare`，并且 `localStorage['up-lang'] === 'en'`
    - 刷新以后保持英文
    - 遍历 `ui.json` 的每个 key，`t()` 都不抛错（对应 Review Focus 2）
- [ ] **Step 2:** 运行这些测试，期望结果是 FAIL。
- [ ] **Step 3:** 实现。导航条的结构和草图 2 一致：`缘起 · 总览 · 猜一猜 · 问题库 · 对比`，右侧放中 / EN 开关。
- [ ] **Step 4:** 运行测试，期望结果是 PASS。用 `npm run dev` 手动打开页面，确认切换 hash 能换页。
- [ ] **Step 5:** 提交，提交信息为 `feat: i18n, router, app shell`。

### Task 4: 总览（生命线、年龄游标、分组高亮、表格视图）

**Files:**
- Create: `src/lib/viz/lifeline.ts`、`src/lib/states.ts`、`src/styles/tokens.css`
- Create: `src/components/Lifelines.svelte`、`src/components/AgeSlider.svelte`、`src/components/StateChips.svelte`、`src/components/LifelineTable.svelte`
- Create: `src/views/Overview.svelte`
- Test: `tests/unit/lifeline.test.ts`、`tests/unit/states.test.ts`、`tests/components/overview.test.ts`

**Interfaces:**
- Produces（`lifeline.ts`）：`layoutLifelines(people: Person[], films: Film[], groups: Group[], opts: {width:number; labelWidth:number; rowHeight:number; groupGap:number; top:number}): LifelineLayout`，返回
  `{height; xOf(i:number):number; rows: Array<{personId; groupId; y; markers: Array<{filmId; x; kind:'present'|'absent'|'special'}>; segments: Array<{x1; x2; style:'solid'|'faded'}>; death?: {x; label:string}}>}`。规则如下：
  - 相邻两部片之间的线段：任一端是 `deceased` 就不画；任一端是 `absent` 或 `footage_only` 就画成 `faded`；其余画成 `solid`。
  - 标记：`present` 对应 `present`；`absent` 和 `footage_only` 对应 `absent`；`audio_only` 和 `archival_interview` 对应 `special`；`deceased` 不画标记。
  - 去世标记的横坐标按年份插值：`x = xOf(i) + (xOf(i+1)-xOf(i))·(去世年份-year_i)/(year_{i+1}-year_i)`，标签是 `† YYYY`。
- Produces（`states.ts`）：
  - `cellView(idx, personId, filmId, dim: DimKey): CellView`，其中 `CellView = {kind:'text'; text:Bilingual; sourceIds; questionIds?} | {kind:'not_found'} | {kind:'participation'; p: Participation; note?: Bilingual}`
  - `chipSummary(idx, personId, filmId): CellView`：出镜状态不是 `present`、`audio_only`、`archival_interview` 时，返回 `participation`；否则依次取 `work`、`family`、`residence` 中第一个是 `confirmed` 的维度；都没有的话返回 `not_found`。
- [ ] **Step 1:** 写失败测试：
  - `lifeline.test.ts`（使用 `makeFixture`）：
    - `charles segments f21→f28 … f63→f70 are faded, f07→f21 solid`
    - `charles f70 marker is special`
    - `lynn has no segment after f56 and no marker at f63/f70`
    - `suzy f63 marker is absent and segments f56→f63, f63→f70 are faded`
    - `lynn death.x is strictly between xOf(7) and xOf(8) and label '† 2013'`
    - `nick death.x between xOf(8) and xOf(9)`
    - `groups separated by groupGap`
  - `states.test.ts`：
    - `chipSummary charles f35 → participation absent`
    - `chipSummary lynn f70 → participation deceased`
    - `nick f70 → not_found when no confirmed dims`
- [ ] **Step 2:** 运行测试，期望结果是 FAIL。实现 `lifeline.ts` 和 `states.ts`，再运行，期望结果是 PASS。
- [ ] **Step 3:** 写组件测试 `overview.test.ts`：
  - 把滑杆设到 `f35`，Charles 的卡片显示 `t('status.absent')`
  - 设到 `f70`，Lynn 的卡片显示"已去世"
  - 点击分组图例中的 `east`，其他分组各行的 `opacity` 是 `0.25`
  - 切换到表格视图后，出现 `<table>`，有 14 行 × 10 列
  - 悬停标记时，提示文字包含人名、年龄、片名和出镜状态
  - 点击人名，路由变成 `#/person/<id>`
- [ ] **Step 4:** 实现组件。生命线的视觉照草图 1 的方案 A：
  - 线宽 2px；实心点的半径为 5，外面套一圈 2px 的背景色描边
  - 空心点和 `faded` 线段的透明度为 0.28
  - `special` 画成菱形
  - 游标是一个半透明的竖条
  - 颜色按 `Group.colorVar` 取；文字用墨色

  滑杆的值同步到路由参数 `age`。生命线的外层容器设 `overflow-x: auto`，SVG 最小宽度 720px，这样在手机上可以横向滚动。运行测试，期望结果是 PASS。
- [ ] **Step 5:** 提交，提交信息为 `feat: overview lifelines with age cursor`。

### Task 5: 个人页

**Files:**
- Create: `src/views/Person.svelte`、`src/components/SourceList.svelte`、`src/components/QA.svelte`
- Test: `tests/components/person.test.ts`

**Interfaces:**
- Consumes: `cellView`、`buildIndex`、`<Bi>`
- Produces:
  - `<SourceList ids={string[]}>`：每个来源渲染成"出版方 · 标题"。非 film 来源带链接；film 来源显示片名和 `locator`。
  - `<QA q={Question} showQuote={boolean}>`：显示问题原文 / 译文，以及 `answerSummary`；`showQuote` 为真并且有 `answerQuote` 时，显示原话摘录。
- [ ] **Step 1:** 写失败测试：
  - `nick page shows header tags (group, background, † 2023-07-23)`
  - `charles f35 row shows "未出镜" and its participationNote if present`
  - `not_found dim renders "未查到"`
  - `confirmed dim renders text + source list`
  - `confirmed dim with questionIds links to #/questions?open=<id>`
  - `final summary section rendered; when final null shows "未查到"`
  - `EN toggle switches all dims`
- [ ] **Step 2:** 运行测试，期望结果是 FAIL。实现页面：顶部是人名、标签和这个人自己的那一条生命线（复用 `Lifelines` 组件，只传一个人）；下面按 10 个年龄往下排，每个年龄是六个维度的网格，再加上 `questionsByPerson` 里属于这部片的问答；最后是"最终"小结。再运行测试，期望结果是 PASS。
- [ ] **Step 3:** 提交，提交信息为 `feat: person page`。

### Task 6: 两人对比

**Files:**
- Create: `src/views/Compare.svelte`
- Test: `tests/components/compare.test.ts`

**Interfaces:**
- Consumes: `cellView`、`<SourceList>`
- [ ] **Step 1:** 写失败测试：
  - 初始路由 `#/compare?a=andrew&b=charles` 时，渲染出 6 个维度 × 2 人 = 12 行，每行 10 格
  - Charles 在 `f28` 到 `f63` 的格子带 `.off` 样式类，显示"缺席"
  - 换掉其中一个人以后，路由同步更新
  - 选择框里不能选到另一侧已经选中的人
- [ ] **Step 2:** 实现：用 `table-layout: fixed`；点开某一格时，展开 `SourceList`。运行测试，期望结果是 PASS。
- [ ] **Step 3:** 提交，提交信息为 `feat: compare view`。

### Task 7: 字幕抓取和候选问句提取脚本

**Files:**
- Create: `scripts/transcripts/sources.ts`、`scripts/transcripts/fetch.ts`、`scripts/transcripts/parse.ts`、`scripts/transcripts/extract.ts`
- Test: `tests/unit/extract.test.ts`、`tests/fixtures/subtitlecat-sample.html`（只截取不超过 20 行台词）

**Interfaces:**
- Produces:
  - `TRANSCRIPTS: Array<{filmId: FilmId; part: number; source: 'subtitlecat'|'springfield'|'stockq'; url: string}>`，内容来自设计 §4：
    - 主字幕站：*Seven Up!* 单片、7 到 63 岁合集 01 到 09（对应 `f07` 到 `f63`）、*63 Up* 第 1 到 3 集、*70 Up* 第 1、2 集
    - 第二个字幕站：*7 Plus Seven* 到 *56 Up*
    - 第二个字幕站的镜像站（实施时确认与第二个字幕站内容相同，未抓取）
  - `parseSubtitlecat(html: string): string[]`：取出"Original subtitles"区块里的每一行
  - `parseSpringfield(html: string): string[]`
  - `collapseRepeats(lines: string[]): string[]`：删掉和上一行完全相同的行
  - `joinCues(lines: string[]): string[]`：一行不是以 `. ? ! … ♪` 或右引号结尾时，并入下一行
  - `findQuestions(sentences: string[], window = 3): Candidate[]`，其中 `Candidate = {i: number; text: string; before: string[]; after: string[]}`。只收以 `?` 结尾的句子，排除全大写的音效描述，比如 `LAUGHTER`。
  - `markRecaps(byFilm: Record<FilmId, Candidate[]>): Record<FilmId, Array<Candidate & {recapOf?: FilmId}>>`：按规范化文本（转小写、去掉标点）比较。如果某个候选在更早的影片里也出现过，就记下它最早出现的影片。
  - CLI：
    - `node scripts/transcripts/fetch.ts <rawDir>`：每个来源写到 `<rawDir>/<source>/<filmId>-p<part>.html`，已经存在的文件跳过；两次请求之间至少间隔 2 秒
    - `node scripts/transcripts/extract.ts <rawDir>`：写出 `<rawDir>/candidates/<filmId>.json`
- [ ] **Step 1:** 先手动抓一个 subtitlecat 页面，放到 `~/workspace/up-series-raw/subtitlecat/`，看清楚"Original subtitles"区块的 HTML 结构。截取不超过 20 行做成测试夹具，并把台词换成自己编的句子，避免把原片内容带进项目。
- [ ] **Step 2:** 写失败测试：
  - `parseSubtitlecat(fixture)` 返回的行数和夹具里的台词行数一致
  - `collapseRepeats(['a','a','b','a'])` → `['a','b','a']`
  - `joinCues(['Do you never feel','you should?','Yes.'])` → `['Do you never feel you should?','Yes.']`
  - `findQuestions` 能把 `'Aren\'t you worth more than this?'` 识别成候选，`before` 和 `after` 各有 3 句；`'LAUGHTER?'` 不收
  - `markRecaps`：同一句话同时出现在 `f21` 和 `f28` 时，`f28` 那一条标记 `recapOf:'f21'`
- [ ] **Step 3:** 实现，再运行测试，期望结果是 PASS。
- [ ] **Step 4:** 运行 `fetch.ts`，再运行 `extract.ts`。把每部片的候选数量和原始行数报告出来，写进 `<rawDir>/candidates/REPORT.md`。哪个来源打不开，就把这部片的 `Film.transcriptCoverage` 改成 `partial` 或 `none`，并通知用户。
- [ ] **Step 5:** 确认 `git status` 里没有任何 raw 文件，然后提交，提交信息为 `feat: transcript fetch and question candidate extraction`。

### Task 8: 问题标注、主题和核对（子代理工作）

**Files:**
- Create: `scripts/prompts/annotate-questions.md`、`scripts/prompts/verify-questions.md`
- Create: `data/questions/<filmId>.json`（10 个）、`data/themes.json`、`data/sources/films.json`（每部片一个 `kind:'film'` 的来源）

**Interfaces:**
- Consumes: `<rawDir>/candidates/<filmId>.json`，Task 1 的 `Question` 和 `Theme` 类型
- Produces: 通过校验的 `Question[]` 和 `Theme[]`。问题 id 的格式是 `<filmId>-<三位序号>`，例如 `f28-014`。
- [ ] **Step 1:** 写 `annotate-questions.md` 模板，交给每个影片的子代理。规则逐条写清楚：
  - 只保留采访者提出的问题。孩子之间的互相提问、旁白里的设问，都不收。
  - `personId` 只有在上下文能确定时才填，`attribution` 写 `confirmed`；否则填 `null`，`attribution` 写 `film_only`。
  - 回放片段：只有能从上下文确定它最初出自哪部片时，才归到那一部；否则 `filmId` 填当前这部片，`fromRecap` 设为 `true`。
  - `zh` 写忠实的中文译文。`answerSummary` 用我们自己的话转述，中英各一句。
  - `answerQuote` 只给三类问答：用作某条状态证据的、*Seven Up!* 里给猜一猜用的、缘起页上的代表性问题。必须遵守 Global Constraints 里的上限。
  - `locator` 格式为"第几集 · 人物段落"。
  - `themeIds` 从初始主题表里选：`education`、`work`、`money_class`、`love_marriage`、`children_next_gen`、`home_place`、`happiness_regret`、`health_mortality`、`faith_values`、`the_series`、`childhood_play`。主题表可以增加，但要在报告里说明理由。
- [ ] **Step 2:** 并行派出 10 个子代理，每部片一个，各自按模板产出 `data/questions/<filmId>.json`。然后运行 `npm run validate`，期望输出 `OK`。
- [ ] **Step 3:** 写 `verify-questions.md`，按这个模板派一个独立的核对子代理：每部片随机抽 15%，至少 10 条，回到原始字幕的上下文里核对提问对象、影片归属、译文和转述。如果某部片的错误率超过 5%，这部片打回 Step 2 重做；错误率不超过 5% 的，改正错误的那几条。核对结果写进 `<rawDir>/candidates/VERIFY.md`。
- [ ] **Step 4:** 写 `themes.json`，为每个主题写 `intent`：
  - 能找到出处的写 `sourced`，例如引用设计 §5 里 Apted 在 Writers Bloc 访谈中的原话（要先打开页面复核原话，再记下日期或"日期不详"）。
  - 其余写 `interpretation`。
- [ ] **Step 5:** 运行 `npm run validate`，期望输出 `OK`。然后统计问题总数、`confirmed` 和 `film_only` 的比例、`fromRecap` 的数量，报告给用户，再提交，提交信息为 `data: annotated question bank and themes`。

### Task 9: 问题库页面

**Files:**
- Create: `src/lib/questions.ts`、`src/views/Questions.svelte`
- Test: `tests/unit/questions.test.ts`、`tests/components/questions.test.ts`

**Interfaces:**
- Produces:
  - `normalize(s: string): string`：NFKC 规范化，转小写，去掉中英文标点，合并空白
  - `filterQuestions(qs: Question[], f: {filmIds?: FilmId[]; personIds?: PersonId[]; themeIds?: string[]; query?: string}): Question[]`。规则：
    - `personIds` 非空时，排除 `personId === null` 的问题
    - `query` 同时匹配 `normalize(en)` 和 `normalize(zh)`
    - 结果按影片年龄排序，同一部片里按 id 排序
  - `relatedQuestions(q: Question, all: Question[]): Question[]`：同一个人（要求 `personId` 不为 null）、至少共享一个主题、来自其他影片的问题，按年龄排序
- [ ] **Step 1:** 写失败测试：
  - `questions.test.ts`：
    - `query 'CABBIE?' matches en 'What does it take to be a good cabbie?'`
    - `query '出租车' matches its zh`
    - `person filter excludes film_only`
    - `film filter includes film_only`
    - `related excludes same film and null person`
  - `questions.test.ts`（组件）：
    - 没有搜索结果时显示 `t('questions.empty')`
    - `film_only` 的问题显示"只归到影片"标签，`fromRecap` 的问题显示"来自回放"标签
    - 左侧的影片筛选里，每部片都显示收录情况：完整 / 部分 / 未收录
    - 在筛选状态下切换 EN，筛选条件保持不变，列表文字变成英文
    - 路由 `#/questions?theme=work` 打开时，已经选中 work 主题
    - 路由 `#/questions?open=f28-014` 打开时，这条问题已经展开，并且滚动到可见位置
- [ ] **Step 2:** 运行测试，期望结果是 FAIL。实现页面（布局照草图 2 的 ④）：筛选条件同步到路由；列表用"显示更多"分批渲染，每批 50 条。再运行测试，期望结果是 PASS。
- [ ] **Step 3:** 提交，提交信息为 `feat: question library`。

### Task 10: 人物各年龄状态和最终状态的研究与核对（子代理工作）

**Files:**
- Create: `scripts/prompts/research-person.md`、`scripts/prompts/verify-states.md`
- Modify: `data/states/<personId>.json`（14 个）
- Create: `data/sources/person-<personId>.json`（14 个）

**Interfaces:**
- Consumes: Task 8 的问题 id，用来写 `questionIds` 证据链接；Task 2 生成的状态骨架
- Produces: 每个人的 `rows`（六个维度）和 `final`，全部通过校验

- [ ] **Step 1:** 请用户把以下文章的正文贴进来，存到 `~/workspace/up-series-raw/pasted/`：Guardian 的两篇（2026-09-15 影评、2026-09-07 终章长文）、Independent 的 *70 Up* 影评、Slant 2019 年的访谈。用户不提供的话，在 `REPORT` 里记下"未获取"，然后继续。引用这些文章时，`Source.url` 照常填文章的链接。
- [ ] **Step 2:** 写 `research-person.md` 模板，规则如下：
  - 只写有出处的内容；查不到就写 `not_found`；不推断。
  - 缺席的格子只能在 `events` 里写回顾性的信息，并注明"事后得知"。
  - 片中的问答可以作为证据：写进 `questionIds`，`sourceId` 用对应影片的来源。
  - `final` 的规则：按设计 §8"最终状态"那一条来定。
  - 来源打不开时记下来，不绕过。
- [ ] **Step 3:** 并行派出 14 个子代理，每人一个，各自写 `states/<id>.json` 和 `sources/person-<id>.json`。完成后运行 `npm run validate`，期望输出 `OK`。
- [ ] **Step 4:** 写 `verify-states.md`，派一个独立的核对子代理：逐条打开所有 `confirmed` 事实的出处，核对内容是否属实。不属实的改成 `not_found`，或者改成正确的内容并附上出处。核对结果写进 `<rawDir>/VERIFY-states.md`。
- [ ] **Step 5:** 运行 `STRICT_FINALS=1 npm run validate`，期望输出 `OK`。在 `package.json` 的 `validate` 脚本里固定加上 `STRICT_FINALS=1`。把每人每部片的 `not_found` 数量报告给用户，再提交，提交信息为 `data: researched states and finals`。

### Task 11: 缘起页

**Files:**
- Modify: `data/origins.json`、`data/sources/core.json`
- Create: `src/views/Origins.svelte`
- Test: `tests/components/origins.test.ts`

**Interfaces:**
- Consumes: `OriginsContent`、`Theme[]`、`<SourceList>`
- [ ] **Step 1:** 写 `origins.json`。各个区块：
  - 耶稣会格言（`quote`）
  - 片头原话（`quote`，出处是 *Seven Up!* 这部片 + `locator`）
  - "当时的假设"（`fact`）
  - Apted 关于选人、提问方式和不再预测的原话（`quote`，出处是 Writers Bloc 和 Slant 的访谈，需要先复核原话）
  - 系列怎么从一部片变成十部的来龙去脉（`fact`）
  - 我们的总结（`interpretation`）

  每个区块都要有 `sourceIds`（`interpretation` 除外）。
- [ ] **Step 2:** 写失败测试：
  - 显示 10 部片的时间条，每部有年龄、年份和导演，第 10 部的导演是 `Asif Kapadia`
  - `interpretation` 区块显示"解读"徽标
  - 每张主题卡都显示 `intentKind` 对应的徽标；点击后路由变成 `#/questions?theme=<id>`
  - 切换 EN 后，格言显示英文原文
- [ ] **Step 3:** 实现（布局照草图 2 的 ①），再运行测试，期望结果是 PASS。
- [ ] **Step 4:** 提交，提交信息为 `feat: origins page`。

### Task 12: 猜一猜

**Files:**
- Create: `src/lib/guess.ts`、`src/views/Guess.svelte`
- Test: `tests/unit/guess.test.ts`、`tests/components/guess.test.ts`

**Interfaces:**
- Produces:
  - `GuessRound = {personId; background: Bilingual; groupId; prompt: Question|null; options: Array<{personId; text: Bilingual}>; correct: number}`
  - `makeRng(seed: number): () => number`（mulberry32）
  - `buildRound(personId, idx: DataIndex, rng): GuessRound`。规则：
    - `prompt` 取这个人在 `f07` 里 `attribution:'confirmed'` 并且有 `answerQuote` 的第一条问题，没有就设为 `null`
    - `options` 是这个人的 `final` 加上随机选的另外两个人的 `final`，三个选项互不相同，顺序随机打乱
    - `final` 为 null 的人不能拿来做干扰项
  - `roundOrder(idx, rng): PersonId[]`：14 个人随机排序
  - `GuessState = {order; i; answers: Array<{personId; chosen: number; correct: boolean}>}`，存在组件里，切换语言时不重置
- [ ] **Step 1:** 写失败测试：
  - `guess.test.ts`：
    - `options are 3 distinct people incl. the target`
    - `correct index points at target final`
    - `same seed → same round`
    - `prompt null when no confirmed f07 quote`
    - `lynn round uses her final (asOf f56) and shows deceased note`
  - `guess.test.ts`（组件）：
    - 作答前看不到名字，揭晓后显示名字并链接到个人页
    - 揭晓时生命线的线段依次出现，测试里用 `vi.useFakeTimers` 推进时间
    - 答到第 3 轮时切换 EN，得分和当前轮次都不变，文字变成英文
    - 全部答完显示"猜中 N / 14"的总结
- [ ] **Step 2:** 运行测试，期望结果是 FAIL。实现（布局照草图 2 的 ③）：`prompt` 为 null 时，显示"7 岁时的原话未能确认"；系统设置了 `prefers-reduced-motion` 时，揭晓直接显示，不播放逐段动画。再运行测试，期望结果是 PASS。
- [ ] **Step 3:** 提交，提交信息为 `feat: guess game`。

### Task 13: 配色校验、深色模式、单文件构建和离线检查

**Files:**
- Modify: `src/styles/tokens.css`、`vite.config.ts`
- Create: `scripts/check-dist.ts`
- Test: `tests/unit/check-dist.test.ts`

**Interfaces:**
- Produces: `checkDist(html: string): string[]`，返回发现的问题列表。以下情况都算问题：
  - 有 `src` 或 `href` 指向 `http(s)://` 的 `<script>`、`<link>`、`<img>`
  - 出现 `@import url(http`
  - 出现 `fetch(`
  - 出现三个字幕网站中任何一个的域名

  正文里的超链接 `<a href>` 允许指向外部网址。
- [ ] **Step 1:** 用 dataviz 技能自带的配色校验脚本检查颜色：先运行 `node <dataviz>/scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4" --mode light`，再对深色那组颜色加 `--mode dark` 运行一次。期望结果是没有 FAIL。出现 contrast WARN 的话，按 relief rule 处理：生命线上已经直接标了人名，再加上表格视图，以此作为补救，并把这一点写进 README。
- [ ] **Step 2:** 在 `tokens.css` 里加上 `@media (prefers-color-scheme: dark)` 和 `:root[data-theme="dark"]` 两套深色变量，取值见 Global Constraints。
- [ ] **Step 3:** 写失败测试 `check-dist.test.ts`：
  - `<script src="https://x">` → 报出问题
  - `<a href="https://www.theguardian.com/...">` → 不报
  - 包含 `subtitlecat` → 报出问题
- [ ] **Step 4:** 实现 `checkDist`。在 `vite.config.ts` 里启用 `viteSingleFile()`，字体只用系统字体栈。`build` 脚本改成 `npm run validate && vite build && node scripts/check-dist.ts dist/index.html`。运行 `npm run build`，期望结果是 `dist/` 里只有 `index.html`，并且 `check-dist` 输出 `OK`。
- [ ] **Step 5:** 离线验收。用 `firefox --headless --screenshot` 打开 `file:///…/dist/index.html#/overview`，以及 `#/person/charles`、`#/guess`、`#/questions?q=cabbie`、`#/compare?a=lynn&b=nick`，逐一截图检查：标签有没有互相遮挡、有没有溢出、缺席和去世的显示对不对（对应 Review Focus 1 和 4）。截图存到 `/tmp`，不放进项目。
- [ ] **Step 6:** 写 `README.md`。说明怎么打开，以及数据来源和版权的处理方式：只放问题原文和转述，原话摘录有上限，不放字幕全文。另外说明译文由 AI 翻译，并列出已知的缺口，比如 `not_found` 的统计、拿不到的报道。同样的说明写进 `ui.json` 的 `about.*` 几个 key，显示在应用页脚的"关于"段落里（设计 §8）。加一个组件测试：页脚包含 `t('about.translation')`。然后提交，提交信息为 `build: single-file offline bundle, dark mode, dist checks`。
