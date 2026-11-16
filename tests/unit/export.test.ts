import { describe, expect, it } from 'vitest'
import { gaps, questionsCsv, sourcesCsv, statesCsv, toCsv } from '../../src/lib/data/export.ts'
import { buildIndex } from '../../src/lib/data/index.ts'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
const lines = (csv: string) => csv.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean)

describe('exports', () => {
  it('CSV quotes commas, quotes and newlines, and starts with a BOM for Excel', () => {
    const csv = toCsv([['a', 'b,c', 'say "hi"', 'two\nlines', null, 3]])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toBe('\uFEFFa,"b,c","say ""hi""","two\nlines",,3\r\n')
  })

  it('states: one row per person × film × dimension, with its address', () => {
    const rows = lines(statesCsv(idx))
    expect(rows[0]).toBe('person,name,film,age,dimension,status,zh,en,sources,address')
    expect(rows).toHaveLength(1 + 5 * 10 * 6)
    expect(rows).toContain('andrew,Andrew,35 Up,35,work,confirmed,律师,Solicitor,wiki-up,state/andrew/f35/work')
  })

  it('questions and sources', () => {
    const q = lines(questionsCsv(idx))
    expect(q).toHaveLength(1 + 3)
    expect(q[1]).toContain('f07-001,Seven Up!,7,andrew,confirmed,What newspaper do you read?,你读什么报纸？')
    const s = lines(sourcesCsv(idx))
    expect(s[0]).toBe('id,kind,publisher,title,url,accessed,address')
    expect(s).toContain('film-f07,film,ITV,Seven Up!,,2026-11-15,source/film-f07')
  })

  it('gaps are the not-found cells, in people → age → dimension order, then missing finals', () => {
    const notFound = idx.ds.states.flatMap((r) => Object.values(r.dims)).filter((d) => d.status === 'not_found').length
    const ds = makeFixture()
    ds.finals = ds.finals.filter((f) => f.personId !== 'nick')
    const g = gaps(buildIndex(ds))
    expect(g).toHaveLength(notFound + 1)
    expect(g[0].target).toEqual({ kind: 'state', person: 'andrew', film: 'f07', dim: 'education' })
    expect(g.at(-1)!.target).toEqual({ kind: 'final', person: 'nick' })
  })
})
