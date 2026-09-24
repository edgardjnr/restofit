import { describe, expect, it } from 'vitest'
import { estMinutes, routineStats, sessionStats, weekSummary, upcomingSession, shortDay } from './plan-summary.js'

const r = (id, ex) => ({ id, name: id, ex })
const push = r('push', [{ id: '0025', sets: 4 }, { id: '0047', sets: 3 }, { id: '0426', sets: 3 }])
const pull = r('pull', [{ id: '2330', sets: 4 }, { id: '0027', sets: 4 }])
const empty = r('empty', [])
const base = over => ({ routines: [push, pull, empty], week: {}, dayPlan: {}, workouts: [], ...over })

describe('routineStats', () => {
  it('counts exercises and work sets', () => {
    expect(routineStats(push)).toMatchObject({ ex: 3, sets: 10 })
  })
  it('gives an exercise without a set count one set, like buildSets', () => {
    expect(routineStats(r('x', [{ id: 'a' }, { id: 'b', sets: 0 }])).sets).toBe(2)
  })
  it('estimates nothing for an empty routine', () => {
    expect(routineStats(empty)).toEqual({ ex: 0, sets: 0, min: 0 })
  })
})

describe('estMinutes', () => {
  it('rounds to 5 and never says less than 5 for a real session', () => {
    expect(estMinutes(3, 10)).toBe(30)   // 25 + 3 = 28 → 30
    expect(estMinutes(1, 1)).toBe(5)
  })
})

describe('sessionStats', () => {
  it('adds a combined day up', () => {
    expect(sessionStats([push, pull])).toMatchObject({ ex: 5, sets: 18 })
  })
})

describe('weekSummary', () => {
  it('counts a day once however many routines it holds', () => {
    const S = base({ week: { 1: ['push'], 3: ['pull', 'push'] } })
    expect(weekSummary(S)).toMatchObject({ days: 2, sets: 28 })
  })
  it('reads the legacy single-id weekday and skips ids that no longer exist', () => {
    const S = base({ week: { 1: 'push', 2: ['gone'] } })
    expect(weekSummary(S)).toMatchObject({ days: 1, sets: 10 })
  })
})

describe('upcomingSession', () => {
  const thu = '2026-09-24'   // a Thursday

  it("is today's session while it is still to do", () => {
    const S = base({ week: { 4: ['push'] } })
    expect(upcomingSession(S, thu)).toMatchObject({ iso: thu, offset: 0, weekday: 4, ids: ['push'] })
  })

  it('moves on to the next planned day once today is logged', () => {
    const S = base({ week: { 4: ['push'], 6: ['pull'] }, workouts: [{ d: thu }] })
    expect(upcomingSession(S, thu)).toMatchObject({ iso: '2026-09-26', offset: 2, weekday: 6, ids: ['pull'] })
  })

  it('is tomorrow on a rest day before a training day', () => {
    const S = base({ week: { 5: ['pull', 'push'] } })
    expect(upcomingSession(S, thu)).toMatchObject({ offset: 1, ids: ['pull', 'push'] })
  })

  it('follows a one-off change for a date', () => {
    const S = base({ week: { 4: ['push'] }, dayPlan: { [thu]: 'rest', '2026-09-25': 'pull' } })
    expect(upcomingSession(S, thu)).toMatchObject({ offset: 1, ids: ['pull'] })
  })

  it('skips a day whose routines have no exercises, and is null when nothing is planned', () => {
    expect(upcomingSession(base({ week: { 4: ['empty'] } }), thu)).toBe(null)
    expect(upcomingSession(base(), thu)).toBe(null)
  })
})

describe('shortDay', () => {
  it('names the weekday by its getDay() index', () => {
    expect(shortDay(1, 'en-GB')).toBe('Mon')
    expect(shortDay(0, 'en-GB')).toBe('Sun')
    expect(shortDay(6, 'pt-BR')).toBe('Sáb')
  })
})
