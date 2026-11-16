// Usage: node scripts/apply-suggestion.ts <event.json> [--data data] [--out dir] [--dry-run]
//
// Run by .github/workflows/suggestion.yml when a maintainer adds `accepted` to a `data-edit` issue.
// Reads the issue from the GitHub event file (never from the command line or the shell), takes the
// patch JSON the site put in it, applies it to the data files, validates the result and writes:
//   <out>/pr-title.txt, pr-body.md, commit-msg.txt, meta.json   (on success; data files are updated)
//   <out>/comment.md                                            (when the patch can't be applied; exit 1)
// The issue body is untrusted: the patch goes through the strict parser, and nothing from the body is
// copied into the PR except the validated change itself, rendered by our own code.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Files } from '../src/lib/data/address.ts'
import { labelOf, parseAddress } from '../src/lib/data/address.ts'
import { assembleDataset } from '../src/lib/data/assemble.ts'
import { diffFiles, toMarkdown } from '../src/lib/data/diff.ts'
import { buildIndex } from '../src/lib/data/index.ts'
import { applyPatch, parsePatch, serialize, type Patch } from '../src/lib/data/patch.ts'
import { readFilesFromDisk } from '../src/lib/data/read-node.ts'
import type { Bilingual, ValidationError } from '../src/lib/data/types.ts'
import { validateDataset } from '../src/lib/data/validate.ts'

export type IssueEvent = { issue: { number: number; body: string | null; user: { login: string; id: number } } }

const isPatchLike = (v: unknown) => !!v && typeof v === 'object' && (v as { v?: unknown }).v === 1

/** Every balanced {...} span in the text, outermost first (string-aware), for finding pasted JSON. */
function* objectSpans(text: string): Generator<string> {
  for (let i = text.indexOf('{'); i >= 0; i = text.indexOf('{', i + 1)) {
    let depth = 0
    let str = false
    for (let j = i; j < text.length; j++) {
      const c = text[j]
      if (str) {
        if (c === '\\') j++
        else if (c === '"') str = false
      } else if (c === '"') str = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) {
        yield text.slice(i, j + 1)
        break
      }
    }
  }
}

/**
 * The patch in the issue body: the JSON with `"v": 1` in a fenced code block (how the form renders the
 * 修改内容 field), or anywhere in the body if a contributor pasted it some other way.
 */
