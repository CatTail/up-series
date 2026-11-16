# 参与修改 · Contributing

网站上的每一条事实都来自 `data/` 里的数据。发现错误，或者知道某个“未查到”的格子该填什么，都可以提出修改；有人审核通过后，网站会自动更新。不需要会写代码，但需要一个 GitHub 账号。

Every fact on the site comes from the data in `data/`. If you spot an error, or know what belongs in a “Not found” cell, you can suggest a change; once someone reviews and approves it, the site updates by itself. No coding needed — just a GitHub account.

[中文](#中文) · [English](#english)

---

## 中文

### 提出修改（任何人）

1. **找到那条记录。** 在[网站](https://cattail.github.io/up-series/)的人物页、问题库（展开一条问题）或总览（点开一张卡片）上，每条记录旁边都有一个 **✎**。“未查到”的格子显示 **✎ 补充**。[数据页](https://cattail.github.io/up-series/#/data)列出了所有待补充的格子。
2. **点 ✎。** 右侧会打开一个面板：上面是这条记录现在的数据（中英文、出处、记录地址，以及它在 GitHub 上的数据文件）；下面是已经填好当前内容的表单。
3. **改正内容。** 按需要修改文字、状态或出处，写一句**说明**（哪里不对，你是怎么知道的）。面板会当场检查，用普通的话告诉你还缺什么，并显示修改前后的对比。
4. **在 GitHub 上提交。** 点 **在 GitHub 上提交**，会打开一个已经填好的 GitHub 页面，检查一下再点提交。没有 GitHub 账号的话，可以点 **复制建议内容**，用其他方式发给维护者。

提交之后：审核者核对出处 → 加上 `accepted` 标签 → 机器人开一个 pull request → 审核者批准并合并 → 网站自动更新。你会在 issue 里收到通知，合并的提交也会署上你的名字。

**规则**（面板会帮你检查大部分）：

- 每条“有出处的事实”至少要有一个出处：影片本身，或者公开网页（新闻、访谈、维基百科等）。查不到就保持“未查到”，不要推测。
- **不要使用字幕网站**作为出处。
- 回答用自己的话转述。原话摘录每条最多两句，每人每部片最多 3 条。
- 中文和英文都要写；只会写一种的话，勾选“请审核者帮忙翻译”。
- 本人没有出镜的那一部，只能在“重大事件”里写事后得知的事。
- 1964 年的背景和最终状态会在“猜一猜”里匿名出现，不能写出任何人的名字。

表单不能改的内容（漏收的问题、新增人物或影片、主题、缘起页、界面文字等），请用[其他问题](https://github.com/CatTail/up-series/issues/new?template=report.yml)表单告诉我们。

### 审核（维护者和受邀的审核者）

**审核一条建议（issue）：**

1. 打开带 `data-edit` 标签的 issue，看“修改前后”和“说明”。
2. 打开出处链接，确认它支持这句话；对照上面的规则。
3. 没问题就加上 **`accepted`** 标签。机器人会开一个 PR，并在 issue 里留言。如果它没能应用这条建议（例如记录在这期间已经改过），也会留言说明原因。

**审核 PR：**

1. PR 正文里有修改前后的表格和审核清单。
2. 机器人开的 PR，检查要等有写权限的人批准后才会运行：在 PR 合并区域的提示里批准运行（这是 GitHub 对机器人 PR 的规定）。
3. 检查通过后，在这次运行的 **Artifacts** 里下载 `index.html`，用浏览器打开就是改好之后的网站（离线也能用）。
4. 草稿 PR 表示检查没有通过（例如缺一种语言）：直接在 PR 里编辑文件补上，或者在 PR 里说明后关闭。
5. 批准（Approve）并合并，网站几分钟后自动更新。

### 直接改数据（会用 git 的人）

数据文件的结构见 [`data/README.md`](data/README.md)。改完运行：

```sh
npm install
npm run validate   # 数据校验（严格模式）
npm test
```

然后提一个 pull request。PR 的检查会运行测试和构建，并在任务摘要（job summary）里列出数据改动。

### 第一次设置（仓库所有者，只做一次）

1. Settings → Actions → General → Workflow permissions：勾选 **Allow GitHub Actions to create and approve pull requests**（个人仓库默认关闭；不勾的话机器人不能开 PR）。
2. 创建标签：`data-edit`、`accepted`、`needs-translation`。
3. （建议）在 Settings 里给 `main` 加分支保护或规则集（ruleset）：要求通过 PR 合并、至少 1 个批准、`Check pull request` 检查通过；允许所有者绕过，方便日常维护。
4. 要请别人一起审核，在 Settings → Collaborators 邀请他们成为协作者（个人仓库只有这一种权限：可以加标签、审核和合并），并加到 `.github/CODEOWNERS`。

---

## English

### Suggesting a change (anyone)

1. **Find the record.** On the [site](https://cattail.github.io/up-series/), every record on a person page, in the question library (open a question) or on the overview (open a card) has a **✎** next to it. “Not found” cells show **✎ Fill in**. The [Data page](https://cattail.github.io/up-series/#/data) lists every gap.
2. **Click ✎.** A panel opens on the right: at the top, the record as it is now (both languages, its sources, its address and its data file on GitHub); below, a form already filled in with the current values.
3. **Make the correction.** Change the text, status or sources, and say **why** (what is wrong and how you know). The panel checks as you type, tells you in plain words what is missing, and shows before and after.
4. **Submit on GitHub.** **Submit on GitHub** opens a pre-filled GitHub page; check it and submit. Without a GitHub account, use **Copy the suggestion** and send it to the maintainer another way.

What happens next: a reviewer checks the sources → adds the `accepted` label → a bot opens a pull request → the reviewer approves and merges → the site updates. You are notified on the issue, and the commit credits you as a co-author.

**Rules** (the panel checks most of them):

- Every sourced fact needs at least one source: the film itself, or a public web page (news, interview, Wikipedia…). If nothing can be found, leave it as “Not found” — no guessing.
- **No subtitle sites** as sources.
- Paraphrase answers. Direct quotes are at most two sentences, three per person per film.
- Write both Chinese and English; if you can only write one, tick “please translate the other”.
- For a film the person wasn’t in, only Key events (learned later) can hold a fact.
- Backgrounds (1964) and final states appear anonymously in the guess game, so they must not name anyone.

For things the form can’t change (a missing question, a new person or film, themes, the Origins page, interface text…), use the [Something else](https://github.com/CatTail/up-series/issues/new?template=report.yml) form.

### Reviewing (maintainer and invited reviewers)

**A suggestion (issue):**

1. Open an issue labelled `data-edit`; read “Before and after” and “Why”.
2. Open the source links and check they support the sentence; check the rules above.
3. If it is good, add the **`accepted`** label. The bot opens a pull request and comments on the issue — or explains why it couldn’t apply the suggestion (for example, the record changed in the meantime).

**A pull request:**

1. The PR description has the before → after table and a review checklist.
2. On PRs opened by the bot, checks wait until someone with write access approves them: approve the runs from the notice in the PR’s merge box (GitHub requires this for bot PRs).
3. When the checks pass, download `index.html` from the run’s **Artifacts** and open it in a browser: that is the site with the change (works offline).
4. A draft PR means a check failed (for example, a missing language): edit the file in the PR to fix it, or explain and close.
5. Approve and merge; the site updates a few minutes later.

### Editing the data directly (git users)

The file layout is described in [`data/README.md`](data/README.md). After editing, run:

```sh
npm install
npm run validate   # strict data validation
npm test
```

then open a pull request. The PR check runs the tests and the build, and lists the data changes in its job summary.

### One-time setup (repository owner)

1. Settings → Actions → General → Workflow permissions: tick **Allow GitHub Actions to create and approve pull requests** (off by default on personal repositories; without it the bot can’t open PRs).
2. Create the labels `data-edit`, `accepted` and `needs-translation`.
3. (Recommended) In Settings, protect `main` with a branch protection rule or a ruleset: require a pull request, at least one approval and the `Check pull request` check, with a bypass for the owner for routine maintenance.
4. To invite reviewers, add them under Settings → Collaborators (a personal repository has a single collaborator level: they can label, review and merge), and add them to `.github/CODEOWNERS`.
