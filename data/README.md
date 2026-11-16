# 数据说明 · Data dictionary

网站的全部内容都在这个文件夹里，构建时打包进 `dist/index.html`。每次修改都由 `src/lib/data/validate.ts` 检查（`npm run validate`），不通过就不能构建。普通的修改不需要直接编辑这些文件——在网站上点 ✎ 即可，见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

Everything the site shows lives here and is bundled into `dist/index.html` at build time. Every change is checked by `src/lib/data/validate.ts` (`npm run validate`); the build fails if it doesn't pass. Most changes don't need these files edited by hand — click ✎ on the site; see [CONTRIBUTING.md](../CONTRIBUTING.md).

## 文件 · Files

| 文件 · File | 内容 · Contents |
|---|---|
| `people.json` | 14 个人：名字、全名、1964 年的出身分组和背景、生卒、每部片的出镜情况（及说明）、出处 · The 14 people: names, origin group and background in 1964, born/died, participation in each film (with notes), sources |
| `states/<人 person>.json` | 这个人每部片 6 个维度的状态（`rows`），以及最终状态（`final`） · Their state in 6 dimensions for each film (`rows`), and their final state (`final`) |
| `questions/<片 film>.json` | 这部片里导演问过的问题：英文原文、中文译文、提问对象、主题、回答要点、原话、出处和段落 · The film-makers’ questions in that film: English original, Chinese translation, who was asked, themes, answer in brief, quote, source and segment |
| `sources/*.json` | 出处。`films.json` 是十部影片本身；`core.json` 是通用资料；`person-<人>.json` 是关于某个人的资料 · Sources: `films.json` is the ten films; `core.json` general sources; `person-<person>.json` sources about one person |
| `films.json`、`groups.json`、`themes.json`、`origins.json` | 影片、出身分组（及颜色）、问题主题、缘起页 · Films, origin groups (and colours), question themes, the Origins page |
| `ui.json` | 界面文字（中 / 英） · Interface text (Chinese / English) |

人物 id：`andrew charles john suzy bruce jackie lynn sue tony paul symon nick peter neil`；影片 id：`f07 f14 f21 f28 f35 f42 f49 f56 f63 f70`（数字是拍摄时的年龄）。

Person ids as above; film ids `f07`…`f70` (the number is the age at filming).

## 状态 · States

每个格子（人 × 片 × 维度）是下面三种之一 · Each cell (person × film × dimension) is one of:

- `confirmed`：有出处的事实，必须有 `text`（中英）和至少一个 `sourceIds`；可以有 `questionIds`（片中问答作为证据）。 A sourced fact: `text` in both languages and at least one source; optionally `questionIds` (questions in the film as evidence).
- `not_found`：查过，没查到。页面显示“未查到”。 Looked for, not found; shown as “Not found”.
- `not_applicable`：不适用（例如本人缺席或已去世），需要 `reason`。 Doesn’t apply (absent or deceased), with a `reason`.

维度 · Dimensions：`education` 教育、`work` 工作、`family` 婚姻与家庭、`residence` 居住地、`events` 重大事件、`outlook` 本人看法。

出镜情况 · Participation：`present` 出镜、`absent` 未出镜、`audio_only` 仅录音和照片、`archival_interview` 生前录制的访谈、`footage_only` 只出现在旧片段中、`deceased` 已去世。`absent`、`footage_only`、`deceased` 的那一部，只有 `events` 可以是 `confirmed`。

## 记录地址 · Record addresses

网站、issue 表单、机器人和 PR 摘要都用同一种地址指称一条记录 · The site, the issue form, the bot and the PR summaries all name a record the same way:

| 地址 · Address | 记录 · Record | 文件 · File |
|---|---|---|
| `state/andrew/f35/work` | 一个格子 · one cell | `states/andrew.json` |
| `participation/charles/f28` | 某部片的出镜情况 · participation in one film | `people.json` |
| `person/lynn` | 全名、背景、生卒、出处 · full name, background, dates, sources | `people.json` |
| `final/nick` | 最终状态 · final state | `states/nick.json` |
| `question/f35-001` | 一个问题 · one question | `questions/f35.json` |
| `source/wiki-up-series` | 一个网页出处 · one web source | `sources/*.json` |

## 规则 · Rules (enforced by the validator)

- 出处 · Sources：每条已确认的事实都要有能找到的出处；网页出处要有 http(s) 地址，影片出处不能有地址；页面和数据里不能出现字幕网站。 Every confirmed fact cites sources that exist; web sources need an http(s) URL, film sources none; subtitle sites must not appear anywhere.
- 版权 · Copyright：回答用自己的话转述（`answerSummary`）；原话（`answerQuote`）每条最多两句，每人每部片最多 3 条。 Answers are paraphrased; quotes are at most two sentences, three per person per film.
- 中英 · Languages：所有文字都要有中文和英文。 All text in both Chinese and English.
- 匿名 · Anonymous：1964 年的背景和最终状态不能写出任何人的名字（“猜一猜”匿名使用）。 Backgrounds and final states name nobody (used anonymously in the guess game).
- 格式 · Format：2 个空格缩进的 JSON，文件末尾一个换行；机器人按这个格式写回，只改动被修改的那几行。 2-space JSON with a trailing newline; the bot writes this format, so only the edited lines change.
