// The site, the issue form, the suggestion bot and the workflows must agree with each other.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractPatch, runSuggestion, type IssueEvent } from '../../scripts/apply-suggestion.ts'
import { FIELDS, issueUrl, LABELS, MAX_URL, patchJson, suggestionText, type Suggestion } from '../../src/lib/contribute.ts'
import { parseAddress } from '../../src/lib/data/address.ts'
import { hashValue, parsePatch, readTarget, type Patch } from '../../src/lib/data/patch.ts'
import realUi from '../../data/ui.json'
import { fixtureFiles } from '../fixtures/files.ts'

const root = join(__dirname, '../..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const ids = (yml: string) => [...yml.matchAll(/^\s+id:\s*([\w-]+)\s*$/gm)].map((m) => m[1])

/** In the repo the bot reads data/ui.json for its labels. */
const files = { ...fixtureFiles(), 'ui.json': realUi }
function suggestion(text = '事务律师', reason = '35 Up 里他自己说的。'): Suggestion {
  const target = 'state/andrew/f35/work'
  const p = parsePatch({ v: 1, target, base: hashValue(readTarget(files, parseAddress(target)!)), value: { status: 'confirmed', text: { zh: text, en: 'Solicitor' }, sourceIds: ['wiki-up'] } })
  if (!p.ok) throw new Error(p.error)
  return { title: '修改建议：Andrew · 35 Up · 工作 / 职业', target, summary: '| 内容 · 中文 | 律师 | 事务律师 |', patch: p.patch, reason }
}
/** The issue body GitHub builds from a link the site made: one heading per field, the patch as a json block. */
function issueFromLink(url: string): string {
  const q = new URL(url).searchParams
  return [
    `### 记录地址 · Record\n\n${q.get('target')}`,
    `### 修改前后 · Before and after\n\n${q.get('summary') ?? '_No response_'}`,
    `### 修改内容（自动生成，请不要改动）· Change (generated, please don't edit)\n\n\`\`\`json\n${q.get('patch')}\n\`\`\``,
    `### 说明 · Why\n\n${q.get('reason')}`,
    '### 确认 · Confirm\n\n- [X] 出处是公开网页或影片本身，不是字幕网站。',
  ].join('\n\n')
}
const event = (body: string, n = 7): IssueEvent => ({ issue: { number: n, body, user: { login: 'octocat', id: 583231 } } })

describe('the issue form', () => {
  it('has the fields the site fills in, and the label the bot looks for', () => {
    const yml = read('.github/ISSUE_TEMPLATE/data-edit.yml')
    for (const f of FIELDS) expect(ids(yml)).toContain(f)
    expect(yml).toMatch(new RegExp(`labels:\\s*\\["${LABELS.suggestion}"\\]`))
    expect(yml).toMatch(/id: patch\n(?:.*\n)*?\s+render: json/)
    expect(ids(read('.github/ISSUE_TEMPLATE/report.yml'))).toContain('page')
  })
})

describe('issue links', () => {
  it('carry the whole suggestion when it fits', () => {
    const { url, long } = issueUrl(suggestion())
    expect(long).toBe(false)
    expect(url.length).toBeLessThanOrEqual(MAX_URL)
    expect(JSON.parse(new URL(url).searchParams.get('patch')!)).toEqual(suggestion().patch)
  })

  it('drop the change when it would be too long for GitHub, keeping title, address and reason', () => {
    const s = suggestion('很长'.repeat(1500))
    const { url, long } = issueUrl(s)
    expect(long).toBe(true)
    expect(url.length).toBeLessThanOrEqual(MAX_URL)
    const q = new URL(url).searchParams
    expect(q.get('patch')).toBeNull()
    expect(q.get('target')).toBe('state/andrew/f35/work')
    expect(q.get('reason')).toBe(s.reason)
  })
})

describe('the suggestion bot', () => {
  it('turns an issue made from a site link into a reviewed change: files, PR text and credit', () => {
    const r = runSuggestion(event(issueFromLink(issueUrl(suggestion()).url)), files, { today: '2026-11-16' })
    if (!r.ok) throw new Error(r.comment)
    expect(Object.keys(r.changed)).toEqual(['states/andrew.json'])
    expect(r.changed['states/andrew.json']).toContain('"zh": "事务律师"')
    expect(r.title).toBe('数据：Andrew · 35 Up · 工作 / 职业（#7）')
    expect(r.body).toContain('| 内容 · 中文 | 律师 | 事务律师 |')
    expect(r.body).toContain('✓ 数据校验通过')
    expect(r.body).toContain('Closes #7')
    expect(r.body).toContain('@octocat')
    expect(r.commit).toContain('Co-authored-by: octocat <583231+octocat@users.noreply.github.com>')
    expect(r.draft).toBe(false)
  })

  it('never copies the issue’s own text into the pull request', () => {
    const body = issueFromLink(issueUrl(suggestion('事务律师', 'see https://evil.example and @everyone')).url)
    const r = runSuggestion(event(`${body}\n\n<!-- injected --> [click me](https://evil.example)`), files, { today: '2026-11-16' })
    if (!r.ok) throw new Error(r.comment)
    expect(r.body).not.toContain('evil.example')
    expect(r.body).not.toContain('@everyone')
  })

  it('finds the patch even when the whole copied suggestion was pasted into the field', () => {
    const s = suggestion()
    const pasted = `### 修改内容\n\n\`\`\`json\n${suggestionText(s)}\n\`\`\`\n\n### 说明\n\nx`
    expect(extractPatch(pasted)).toEqual(s.patch)
    expect(extractPatch(`please apply ${patchJson(s.patch)} thanks`)).toEqual(s.patch)
    expect(extractPatch('no json { here')).toBeNull()
  })

  it('a change that fails validation becomes a draft that lists the problems', () => {
    const s = suggestion('')
    const p = { ...s.patch, needsTranslation: true } as Patch
    const r = runSuggestion(event(`\`\`\`json\n${patchJson(p)}\n\`\`\``), files, { today: '2026-11-16' })
    if (!r.ok) throw new Error(r.comment)
    expect(r.draft).toBe(true)
    expect(r.labels).toEqual([LABELS.translate])
    expect(r.body).toContain('MISSING_LANG')
  })

  it('explains, instead of guessing, when the issue has no usable patch or the record moved on', () => {
    expect(runSuggestion(event('I think 35 Up is wrong'), files, { today: '2026-11-16' })).toMatchObject({ ok: false })
    const bad = runSuggestion(event('```json\n{"v":1,"target":"../../package.json","base":"00000000","value":{}}\n```'), files, { today: '2026-11-16' })
    expect(bad.ok === false && bad.comment).toContain('malformed')
    const stale = { ...suggestion().patch, base: 'deadbeef' }
    const r = runSuggestion(event(`\`\`\`json\n${patchJson(stale)}\n\`\`\``), files, { today: '2026-11-16' })
    expect(r.ok === false && r.comment).toContain('changed after the suggestion was made')
  })
})

describe('the workflows', () => {
  const suggestionYml = read('.github/workflows/suggestion.yml')
  const prYml = read('.github/workflows/pr.yml')

  it('the bot never puts issue text on a command line, and only maintainers can start it', () => {
    for (const bad of ['github.event.issue.body', 'github.event.issue.title', 'github.event.comment', 'github.event.issue.user']) expect(suggestionYml).not.toContain(bad)
    expect(suggestionYml).toContain(`github.event.label.name == '${LABELS.accepted}'`)
    expect(suggestionYml).toContain(`contains(github.event.issue.labels.*.name, '${LABELS.suggestion}')`)
    expect(suggestionYml).toContain('"$GITHUB_EVENT_PATH"')
  })

  it('only use contexts where GitHub allows them (no runner.* outside steps)', () => {
    for (const yml of [suggestionYml, prYml, read('.github/workflows/pages.yml')]) {
      const jobsAt = yml.indexOf('\njobs:')
      for (const [i, line] of yml.split('\n').entries()) {
        if (!line.includes('${{ runner.')) continue
        // Steps are list items under jobs.<id>.steps, indented at least 8 spaces.
        expect(line.match(/^ */)![0].length, `line ${i + 1}: ${line.trim()}`).toBeGreaterThanOrEqual(8)
        expect(jobsAt).toBeGreaterThan(-1)
      }
    }
  })

  it('pull request checks are read-only and never run untrusted code with a write token', () => {
    expect(prYml).not.toContain('pull_request_target')
    expect(prYml).toMatch(/permissions:\n\s+contents: read/)
    for (const step of ['npm test', 'npm run build', 'scripts/data-diff.ts', 'upload-artifact']) expect(prYml).toContain(step)
  })
})
