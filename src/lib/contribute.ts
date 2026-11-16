// Where suggestions go: the GitHub repository, its issue form, and links into the data on GitHub.
import type { Patch } from './data/patch.ts'

export const REPO = 'https://github.com/CatTail/up-series'
export const ISSUE_TEMPLATE = 'data-edit.yml'
export const REPORT_TEMPLATE = 'report.yml'
/** Labels the issue form and the suggestion bot use. */
export const LABELS = { suggestion: 'data-edit', accepted: 'accepted', translate: 'needs-translation' } as const
/** Issue form field ids (must match .github/ISSUE_TEMPLATE/data-edit.yml). */
export const FIELDS = ['target', 'summary', 'patch', 'reason'] as const
/**
 * GitHub's new-issue page fails above roughly 6,500–7,000 characters of URL (measured 2026-11-16:
 * 6,500 → ok, 7,000 → server error, 12,000 → 414). Stay well below.
 */
export const MAX_URL = 6000

export const fileUrl = (path: string) => `${REPO}/blob/main/data/${path}`
export const folderUrl = (path = '') => `${REPO}/tree/main/data${path ? `/${path}` : ''}`
export const docUrl = (path: string) => `${REPO}/blob/main/${path}`
export const openSuggestionsUrl = () => `${REPO}/issues?q=${encodeURIComponent(`is:open label:${LABELS.suggestion}`)}`
export const reportUrl = (page: string) => `${REPO}/issues/new?${new URLSearchParams({ template: REPORT_TEMPLATE, page })}`

export const patchJson = (p: Patch) => JSON.stringify(p, null, 2)

export type Suggestion = { title: string; target: string; summary: string; patch: Patch; reason: string }

function build(s: Suggestion, withContent: boolean): string {
  const q = new URLSearchParams({ template: ISSUE_TEMPLATE, title: s.title, target: s.target })
  if (withContent) {
    q.set('summary', s.summary)
    q.set('patch', patchJson(s.patch))
  }
  q.set('reason', s.reason)
  return `${REPO}/issues/new?${q}`
}

/**
 * Link to a pre-filled suggestion issue. If the change is too long for a link, the link carries only the
 * title, address and reason (`long`), and the contributor pastes the copied suggestion into the form.
 */
export function issueUrl(s: Suggestion): { url: string; long: boolean } {
  const full = build(s, true)
  return full.length <= MAX_URL ? { url: full, long: false } : { url: build(s, false), long: true }
}

/** The whole suggestion as text, for copying (the bot finds the JSON block in it). */
export function suggestionText(s: Suggestion): string {
  return [`## ${s.title}`, '', s.summary, '', `> ${s.reason.replace(/\n/g, '\n> ')}`, '', '```json', patchJson(s.patch), '```', ''].join('\n')
}
