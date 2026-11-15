import { describe, expect, it } from 'vitest'
import { parseRoute, toHash } from '../../src/lib/route.ts'

describe('parseRoute / toHash', () => {
  it('person route', () => {
    expect(parseRoute('#/person/nick')).toEqual({ name: 'person', id: 'nick' })
  })
  it('the person index, and invalid person ids, are the person route without an id', () => {
    expect(parseRoute('#/person')).toEqual({ name: 'person' })
    expect(parseRoute('#/person/zzz')).toEqual({ name: 'person' })
    expect(toHash({ name: 'person' })).toBe('#/person')
    expect(toHash({ name: 'person', id: 'tony' })).toBe('#/person/tony')
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
  it('overview dim and people', () => {
    expect(parseRoute('#/overview?age=28&dim=work&people=andrew,tony')).toEqual({ name: 'overview', age: 28, dim: 'work', people: ['andrew', 'tony'] })
    expect(parseRoute('#/overview?dim=nope&people=zed,andrew,andrew')).toEqual({ name: 'overview', people: ['andrew'] })
    expect(parseRoute('#/overview?people=')).toEqual({ name: 'overview' })
    const h = '#/overview?age=28&dim=work&people=andrew,tony'
    expect(toHash(parseRoute(h))).toBe(h)
    expect(toHash({ name: 'overview', people: [] })).toBe('#/overview')
  })
  it('legacy compare links open the overview with both people ticked', () => {
    expect(parseRoute('#/compare?a=andrew&b=charles')).toEqual({ name: 'overview', people: ['andrew', 'charles'] })
    expect(parseRoute('#/compare?a=lynn')).toEqual({ name: 'overview', people: ['lynn'] })
    expect(parseRoute('#/compare')).toEqual({ name: 'overview' })
    expect(parseRoute('#/guess')).toEqual({ name: 'guess' })
    expect(toHash({ name: 'origins' })).toBe('#/origins')
  })
})
