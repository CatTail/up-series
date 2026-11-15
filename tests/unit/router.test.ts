import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { navigate, router, startRouter } from '../../src/lib/router.svelte.ts'

describe('router scroll behaviour', () => {
  let spy: ReturnType<typeof vi.fn>
  let stop: () => void
  beforeEach(() => {
    location.hash = '#/overview'
    stop = startRouter()
    spy = vi.fn()
    window.scrollTo = spy as unknown as typeof window.scrollTo
  })
  afterEach(() => stop())

  it('scrolls to the top when the page changes', () => {
    navigate({ name: 'person', id: 'nick' })
    expect(spy).toHaveBeenCalledWith(0, 0)
    spy.mockClear()
    navigate({ name: 'person', id: 'lynn' })
    expect(spy).toHaveBeenCalledWith(0, 0)
  })

  it('keeps the scroll position for in-page changes (filters, slider)', () => {
    navigate({ name: 'questions', film: 'f28' })
    spy.mockClear()
    navigate({ name: 'questions', film: 'f35' })
    navigate({ name: 'questions', film: 'f35', q: 'cab' }, { replace: true })
    expect(spy).not.toHaveBeenCalled()
    expect(router.route).toEqual({ name: 'questions', film: 'f35', q: 'cab' })
  })

  it('link clicks (hashchange) to another page also scroll to the top', () => {
    location.hash = '#/compare'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(spy).toHaveBeenCalledWith(0, 0)
  })
})
