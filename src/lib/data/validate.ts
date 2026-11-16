import type { Bilingual, Dataset, ErrorCode, ValidationError } from './types.ts'
import {
  ATTRIBUTIONS, COLOR_VARS, COVERAGES, DIM_KEYS, FILM_IDS, FORBIDDEN_DOMAINS, GROUP_IDS, INTENT_KINDS,
  MAX_QUOTE_SENTENCES, MAX_QUOTES_PER_PERSON_FILM, NON_PARTICIPATING, ORIGIN_KINDS, PARTICIPATIONS,
  PERSON_IDS, SOURCE_KINDS,
} from './types.ts'

export function countSentences(en: string): number {
  return en.trim().split(/(?<=[.!?…])\s+/).filter(Boolean).length
}

/** Every check that is safe to ship in the site bundle (it doesn't carry the forbidden-domain list). */
export function validateCore(ds: Dataset, opts: { strictFinals?: boolean } = {}): ValidationError[] {
  const errors: ValidationError[] = []
  const err = (code: ErrorCode, path: string, message: string) => errors.push({ code, path, message })

  const oneOf = (allowed: readonly string[], v: unknown, path: string) => {
    if (typeof v !== 'string' || !allowed.includes(v)) err('BAD_ENUM', path, `${JSON.stringify(v)} not in [${allowed.join(', ')}]`)
  }
  const text = (v: unknown, path: string) => {
    if (typeof v !== 'string' || !v.trim()) err('MISSING_LANG', path, 'empty text')
  }
  const bi = (v: Bilingual | undefined, path: string) => {
    if (!v || typeof v !== 'object') return err('MISSING_LANG', path, 'missing bilingual text')
    text(v.zh, `${path}.zh`)
    text(v.en, `${path}.en`)
  }
  const ids = <T extends { id: string }>(list: T[], path: string) => {
    const set = new Set<string>()
    list.forEach((x, i) => {
      if (set.has(x.id)) err('DANGLING_REF', `${path}[${i}]`, `duplicate id ${x.id}`)
      set.add(x.id)
    })
    return set
  }

  const sourceIds = ids(ds.sources, 'sources')
  const filmIds = ids(ds.films, 'films')
  const groupIds = ids(ds.groups, 'groups')
  const personIds = ids(ds.people, 'people')
  const themeIds = ids(ds.themes, 'themes')
  const questionIds = ids(ds.questions, 'questions')

  /** `required`: the fact must cite at least one source. */
  const refs = (list: string[] | undefined, set: Set<string>, path: string, what: string, required: boolean) => {
    if (!Array.isArray(list) || list.length === 0) {
      if (required) err('MISSING_SOURCE', path, `no ${what}`)
      return
    }
    for (const id of list) if (!set.has(id)) err('DANGLING_REF', path, `unknown ${what} ${id}`)
  }
  const ref = (id: string | null | undefined, set: Set<string>, path: string, what: string) => {
    if (typeof id !== 'string' || !set.has(id)) err('DANGLING_REF', path, `unknown ${what} ${id}`)
  }

  // sources
  ds.sources.forEach((s, i) => {
    const p = `sources[${i}](${s.id})`
    oneOf(SOURCE_KINDS, s.kind, `${p}.kind`)
    text(s.title, `${p}.title`)
    text(s.publisher, `${p}.publisher`)
    if (s.kind === 'film') {
      if (s.url !== undefined) err('FILM_SOURCE_URL', `${p}.url`, 'film sources cite the film itself, not a URL')
    } else if (typeof s.url !== 'string' || !/^https?:\/\//.test(s.url)) {
      err('MISSING_SOURCE', `${p}.url`, 'non-film source needs an http(s) url')
    }
  })

  // films
  ds.films.forEach((f, i) => {
    const p = `films[${i}](${f.id})`
    oneOf(FILM_IDS, f.id, `${p}.id`)
    oneOf(COVERAGES, f.transcriptCoverage, `${p}.transcriptCoverage`)
    refs(f.sourceIds, sourceIds, `${p}.sourceIds`, 'source', true)
  })

  // groups
  ds.groups.forEach((g, i) => {
    const p = `groups[${i}](${g.id})`
    oneOf(GROUP_IDS, g.id, `${p}.id`)
    oneOf(COLOR_VARS, g.colorVar, `${p}.colorVar`)
    bi(g.name, `${p}.name`)
  })

  // people
  ds.people.forEach((person, i) => {
    const p = `people[${i}](${person.id})`
    oneOf(PERSON_IDS, person.id, `${p}.id`)
    ref(person.group, groupIds, `${p}.group`, 'group')
    text(person.name, `${p}.name`)
    text(person.fullName, `${p}.fullName`)
    bi(person.background, `${p}.background`)
    for (const f of ds.films) oneOf(PARTICIPATIONS, person.participation?.[f.id], `${p}.participation.${f.id}`)
    for (const [f, note] of Object.entries(person.participationNotes ?? {})) {
      ref(f, filmIds, `${p}.participationNotes`, 'film')
      bi(note, `${p}.participationNotes.${f}`)
    }
    refs(person.sourceIds, sourceIds, `${p}.sourceIds`, 'source', true)
  })

  // states
  const seen = new Map<string, number>()
  ds.states.forEach((row, i) => {
    const p = `states[${i}](${row.personId}/${row.filmId})`
    ref(row.personId, personIds, `${p}.personId`, 'person')
    ref(row.filmId, filmIds, `${p}.filmId`, 'film')
    const key = `${row.personId}/${row.filmId}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
    const part = ds.people.find((x) => x.id === row.personId)?.participation?.[row.filmId]
    for (const d of DIM_KEYS) {
      const v = row.dims?.[d]
      const dp = `${p}.dims.${d}`
      if (!v) {
        err('MISSING_STATE', dp, 'dimension missing')
        continue
      }
      oneOf(['confirmed', 'not_found', 'not_applicable'], v.status, `${dp}.status`)
      if (v.status === 'confirmed') {
        bi(v.text, `${dp}.text`)
        refs(v.sourceIds, sourceIds, `${dp}.sourceIds`, 'source', true)
        refs(v.questionIds, questionIds, `${dp}.questionIds`, 'question', false)
        for (const qid of v.questionIds ?? []) {
          const q = ds.questions.find((x) => x.id === qid)
          if (!q) continue
          if (q.personId !== row.personId) err('DANGLING_REF', `${dp}.questionIds`, `question ${qid} is not about ${row.personId}`)
          if (q.filmId !== row.filmId) err('DANGLING_REF', `${dp}.questionIds`, `question ${qid} is from film ${q.filmId}, not ${row.filmId}`)
        }
        if (part && NON_PARTICIPATING.includes(part) && d !== 'events') {
          err('STATE_PARTICIPATION_CONFLICT', dp, `confirmed ${d} in a ${part} cell; put retrospective facts in events`)
        }
      } else if (v.status === 'not_applicable') {
        bi(v.reason, `${dp}.reason`)
      }
    }
  })
  for (const person of ds.people) {
    for (const f of ds.films) {
      const n = seen.get(`${person.id}/${f.id}`) ?? 0
      if (n !== 1) err('MISSING_STATE', `states(${person.id}/${f.id})`, `expected exactly 1 row, found ${n}`)
    }
  }

  // Backgrounds and final states are shown anonymously in the guess game, so they must not name anyone.
  const names = ds.people.map((x) => x.name).filter((n) => typeof n === 'string' && n.trim())
  const anonymous = (b: Bilingual | undefined, path: string) => {
    for (const n of names) {
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if ((typeof b?.en === 'string' && new RegExp(`\\b${esc}\\b`).test(b.en)) || (typeof b?.zh === 'string' && b.zh.includes(n))) {
        err('NAMES_PERSON', path, `mentions ${n}; this text is shown anonymously in the guess game`)
      }
    }
  }
  ds.people.forEach((person, i) => anonymous(person.background, `people[${i}](${person.id}).background`))
  ds.finals.forEach((fs, i) => anonymous(fs.text, `finals[${i}](${fs.personId}).text`))

  // finals
  ds.finals.forEach((fs, i) => {
    const p = `finals[${i}](${fs.personId})`
    ref(fs.personId, personIds, `${p}.personId`, 'person')
    ref(fs.asOfFilmId, filmIds, `${p}.asOfFilmId`, 'film')
    bi(fs.text, `${p}.text`)
    refs(fs.sourceIds, sourceIds, `${p}.sourceIds`, 'source', true)
  })
  if (opts.strictFinals) {
    for (const person of ds.people) {
      if (!ds.finals.some((f) => f.personId === person.id)) err('MISSING_FINAL', `finals(${person.id})`, 'no final state')
    }
  }

  // themes
  ds.themes.forEach((t, i) => {
    const p = `themes[${i}](${t.id})`
    bi(t.name, `${p}.name`)
    bi(t.intent, `${p}.intent`)
    oneOf(INTENT_KINDS, t.intentKind, `${p}.intentKind`)
    refs(t.sourceIds, sourceIds, `${p}.sourceIds`, 'source', t.intentKind === 'sourced')
  })

  // questions
  const quoteCount = new Map<string, number>()
  ds.questions.forEach((q, i) => {
    const p = `questions[${i}](${q.id})`
    ref(q.filmId, filmIds, `${p}.filmId`, 'film')
    if (q.personId !== null) ref(q.personId, personIds, `${p}.personId`, 'person')
    oneOf(ATTRIBUTIONS, q.attribution, `${p}.attribution`)
    if (q.attribution === 'confirmed' && q.personId === null) err('BAD_ENUM', `${p}.personId`, 'confirmed attribution needs a personId')
    if (q.attribution === 'film_only' && q.personId !== null) err('BAD_ENUM', `${p}.personId`, 'film_only questions must have personId null')
    if (typeof q.fromRecap !== 'boolean') err('BAD_ENUM', `${p}.fromRecap`, 'must be boolean')
    text(q.en, `${p}.en`)
    text(q.zh, `${p}.zh`)
    refs(q.themeIds, themeIds, `${p}.themeIds`, 'theme', false)
    if (q.answerSummary) bi(q.answerSummary, `${p}.answerSummary`)
    if (q.answerQuote) {
      bi(q.answerQuote, `${p}.answerQuote`)
      if (typeof q.answerQuote.en === 'string' && countSentences(q.answerQuote.en) > MAX_QUOTE_SENTENCES) {
        err('QUOTE_TOO_LONG', `${p}.answerQuote.en`, `more than ${MAX_QUOTE_SENTENCES} sentences`)
      }
      const key = `${q.personId}/${q.filmId}`
      quoteCount.set(key, (quoteCount.get(key) ?? 0) + 1)
    }
    if (typeof q.sourceId !== 'string' || !q.sourceId) err('MISSING_SOURCE', `${p}.sourceId`, 'no source')
    else ref(q.sourceId, sourceIds, `${p}.sourceId`, 'source')
    bi(q.locator, `${p}.locator`)
  })
  for (const [key, n] of quoteCount) {
    if (n > MAX_QUOTES_PER_PERSON_FILM) err('QUOTE_LIMIT', `questions(${key})`, `${n} quotes > ${MAX_QUOTES_PER_PERSON_FILM}`)
  }

  // origins
  ds.origins.blocks.forEach((b, i) => {
    const p = `origins.blocks[${i}](${b.id})`
    oneOf(ORIGIN_KINDS, b.kind, `${p}.kind`)
    bi(b.text, `${p}.text`)
    if (b.cite) bi(b.cite, `${p}.cite`)
    refs(b.sourceIds, sourceIds, `${p}.sourceIds`, 'source', b.kind !== 'interpretation')
  })

  // ui strings
  for (const [k, v] of Object.entries(ds.ui)) bi(v, `ui.${k}`)

  return errors
}

/** The full gate used by the build, CI and the suggestion bot: core checks plus forbidden domains. */
export function validateDataset(ds: Dataset, opts: { strictFinals?: boolean } = {}): ValidationError[] {
  const errors = validateCore(ds, opts)
  const blob = JSON.stringify(ds).toLowerCase()
  for (const d of FORBIDDEN_DOMAINS) if (blob.includes(d)) errors.push({ code: 'FORBIDDEN_DOMAIN', path: '*', message: `published data mentions "${d}"` })
  return errors
}
