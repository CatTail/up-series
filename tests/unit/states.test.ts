import { describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { cellView, chipSummary } from '../../src/lib/states.ts'
import { makeFixture } from '../fixtures/dataset.ts'

describe('cellView / chipSummary', () => {
  const ds = makeFixture()
  ds.states.find((s) => s.personId === 'charles' && s.filmId === 'f35')!.dims.events = {
    status: 'confirmed', text: { zh: '事后得知', en: 'Learned later' }, sourceIds: ['wiki-up'],
  }
  const idx = buildIndex(ds)

  it('chipSummary charles f35 → participation absent', () => {
    expect(chipSummary(idx, 'charles', 'f35')).toEqual({ kind: 'participation', p: 'absent' })
  })
  it('chipSummary lynn f70 → participation deceased', () => {
    expect(chipSummary(idx, 'lynn', 'f70')).toMatchObject({ kind: 'participation', p: 'deceased' })
  })
  it('chipSummary suzy f63 → participation footage_only', () => {
    expect(chipSummary(idx, 'suzy', 'f63')).toMatchObject({ kind: 'participation', p: 'footage_only' })
  })
  it('nick f70 → not_found when no confirmed dims', () => {
    expect(chipSummary(idx, 'nick', 'f70')).toEqual({ kind: 'not_found' })
  })
  it('chipSummary picks work when confirmed', () => {
    expect(chipSummary(idx, 'andrew', 'f35')).toMatchObject({ kind: 'text', text: { en: 'Solicitor' } })
  })
  it('audio_only cell without facts is not_found; absent cell without note has no note key', () => {
    expect(chipSummary(idx, 'charles', 'f70')).toEqual({ kind: 'not_found' })
    expect(cellView(idx, 'charles', 'f35', 'work')).toEqual({ kind: 'participation', p: 'absent' })
  })
  it('cellView keeps retrospective events in absent cells', () => {
    expect(cellView(idx, 'charles', 'f35', 'events')).toMatchObject({ kind: 'text', text: { en: 'Learned later' } })
  })
  it('cellView passes questionIds for confirmed dims', () => {
    expect(cellView(idx, 'andrew', 'f07', 'outlook')).toMatchObject({ kind: 'text', questionIds: ['f07-001'] })
  })
})
