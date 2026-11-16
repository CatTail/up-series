import { describe, expect, it } from 'vitest'
import { fileOf, formatAddress, labelOf, parseAddress, type Target } from '../../src/lib/data/address.ts'
import { assembleDataset } from '../../src/lib/data/assemble.ts'
import { buildIndex } from '../../src/lib/data/index.ts'
import { fixtureFiles, trZh } from '../fixtures/files.ts'

const files = fixtureFiles()
const idx = buildIndex(assembleDataset(files))

describe('record addresses', () => {
  it('round-trip every kind', () => {
    const all: Target[] = [
      { kind: 'state', person: 'andrew', film: 'f35', dim: 'work' },
      { kind: 'participation', person: 'charles', film: 'f70' },
      { kind: 'person', person: 'nick' },
      { kind: 'final', person: 'lynn' },
      { kind: 'question', id: 'f28-002' },
      { kind: 'question', id: 'f70-r01' },
      { kind: 'source', id: 'wiki-up' },
    ]
    for (const t of all) expect(parseAddress(formatAddress(t))).toEqual(t)
    expect(formatAddress(all[0])).toBe('state/andrew/f35/work')
  })

  it('reject anything that is not a known record', () => {
    for (const bad of [
      'state/zed/f35/work', 'state/andrew/f99/work', 'state/andrew/f35/salary', 'state/andrew/f35', 'person/andrew/x',
      'question/x', 'question/f99-001', 'source/Bad Id', 'source/../../etc', '../people.json', '', 42, null,
    ]) expect(parseAddress(bad)).toBeNull()
  })

  it('know which file holds a record', () => {
    expect(fileOf(files, parseAddress('state/andrew/f35/work')!)).toBe('states/andrew.json')
    expect(fileOf(files, parseAddress('final/andrew')!)).toBe('states/andrew.json')
    expect(fileOf(files, parseAddress('participation/charles/f70')!)).toBe('people.json')
    expect(fileOf(files, parseAddress('question/f28-002')!)).toBe('questions/f28.json')
    expect(fileOf(files, parseAddress('source/wiki-up')!)).toBe('sources/core.json')
    expect(fileOf(files, parseAddress('source/film-f07')!)).toBe('sources/films.json')
    expect(fileOf(files, parseAddress('source/nope')!)).toBeNull()
  })

  it('have short human labels', () => {
    expect(labelOf(idx, parseAddress('state/andrew/f35/work')!, trZh)).toBe('Andrew · 35 Up · 工作 / 职业')
    expect(labelOf(idx, parseAddress('participation/charles/f70')!, trZh)).toBe('Charles · 70 Up · 出镜情况')
    expect(labelOf(idx, parseAddress('final/lynn')!, trZh)).toBe('Lynn · 最终')
    expect(labelOf(idx, parseAddress('question/f28-002')!, trZh)).toBe('28 Up · Suzy · 问题 f28-002')
    expect(labelOf(idx, parseAddress('source/wiki-up')!, trZh)).toBe('出处 · Wikipedia · Up (film series)')
  })
})
