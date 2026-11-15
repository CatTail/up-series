import { describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { cellView, chipSummary, nodeState } from '../../src/lib/states.ts'
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
  it('chipSummary falls back to events when nothing else is confirmed', () => {
    const ds2 = makeFixture()
    ds2.states.find((s) => s.personId === 'suzy' && s.filmId === 'f70')!.dims.events = {
      status: 'confirmed', text: { zh: '回归', en: 'Returned' }, sourceIds: ['wiki-up'],
    }
    expect(chipSummary(buildIndex(ds2), 'suzy', 'f70')).toMatchObject({ kind: 'text', text: { en: 'Returned' } })
  })

  it('chipSummary picks work when confirmed, and says which dimension it came from', () => {
    expect(chipSummary(idx, 'andrew', 'f35')).toMatchObject({ kind: 'text', text: { en: 'Solicitor' }, dim: 'work' })
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

  it('nodeState: a theme shows that dimension, no theme shows the summary', () => {
    expect(nodeState(idx, 'andrew', 'f07', 'outlook')).toMatchObject({ kind: 'text', text: { en: 'Reads the Financial Times' } })
    expect(nodeState(idx, 'andrew', 'f35', 'outlook')).toEqual({ kind: 'not_found' })
    expect(nodeState(idx, 'andrew', 'f35')).toMatchObject({ kind: 'text', dim: 'work' })
    expect(nodeState(idx, 'charles', 'f35', 'work')).toEqual({ kind: 'participation', p: 'absent' })
  })
})
