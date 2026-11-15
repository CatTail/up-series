import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collapseRepeats, findQuestions, joinCues, markRecaps, parseOrigText, parseScriptContainer, splitSentences } from '../../scripts/transcripts/parse.ts'
import { loadTranscripts } from '../../scripts/transcripts/sources.ts'

const html = readFileSync(join(__dirname, '../fixtures/transcript-sample.html'), 'utf8')

describe('transcript parsing', () => {
  it('parseOrigText returns every line of the Original subtitles block', () => {
    const lines = parseOrigText(html)
    expect(lines).toHaveLength(12)
    expect(lines[0]).toBe('- Welcome to the invented sample film,')
    expect(lines[6]).toBe("Because it's quiet.")
    expect(lines).not.toContain('Not part of the block.')
  })

  it('parseScriptContainer splits on <br> and drops the leading counter', () => {
    const s = '<div class="scrolling-script-container">\n 1<br> hello there<br> how are you &amp; yours<br>\n </div>'
    expect(parseScriptContainer(s)).toEqual(['hello there', 'how are you & yours'])
  })

  it('collapseRepeats', () => {
    expect(collapseRepeats(['a', 'a', 'b', 'a'])).toEqual(['a', 'b', 'a'])
  })

  it('joinCues', () => {
    expect(joinCues(['Do you never feel', 'you should?', 'Yes.'])).toEqual(['Do you never feel you should?', 'Yes.'])
  })

  it('joinCues starts a new sentence at a speaker dash', () => {
    expect(joinCues(['- Well I', '- Do you?'])).toEqual(['- Well I', '- Do you?'])
  })

  it('findQuestions picks ?-sentences with 3 sentences of context each side', () => {
    const s = ['a.', 'b.', 'c.', "Aren't you worth more than this?", 'd.', 'e.', 'f.', 'g.']
    const c = findQuestions(s)
    expect(c).toHaveLength(1)
    expect(c[0]).toEqual({ i: 3, text: "Aren't you worth more than this?", before: ['a.', 'b.', 'c.'], after: ['d.', 'e.', 'f.'] })
  })

  it('findQuestions ignores all-caps sound cues and strips the speaker dash', () => {
    const c = findQuestions(['LAUGHTER?', '- What next?'])
    expect(c.map((x) => x.text)).toEqual(['What next?'])
  })

  it('splitSentences always splits after a question mark, and after . ! before a capital', () => {
    expect(splitSentences(['Why? i dunno. Do you? Yes. ok then.'])).toEqual(['Why?', 'i dunno.', 'Do you?', 'Yes. ok then.'])
    expect(splitSentences(['- Hello there. -I do!'])).toEqual(['- Hello there.', '-I do!'])
  })

  it('joinCues treats "-X" without a space as a speaker change', () => {
    expect(joinCues(['you don', '-I do!'])).toEqual(['you don', '-I do!'])
  })

  it('end to end on the fixture', () => {
    const sentences = joinCues(collapseRepeats(parseOrigText(html)))
    expect(findQuestions(sentences).map((c) => c.text)).toEqual(['What would you like to be when you grow up?', "Aren't you worth more than this?"])
  })

  it('markRecaps flags a later repeat with the earliest film', () => {
    const q = (text: string, i = 0) => ({ i, text, before: [], after: [] })
    const out = markRecaps({ f21: [q('What do you think of girls?')], f28: [q('What do you think of girls?!'), q('New one?', 1)], f35: [q('what do you think of GIRLS')] })
    expect(out.f21[0].recapOf).toBeUndefined()
    expect(out.f28[0].recapOf).toBe('f21')
    expect(out.f28[1].recapOf).toBeUndefined()
    expect(out.f35[0].recapOf).toBe('f21')
  })

  it('loadTranscripts reads the page list from <rawDir>/sources.json (kept outside the repo)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'up-raw-'))
    const list = [
      { filmId: 'f07', part: 1, source: 'primary', url: 'https://example.org/a.html' },
      { filmId: 'f70', part: 2, source: 'primary', url: 'https://example.org/b.html' },
      { filmId: 'f21', part: 1, source: 'secondary', url: 'https://example.net/c' },
    ]
    writeFileSync(join(dir, 'sources.json'), JSON.stringify(list))
    expect(loadTranscripts(dir)).toEqual(list)
  })

  it('loadTranscripts rejects malformed entries and a missing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'up-raw-'))
    expect(() => loadTranscripts(dir)).toThrow(/sources\.json/)
    writeFileSync(join(dir, 'sources.json'), JSON.stringify([{ filmId: 'f99', part: 1, source: 'primary', url: 'https://x.org' }]))
    expect(() => loadTranscripts(dir)).toThrow(/filmId/)
    writeFileSync(join(dir, 'sources.json'), JSON.stringify([{ filmId: 'f07', part: 1, source: 'other', url: 'https://x.org' }]))
    expect(() => loadTranscripts(dir)).toThrow(/source/)
    writeFileSync(join(dir, 'sources.json'), JSON.stringify([{ filmId: 'f07', part: 1, source: 'primary', url: 'ftp://x' }]))
    expect(() => loadTranscripts(dir)).toThrow(/url/)
  })
})
