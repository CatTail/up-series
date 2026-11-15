import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Guess from '../../src/views/Guess.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
const names = idx.peopleOrdered.map((p) => p.name)
beforeEach(() => setLang('zh'))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const card = () => document.querySelector('.gcard') as HTMLElement
const options = () => Array.from(document.querySelectorAll('button.opt')) as HTMLButtonElement[]
async function answer(pickIndex = 0) {
  await fireEvent.click(options()[pickIndex])
  await fireEvent.click(screen.getByRole('button', { name: t('guess.reveal') }))
}
async function next() {
  await fireEvent.click(screen.getByRole('button', { name: t('guess.next') }))
}

describe('Guess view', () => {
  it('hides the name before answering; shows it and a profile link after', async () => {
    render(Guess, { idx, seed: 11 })
    for (const n of names) expect(card()).not.toHaveTextContent(new RegExp(`\\b${n}\\b`))
    expect(options()).toHaveLength(3)
    expect(screen.getByRole('button', { name: t('guess.reveal') })).toBeDisabled()
    await answer()
    const link = document.querySelector('a.profile') as HTMLAnchorElement
    expect(link.getAttribute('href')).toMatch(/^#\/person\//)
    const id = link.getAttribute('href')!.split('/').pop()!
    expect(document.querySelector('.result')).toHaveTextContent(idx.person(id as never).name)
  })

  it('reveal draws the lifeline segment by segment', async () => {
    vi.useFakeTimers()
    render(Guess, { idx, seed: 11 })
    await answer()
    const segs = () => document.querySelectorAll('.result line.seg').length
    const start = segs()
    expect(start).toBe(0)
    await vi.advanceTimersByTimeAsync(350)
    expect(segs()).toBeGreaterThan(start)
    await vi.advanceTimersByTimeAsync(5000)
    const end = segs()
    expect(end).toBeGreaterThanOrEqual(7)
  })

  it('switching to EN at round 3 keeps the score and the round', async () => {
    render(Guess, { idx, seed: 5 })
    await answer(0)
    await next()
    await answer(1)
    await next()
    const before = document.querySelector('.score')!.textContent
    expect(screen.getByText(t('guess.progress', { i: 3, n: 5 }))).toBeInTheDocument()
    const optsBefore = options().map((o) => o.dataset.person)
    setLang('en')
    await new Promise((r) => setTimeout(r))
    expect(screen.getByText('3 of 5')).toBeInTheDocument()
    expect(options().map((o) => o.dataset.person)).toEqual(optsBefore)
    expect(document.querySelector('.score')!.textContent).not.toBe(before)
    expect(document.querySelector('.score')).toHaveTextContent(/right out of 2 so far/)
    expect(document.body).not.toHaveTextContent('猜')
  })

  it('shows a summary after the last round', async () => {
    render(Guess, { idx, seed: 9 })
    for (let i = 0; i < 5; i++) {
      await answer(0)
      if (i < 4) await next()
    }
    await next()
    expect(document.querySelector('.summary')).toHaveTextContent(/个人里猜中了 \d 个/)
    expect(document.querySelector('.summary')).toHaveTextContent('5')
  })

  it('missing 7-year quote shows the not-confirmed note', async () => {
    render(Guess, { idx, seed: 1 })
    for (let i = 0; i < 5; i++) {
      const hasPrompt = !!card().querySelector('.qa')
      if (!hasPrompt) expect(card()).toHaveTextContent(t('guess.noPrompt'))
      await answer(0)
      if (i < 4) await next()
    }
  })

  it('a deceased person’s outcome notes where it was taken from', async () => {
    render(Guess, { idx, seed: 1 })
    for (let i = 0; i < 5; i++) {
      await answer(0)
      const r = document.querySelector('.result') as HTMLElement
      if (r.dataset.person === 'lynn') expect(r).toHaveTextContent(t('guess.asOf', { title: '56 Up', status: t('status.deceased') }))
      if (i < 4) await next()
    }
  })
})