export function extractPatch(body: string): unknown | null {
  const blocks = [...body.matchAll(/```[a-z]*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g)].map((m) => m[1])
  for (const text of [...blocks, body]) {
    for (const span of objectSpans(text)) {
      try {
        const v = JSON.parse(span)
        if (isPatchLike(v)) return v
      } catch {
        /* not JSON */
      }
    }
  }
  return null
}

export type Outcome =
  | { ok: false; comment: string }
  | {
      ok: true
      changed: Record<string, string>
      title: string
      body: string
      commit: string
      draft: boolean
      labels: string[]
      problems: ValidationError[]
    }

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/

export function runSuggestion(event: IssueEvent, files: Files, opts: { today: string }): Outcome {
  const n = event.issue.number
  const ui = files['ui.json'] as Record<string, Bilingual>
  const tr = (k: string) => ui[k]?.zh ?? k
  const fail = (why: string): Outcome => ({
    ok: false,
    comment: [
      '这条建议没能自动转成 PR。 This suggestion could not be turned into a pull request automatically.',
      '',
      `> ${why}`,
      '',
      '请在网站上重新打开这条记录，再提交一次；或者由维护者手动修改。 Please reopen the record on the site and submit again, or a maintainer will make the change by hand.',
    ].join('\n'),
  })

  const raw = extractPatch(event.issue.body ?? '')
  if (!raw) return fail('没有找到“修改内容”里的 JSON。 No change JSON found in the issue.')
  const parsed = parsePatch(raw)
  if (!parsed.ok) return fail(`修改内容格式不对 / the change is malformed: ${parsed.error}`)
  const patch: Patch = parsed.patch
  const applied = applyPatch(files, patch, opts)
  if (!applied.ok) {
    const why = applied.error === 'conflict' ? '这条数据在建议提出之后已经改过了。 The record changed after the suggestion was made.' : applied.message
    return fail(why)
  }

  const before = validateDataset(assembleDataset(files), { strictFinals: true }).map((e) => `${e.code} ${e.path} ${e.message}`)
  const problems = validateDataset(assembleDataset(applied.files), { strictFinals: true }).filter((e) => !before.includes(`${e.code} ${e.path} ${e.message}`))
  const onlyLanguage = problems.length > 0 && problems.every((e) => e.code === 'MISSING_LANG')
  const label = labelOf(buildIndex(assembleDataset(applied.files)), parseAddress(patch.target)!, tr)
  const summary = toMarkdown(diffFiles(files, applied.files, tr, 'zh'), tr)
  const login = LOGIN.test(event.issue.user.login) ? event.issue.user.login : null
  const userId = Number.isInteger(event.issue.user.id) ? event.issue.user.id : null

  const checks = problems.length
    ? [
        '**检查没有通过 · Checks failed** — 合并前需要修正 / fix before merging:',
        ...problems.map((e) => `- \`${e.code}\` ${e.path}: ${e.message}`),
        ...(onlyLanguage && patch.needsTranslation ? ['', '提出者请审核者帮忙补上另一种语言。 The suggester asked the reviewer to add the other language.'] : []),
      ]
    : ['✓ 数据校验通过 · Validation passed']
  const body = [
    `来自 #${n} 的修改建议${login ? `，由 @${login} 提出` : ''}；说明见 issue。 Suggested in #${n}${login ? ` by @${login}` : ''}; see the issue for why.`,
    '',
    summary,
    '',
    ...checks,
    '',
    '**审核清单 · Review checklist**',
    '- [ ] 出处能打开，并且支持这句话 · The source opens and supports the sentence',
    '- [ ] 回答是转述；原话不超过两句 · Answers are paraphrased; quotes are at most two sentences',
    '- [ ] 中文和英文意思一致 · Chinese and English say the same thing',
    '- [ ] 没有字幕网站 · No subtitle sites',
    '- [ ] 下载 preview（index.html）打开看过 · Opened the preview (index.html) from the checks',
    '',
    `Closes #${n}`,
  ].join('\n')
  const title = `数据：${label}（#${n}）`
  const commit = [
    `data: ${label} (#${n})`,
    '',
    `Suggested in #${n}.`,
    ...(login && userId !== null ? ['', `Co-authored-by: ${login} <${userId}+${login}@users.noreply.github.com>`] : []),
    '',
  ].join('\n')
  const changed = Object.fromEntries(Object.entries(applied.changed).map(([k, v]) => [k, serialize(v)]))
  const labels = onlyLanguage && patch.needsTranslation ? ['needs-translation'] : []
  return { ok: true, changed, title, body, commit, draft: problems.length > 0, labels, problems }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const flag = (name: string, fallback: string) => {
    const i = args.indexOf(name)
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback
  }
  const eventPath = args.find((a, i) => !a.startsWith('--') && !['--data', '--out'].includes(args[i - 1]))
  if (!eventPath) {
    console.error('usage: node scripts/apply-suggestion.ts <event.json> [--data data] [--out dir] [--dry-run]')
    process.exit(2)
  }
  const dataDir = flag('--data', 'data')
  const out = flag('--out', '.suggestion')
  const dry = args.includes('--dry-run')
  mkdirSync(out, { recursive: true })
  const event = JSON.parse(readFileSync(eventPath, 'utf8')) as IssueEvent
  const r = runSuggestion(event, readFilesFromDisk(dataDir), { today: new Date().toISOString().slice(0, 10) })
  if (!r.ok) {
    writeFileSync(join(out, 'comment.md'), `${r.comment}\n`)
    console.error(r.comment)
    process.exit(1)
  }
  for (const [path, text] of Object.entries(r.changed)) {
    const p = join(dataDir, path)
    if (dry) console.log(`would write ${p}`)
    else {
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, text)
    }
  }
  writeFileSync(join(out, 'pr-title.txt'), `${r.title}\n`)
  writeFileSync(join(out, 'pr-body.md'), `${r.body}\n`)
  writeFileSync(join(out, 'commit-msg.txt'), r.commit)
  writeFileSync(join(out, 'meta.json'), `${JSON.stringify({ draft: r.draft, labels: r.labels, files: Object.keys(r.changed) })}\n`)
  console.log(r.title)
  if (r.problems.length) console.log(`${r.problems.length} validation problem(s); the PR will be a draft`)
}
