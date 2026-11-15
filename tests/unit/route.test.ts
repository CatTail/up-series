import { describe, expect, it } from 'vitest'
import { parseRoute, toHash } from '../../src/lib/route.ts'

describe('parseRoute / toHash', () => {
  it('person route', () => {
    expect(parseRoute('#/person/nick')).toEqual({ name: 'person', id: 'nick' })
  })
  it('invalid person id falls back to origins', () => {
    expect(parseRoute('#/person/zzz')).toEqual({ name: 'origins' })
  })
  it('empty and unknown hashes are origins', () => {
    expect(parseRoute('')).toEqual({ name: 'origins' })
    expect(parseRoute('#/')).toEqual({ name: 'origins' })
    expect(parseRoute('#/nope')).toEqual({ name: 'origins' })
  })
  it('questions round trip', () => {
    const h = '#/questions?film=f28&q=cab'
    expect(parseRoute(h)).toEqual({ name: 'questions', film: 'f28', q: 'cab' })
    expect(toHash(parseRoute(h))).toBe(h)
  })
  it('questions drops invalid film/person ids but keeps the route', () => {
    expect(parseRoute('#/questions?film=f99&person=zed&theme=work&open=f28-014')).toEqual({ name: 'questions', theme: 'work', open: 'f28-014' })
  })
  it('chinese query round trip', () => {
    const r = { name: 'questions', q: '出租车 司机' } as const
    expect(parseRoute(toHash(r))).toEqual(r)
  })
  it('overview age must be one of the ten ages', () => {
    expect(parseRoute('#/overview?age=35')).toEqual({ name: 'overview', age: 35 })
    expect(parseRoute('#/overview?age=36')).toEqual({ name: 'overview' })
    expect(toHash({ name: 'overview', age: 35 })).toBe('#/overview?age=35')
  })
  it('compare', () => {
    expect(parseRoute('#/compare?a=andrew&b=charles')).toEqual({ name: 'compare', a: 'andrew', b: 'charles' })
    expect(toHash({ name: 'compare', a: 'lynn' })).toBe('#/compare?a=lynn')
    expect(parseRoute('#/guess')).toEqual({ name: 'guess' })
    expect(toHash({ name: 'origins' })).toBe('#/origins')
  })
})
