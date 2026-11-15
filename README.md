# 人生七年 · 7 Up → 70 Up

用可视化的方式展示英国纪录片系列《人生七年》（Up 系列，*Seven Up!* 1964 → *70 Up* 2026）中 14 位人物从 7 岁到 70 岁的人生轨迹，以及导演在十部片里问过的问题。中 / EN 双语。

An interactive, bilingual (中文 / English) visualization of the fourteen lives followed by the *Up* documentary series, and of the questions the film-makers asked them.

## 打开方式 · How to open

- 在线版本 · Live: <https://cattail.github.io/up-series/>（每次推送到 `main` 由 GitHub Actions 自动测试、构建并发布到 GitHub Pages）
- 成品是一个文件：`dist/index.html`。双击用浏览器打开即可，不联网也能完整运行，也可以放到任何静态托管上。
- The deliverable is the single file `dist/index.html`. Open it directly (works from `file://`, makes no network requests) or host it anywhere static.

开发 · Development (Node 26):

```sh
npm install
npm test            # unit + component tests (Vitest)
npm run validate    # data validation (strict: every person needs a final state)
npm run build       # validate → vite build (single file) → check-dist
npm run dev         # local dev server
```

## 页面 · Pages

缘起（拍摄目的、导演原话、十部片时间条、问题主题）· 总览（14 条生命线 + 年龄游标、按出身分组高亮、表格视图）· 个人页（每个年龄六个维度 + 问答 + 出处 + 最终状态）· 猜一猜 · 问题库（筛选、中英搜索、同类问题）· 对比。

## 数据和出处 · Data and sources

- 所有事实在 `data/` 下的 JSON 里，构建时由 `src/lib/data/validate.ts` 强制检查：每条“已确认”的事实都必须有能解析到的出处；查不到的写 `not_found`，页面显示“未查到”；缺席或去世的年龄不能出现当期状态；解读必须标“解读”。校验不过，构建失败。
- 片中内容的出处写成“影片 · 段落”，指向影片本身；新闻、访谈、维基百科附原文链接。
- 资料由多个 AI 助手分头整理（问题标注 10 个、人物研究 14 个），再由独立的助手核对：问题按每部片 15% 随机抽查（至少 10 条，错误率超过 5% 的影片全量复核并修正）；人物状态的每一条“已确认”事实和每个“最终状态”都逐条打开出处核对。核对记录保存在工程外的原始资料目录。

## 版权处理 · Copyright

本站按公开网页的保守方式处理片中内容：

- 只收录导演提问的原文；回答用我们自己的话转述（`answerSummary`）。
- 原话摘录（`answerQuote`）只用于关键问答，每人每部片最多 3 条，每条不超过两句——由校验器强制。
- 不收录截图、视频或字幕全文。字幕只在本地用于提取问题，不进入工程、不发布；页面和数据中不出现任何字幕网站（`check-dist` 在构建时检查）。

## 翻译 · Translation

中文译文（问题、回答要点、摘录）由 AI 翻译，可能有不准确之处。中文模式下鼠标悬停在问答上可以看到英文原文。人名始终用英文原名。

## 已知缺口 · Known gaps

- **人物状态：** 14 人 × 10 个年龄 × 6 个维度 = 840 格，其中 545 格有出处，219 格未查到，76 格因缺席或去世不适用。
- **问题库：** 763 个问题，其中 618 个（81%）能确定提问对象；其余只归到影片。早期几部（*Seven Up!*、*7 Plus Seven*）按主题剪辑，确定提问对象的比例最低。网友字幕没有标注说话人，部分影片标点很差，可能有漏收的问题。
- ***Seven Up!* 的原话：** 14 人中有 9 人能确认 7 岁时的问答；John、Bruce、Lynn、Sue、Peter 没有，猜一猜里注明“未能确认”。
- **70 Up：** 2026 年 9 月才播出，公开资料少，70 岁一列的“未查到”较多。
- **打不开的来源：** The Guardian、The Independent、Slant 拒绝了抓取工具，没有绕过，这四篇文章由使用者提供原文；Radio Times、BBC、Telegraph 等部分网站也无法抓取，研究时也没有可用的搜索引擎，只能查已知网址。
- **来源之间的分歧**按保守方式处理，例如 Lynn 去世的月份只有维基百科给出，页面只写年份；Nick 最后一次访谈与去世的间隔各家说法不一（“数小时”与“三天”），页面写“不久”。

## 配色 · Colour

出身分组用 dataviz 参考调色板的前五个分类色，浅色、深色两套分别用校验脚本验证（色盲安全、相邻对比）。浅色模式下青绿、黄、品红三色与背景的对比度低于 3:1，按 relief rule 处理：生命线上直接标注人名，并提供表格视图；文字一律使用墨色，不用系列色。

## 声明 · Disclaimer

个人整理的可视化项目，与 ITV、BBC 及影片制作方没有关联。
