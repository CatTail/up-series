import { describe, expect, it } from 'vitest'
import { checkDist } from '../../scripts/check-dist.ts'

describe('checkDist', () => {
  it('flags external scripts, styles and images', () => {
    expect(checkDist('<script src="https://x.example/a.js"></script>')).toHaveLength(1)
    expect(checkDist('<link rel="stylesheet" href="http://x.example/a.css">')).toHaveLength(1)
    expect(checkDist('<img alt="" src="https://x.example/a.png">')).toHaveLength(1)
    expect(checkDist('<style>@import url(https://fonts.example/x.css);</style>')).toHaveLength(1)
  })
  it('allows outbound article links', () => {
    expect(checkDist('<a href="https://www.theguardian.com/tv-and-radio/x">x</a>')).toEqual([])
  })
  it('flags transcript-site names anywhere', () => {
    expect(checkDist('<p>see subtitlecat</p>')).toHaveLength(1)
    expect(checkDist('<p>StockQ</p>')).toHaveLength(1)
  })
  it('flags network calls to http(s) URLs', () => {
    expect(checkDist('<script>fetch("https://api.example/x")</script>').length).toBeGreaterThan(0)
    expect(checkDist('<script>new XMLHttpRequest()</script>').length).toBeGreaterThan(0)
  })
  it('a clean single file passes', () => {
    expect(checkDist('<!doctype html><html><head><style>a{}</style><script type="module">console.log(1)</script></head><body><a href="https://en.wikipedia.org/wiki/Up_(film_series)">w</a></body></html>')).toEqual([])
  })
})
