// Usage: node scripts/check-dist.ts dist/index.html — fails if the bundle would load anything from the network
// or mentions a transcript site. Outbound <a href> links to articles are allowed.
import { readFileSync } from 'node:fs'
import { FORBIDDEN_DOMAINS } from '../src/lib/data/types.ts'

export function checkDist(html: string): string[] {
  const problems: string[] = []
  for (const m of html.matchAll(/<(script|link|img|iframe|source|video|audio)\b[^>]*\b(?:src|href)\s*=\s*["']?(https?:)?\/\/[^"'\s>]+/gi)) {
    problems.push(`external resource: ${m[0].slice(0, 120)}`)
  }
  if (/@import\s+url\(\s*["']?(https?:)?\/\//i.test(html)) problems.push('CSS @import of a remote URL')
  if (/url\(\s*["']?(https?:)?\/\/[^)]*\.(woff2?|ttf|otf)/i.test(html)) problems.push('remote font')
  if (/\bfetch\s*\(/.test(html)) problems.push('fetch( call in bundle')
  if (/\bXMLHttpRequest\b/.test(html)) problems.push('XMLHttpRequest in bundle')
  if (/\bnew\s+WebSocket\b|\bnavigator\.sendBeacon\b/.test(html)) problems.push('network API in bundle')
  const lower = html.toLowerCase()
  for (const d of FORBIDDEN_DOMAINS) if (lower.includes(d)) problems.push(`mentions "${d}"`)
  return problems
}

if (import.meta.main) {
  const file = process.argv[2]
  if (!file) {
    console.error('usage: node scripts/check-dist.ts <dist/index.html>')
    process.exit(2)
  }
  const problems = checkDist(readFileSync(file, 'utf8'))
  if (problems.length) {
    for (const p of problems) console.error(p)
    process.exit(1)
  }
  console.log('OK')
}
