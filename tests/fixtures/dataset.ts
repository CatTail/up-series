// Test-only dataset. Values are shaped like the real data but are NOT published facts.
import type {
  Dataset, DimKey, DimValue, Film, FilmId, FinalState, Group, Participation, Person, Question,
  Source, StateRow,
} from '../../src/lib/data/types.ts'
import { DIM_KEYS, FILM_IDS, NON_PARTICIPATING } from '../../src/lib/data/types.ts'

const AGES = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70]
const YEARS = [1964, 1970, 1977, 1984, 1991, 1998, 2005, 2012, 2019, 2026]
const TITLES = ['Seven Up!', '7 Plus Seven', '21 Up', '28 Up', '35 Up', '42 Up', '49 Up', '56 Up', '63 Up', '70 Up']

function partString(s: string): Record<FilmId, Participation> {
  const map: Record<string, Participation> = {
    '1': 'present', '0': 'absent', v: 'audio_only', L: 'archival_interview', f: 'footage_only', d: 'deceased',
  }
  return Object.fromEntries(FILM_IDS.map((f, i) => [f, map[s[i]]])) as Record<FilmId, Participation>
}

export function makeFixture(): Dataset {
  const sources: Source[] = [
    { id: 'wiki-up', url: 'https://en.wikipedia.org/wiki/Up_(film_series)', title: 'Up (film series)', publisher: 'Wikipedia', accessed: '2026-11-15', kind: 'wiki' },
    { id: 'apted-wb', url: 'https://writersblocpresents.com/example', title: 'Interview with Michael Apted', publisher: 'Writers Bloc', accessed: '2026-11-15', kind: 'interview' },
    ...FILM_IDS.map((f, i): Source => ({ id: `film-${f}`, title: TITLES[i], publisher: i === 5 ? 'BBC' : 'ITV', accessed: '2026-11-15', kind: 'film' })),
  ]

  const films: Film[] = FILM_IDS.map((id, i) => ({
    id, age: AGES[i], year: YEARS[i], title: TITLES[i],
    firstAired: `${YEARS[i]}-05-01`, lastAired: `${YEARS[i]}-05-01`,
    director: i === 0 ? 'Paul Almond' : i === 9 ? 'Asif Kapadia' : 'Michael Apted',
    broadcaster: i === 5 ? 'BBC One' : 'ITV', episodes: i === 9 ? 2 : 1,
    transcriptCoverage: i === 9 ? 'partial' : 'full', sourceIds: ['wiki-up'],
  }))

  const groups: Group[] = [
    { id: 'priv', name: { zh: '富裕家庭 · 私立学校', en: 'Affluent · private school' }, colorVar: '--series-1', order: 0 },
    { id: 'east', name: { zh: '伦敦东区 · 公立小学', en: 'East End · state primary' }, colorVar: '--series-2', order: 1 },
    { id: 'home', name: { zh: '儿童之家', en: "Children's home" }, colorVar: '--series-3', order: 2 },
    { id: 'rural', name: { zh: '约克郡山谷农场', en: 'Yorkshire Dales farm' }, colorVar: '--series-4', order: 3 },
    { id: 'lpool', name: { zh: '利物浦郊区', en: 'Liverpool suburbs' }, colorVar: '--series-5', order: 4 },
  ]

  const bg = (zh: string, en: string) => ({ zh, en })
  const people: Person[] = [
    { id: 'andrew', name: 'Andrew', fullName: 'Andrew Brackfield', group: 'priv', background: bg('肯辛顿预备学校', 'Kensington pre-prep'), participation: partString('1111111111'), sourceIds: ['wiki-up'] },
    { id: 'charles', name: 'Charles', fullName: 'Charles Furneaux', group: 'priv', background: bg('肯辛顿预备学校', 'Kensington pre-prep'), participation: partString('111000000v'),
      participationNotes: { f70: { zh: '只有录音和照片', en: 'Audio and photos only' } }, sourceIds: ['wiki-up'] },
    { id: 'suzy', name: 'Suzy', fullName: 'Suzy Lusk', group: 'priv', background: bg('伦敦私立日校', 'London private day school'), participation: partString('11111111f1'), sourceIds: ['wiki-up'] },
    { id: 'lynn', name: 'Lynn', fullName: 'Lynn Johnson', group: 'east', background: bg('东区公立小学', 'East End state primary'), participation: partString('11111111dd'), died: '2013-05', sourceIds: ['wiki-up'] },
    { id: 'nick', name: 'Nick', fullName: 'Nick Hitchon', group: 'rural', background: bg('约克郡山谷小农场', 'Small farm in the Yorkshire Dales'), participation: partString('111111111L'), died: '2023-07-23', sourceIds: ['wiki-up'] },
  ]

  const states: StateRow[] = []
  for (const p of people) {
    for (const f of FILM_IDS) {
      const part = p.participation[f]
      const dims = {} as Record<DimKey, DimValue>
      for (const d of DIM_KEYS) {
        dims[d] = NON_PARTICIPATING.includes(part)
          ? { status: 'not_applicable', reason: { zh: '未出镜', en: 'Not filmed' } }
          : { status: 'not_found' }
      }
      states.push({ personId: p.id, filmId: f, dims })
    }
  }
  const row = (pid: string, fid: string) => states.find((s) => s.personId === pid && s.filmId === fid)!
  row('andrew', 'f35').dims.work = { status: 'confirmed', text: { zh: '律师', en: 'Solicitor' }, sourceIds: ['wiki-up'] }
  row('andrew', 'f07').dims.outlook = { status: 'confirmed', text: { zh: '想读《金融时报》', en: 'Reads the Financial Times' }, sourceIds: ['film-f07'], questionIds: ['f07-001'] }
  row('lynn', 'f35').dims.work = { status: 'confirmed', text: { zh: '图书管理员', en: 'Librarian' }, sourceIds: ['wiki-up'] }

  const finals: FinalState[] = [
    { personId: 'andrew', asOfFilmId: 'f70', text: { zh: '退休律师', en: 'Retired solicitor' }, sourceIds: ['wiki-up'] },
    { personId: 'charles', asOfFilmId: 'f70', text: { zh: '纪录片制片人', en: 'Documentary producer' }, sourceIds: ['wiki-up'] },
    { personId: 'suzy', asOfFilmId: 'f70', text: { zh: '丧亲辅导员', en: 'Bereavement counsellor' }, sourceIds: ['wiki-up'] },
    { personId: 'lynn', asOfFilmId: 'f56', text: { zh: '儿童图书管理员，2013 年去世', en: "Children's librarian; died 2013" }, sourceIds: ['wiki-up'] },
    { personId: 'nick', asOfFilmId: 'f70', text: { zh: '核物理学家，2023 年去世', en: 'Nuclear physicist; died 2023' }, sourceIds: ['wiki-up'] },
  ]

  const questions: Question[] = [
    { id: 'f07-001', filmId: 'f07', personId: 'andrew', attribution: 'confirmed', fromRecap: false,
      en: 'What newspaper do you read?', zh: '你读什么报纸？', themeIds: ['work'],
      answerSummary: { zh: '他说读金融类报纸。', en: 'He says he reads a financial paper.' },
      answerQuote: { zh: '《金融时报》。', en: 'The Financial Times.' },
      sourceId: 'film-f07', locator: { zh: '预备学校段落', en: 'Pre-prep segment' } },
    { id: 'f28-001', filmId: 'f28', personId: null, attribution: 'film_only', fromRecap: false,
      en: 'What does it take to be a good cabbie?', zh: '要当一个好的出租车司机，需要什么？', themeIds: ['work'],
      sourceId: 'film-f28', locator: { zh: '第 1 集', en: 'Part 1' } },
    { id: 'f28-002', filmId: 'f28', personId: 'suzy', attribution: 'confirmed', fromRecap: true,
      en: 'Do you think about marriage?', zh: '你想过结婚吗？', themeIds: ['love_marriage'],
      answerSummary: { zh: '她说还没想好。', en: 'She says she has not decided.' },
      sourceId: 'film-f28', locator: { zh: 'Suzy 段落', en: 'Suzy segment' } },
  ]

  return {
    sources, films, groups, people, states, finals, questions,
    themes: [
      { id: 'work', name: { zh: '工作', en: 'Work' }, intent: { zh: '他们如何谋生', en: 'How they make a living' }, intentKind: 'sourced', sourceIds: ['apted-wb'] },
      { id: 'love_marriage', name: { zh: '爱情与婚姻', en: 'Love & marriage' }, intent: { zh: '他们如何组建家庭', en: 'How they form families' }, intentKind: 'interpretation', sourceIds: [] },
    ],
    origins: { blocks: [
      { id: 'maxim', kind: 'quote', text: { zh: '给我一个七岁的孩子，我还你一个成人。', en: 'Give me a child until he is seven and I will give you the man.' }, sourceIds: ['wiki-up'] },
      { id: 'ours', kind: 'interpretation', text: { zh: '出身影响选择。', en: 'Origins shape options.' }, sourceIds: [] },
    ] },
    ui: { 'nav.origins': { zh: '缘起', en: 'Origins' } },
  }
}
