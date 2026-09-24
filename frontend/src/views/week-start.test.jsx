// @vitest-environment happy-dom
// The setting is only worth anything if the screens actually follow it: the toggle has to
// write the field, and the Plan list has to draw the week in that order.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings.jsx'
import Plan from './Plan.jsx'
import { dayAssignSheet } from '../sheets.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
    replaceState: vi.fn(), setUser: vi.fn(), pullState: vi.fn(), pushState: vi.fn(),
    signOut: vi.fn(), signOutAll: vi.fn(), resetDemo: vi.fn(), disconnectServer: vi.fn(),
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => (selector ? selector(mocks.snapshot()) : mocks.snapshot())
  useStore.getState = mocks.snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: vi.fn(), openSheet: vi.fn() })
  const useUI = selector => (selector ? selector(snap()) : snap())
  useUI.getState = snap
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(), webauthnOK: () => false, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(), IS_ANDROID: false,
}))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))
vi.mock('../lib/wakelock.js', () => ({ wakeLockSupported: () => false }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, isAndroid: () => Promise.resolve(false), shareExport: vi.fn(), syncReminder: vi.fn() }))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(),
  importFromHevy: vi.fn(), equipmentProfileSheet: vi.fn(),
  dayAssignSheet: vi.fn(), planToolsSheet: vi.fn(), startFlow: vi.fn(),
}))

globalThis.__APP_VERSION__ ??= 'test'

let host, root
beforeEach(() => {
  mocks.S = {
    unit: 'kg', restSec: 90, restPauseSec: 15, sound: false, effort: 'none',
    gifSize: 'full', workouts: [], routines: [], exWeights: {}, week: {}, dayPlan: {},
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const segButton = label => [...host.querySelectorAll('.seg button')].find(b => b.textContent === label)
// The Plan week is a strip of day buttons; each one's accessible name starts with the full day.
const dayRows = () => [...host.querySelectorAll('.plan-day')].map(b => b.getAttribute('aria-label').split(' · ')[0])

describe('Settings — week starts on', () => {
  const mount = () => act(() => root.render(<Settings />))

  it('offers Monday and Sunday and writes the getDay() index', () => {
    mount()
    expect(segButton('Monday').getAttribute('aria-pressed')).toBe('true')
    act(() => { segButton('Sunday').click() })
    expect(mocks.S.weekStart).toBe(0)
    mount()
    expect(segButton('Sunday').getAttribute('aria-pressed')).toBe('true')
    act(() => { segButton('Monday').click() })
    expect(mocks.S.weekStart).toBe(1)
  })

  it('shows a profile written before the setting existed as Monday', () => {
    delete mocks.S.weekStart
    mount()
    expect(segButton('Monday').getAttribute('aria-pressed')).toBe('true')
    expect(segButton('Sunday').getAttribute('aria-pressed')).toBe('false')
  })
})

describe('Plan — the week schedule follows the setting', () => {
  const mount = () => act(() => root.render(<Plan />))
  // With no routines the screen is the starter-plan offer, not a week.
  beforeEach(() => { mocks.S.routines = [{ id: 'r1', name: 'Push', emoji: null, ex: [] }] })

  it('runs Monday to Sunday by default', () => {
    mount()
    expect(dayRows().slice(0, 7)).toEqual(
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
  })

  it('runs Sunday to Saturday for a Sunday profile', () => {
    mocks.S.weekStart = 0
    mount()
    expect(dayRows().slice(0, 7)).toEqual(
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  })

  it('keeps a routine attached to its day, not to its position in the list', () => {
    mocks.S.week = { 0: 'r1' }        // Sunday
    mocks.S.weekStart = 0
    mount()
    const days = [...host.querySelectorAll('.plan-day')]
    expect(days[0].getAttribute('aria-label')).toBe('Sunday · 1 routine')
    expect(days[0].classList.contains('on')).toBe(true)
    expect(days[1].getAttribute('aria-label')).toBe('Monday · Rest')
    expect(host.querySelector('.plan-routine .plan-days').textContent).toBe('Sun')
  })
})

describe('Plan — a day is edited from its button (combine routines)', () => {
  const mount = () => act(() => root.render(<Plan />))
  const dayButton = name => [...host.querySelectorAll('.plan-day')].find(b => b.getAttribute('aria-label').startsWith(name + ' · '))

  beforeEach(() => {
    mocks.S.routines = [
      { id: 'r1', name: 'Push', emoji: null, ex: [{ id: 'a' }, { id: 'b' }] },
      { id: 'r2', name: 'Core', emoji: null, ex: [{ id: 'c' }] },
    ]
    dayAssignSheet.mockClear()
  })

  it('a combined day stays one button, marked and counted', () => {
    mocks.S.week = { 1: ['r1', 'r2'] }
    mount()
    expect(dayButton('Monday').classList.contains('on')).toBe(true)
    expect(dayButton('Monday').getAttribute('aria-label')).toBe('Monday · 2 routines')
    expect(dayButton('Tuesday').classList.contains('on')).toBe(false)
  })

  it('tapping a day opens its sheet with the getDay() index', () => {
    mocks.S.week = {}
    mount()
    act(() => { dayButton('Tuesday').click() })
    expect(dayAssignSheet).toHaveBeenCalledWith(2)
  })

  it('each routine row lists the days it is on, in week order', () => {
    mocks.S.week = { 6: ['r1'], 1: ['r1', 'r2'] }
    mount()
    const days = [...host.querySelectorAll('.plan-routine .plan-days')].map(e => e.textContent)
    expect(days).toEqual(['Mon · Sat', 'Mon'])
  })
})
