// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React, { act } from 'react'
import { LANGS, DERIVED_LOCALES } from '../lib/i18n-core.js'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RoutineEdit from './RoutineEdit.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { _setLangState } from '../lib/i18n-core.js'
import de from '../locales/de.js'
import { buildPlanBundle, parsePlan } from '../lib/plan-share.js'

const cssSource = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

const mocks = vi.hoisted(() => ({ exConfigSheet: vi.fn(), menuSheet: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})) }))
vi.mock('../sheets.jsx', () => ({
  glyphPicker: vi.fn(), exercisePicker: vi.fn(), exConfigSheet: mocks.exConfigSheet, confirmSheet: vi.fn(), menuSheet: mocks.menuSheet
}))
vi.mock('../components/Media.jsx', () => ({ Thumb: () => null }))
vi.mock('../components/BodyMap.jsx', () => ({ default: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = value => JSON.parse(JSON.stringify(value))
const custom = id => ({ id, n: id, bp: 'chest', eq: 'body weight', tg: 'chest', custom: true })
const entry = (id, setup, sg) => ({
  id, sets: 3, reps: 5, weight: setup, note: `setup-${setup}`,
  ...(sg ? { sg } : {})
})

let root
let container

function setRoutine(ex) {
  const S = clone(DEF)
  S.routines = [{ id: 'r1', name: 'Move test', emoji: 'dumbbell', ex }]
  S.customEx = ['c1', 'c2', 'c3', 'c4'].map(custom)
  useStore.setState({ S, user: null })
}

function renderRoutine() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(
    <MemoryRouter initialEntries={['/routine/r1']}>
      <Routes><Route path="/routine/:id" element={<RoutineEdit />} /></Routes>
    </MemoryRouter>
  ))
}

function itemFor(name) {
  return [...container.querySelectorAll('.item')].find(item => item.textContent.includes(name))
}

// Move up / Move down live in each row's ⋮ menu. This opens it and hands back the menu item
// as a stand-in for the old inline button: its label, whether it is disabled, and a click
// that does what tapping a menu row does (nothing when disabled).
function moveButton(name, direction) {
  act(() => itemFor(name).querySelector('button.rt-more').click())
  const item = mocks.menuSheet.mock.calls.at(-1)[0].items.find(it => it && it.label === direction)
  return { label: item.label, disabled: !!item.disabled, click: () => { if (!item.disabled) item.onClick() } }
}

beforeEach(() => {
  localStorage.clear()
  mocks.exConfigSheet.mockClear()
  mocks.menuSheet.mockClear()
  _setLangState('en', null, null, null)
  root = null
  container = null
})

afterEach(() => {
  if (root) act(() => root.unmount())
  if (container) container.remove()
  _setLangState('en', null, null, null)
})

describe('routine move controls', () => {
  it('moves a selected superset member as one contiguous unit and persists complete occurrences', () => {
    setRoutine([
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g'),
      entry('c3', 30)
    ])
    renderRoutine()

    act(() => moveButton('setup-20', 'Move down').click())

    const moved = useStore.getState().S.routines[0].ex
    expect(moved).toEqual([
      entry('c3', 30),
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g')
    ])
    expect(JSON.parse(localStorage.getItem('gym_state_v1')).routines[0].ex).toEqual(moved)
  })

  it('moves the selected duplicate occurrence without aliasing its configuration', () => {
    setRoutine([
      entry('c1', 10),
      entry('c2', 20),
      entry('c1', 30)
    ])
    renderRoutine()

    act(() => moveButton('setup-30', 'Move up').click())

    expect(useStore.getState().S.routines[0].ex).toEqual([
      entry('c1', 10),
      entry('c1', 30),
      entry('c2', 20)
    ])
  })

  it('moves a standalone occurrence down with every configuration field intact', () => {
    const selected = {
      ...entry('c1', 10),
      mode: 'reps', prog: 'double', repsMin: 4, repsMax: 12,
      side: true, warmupSets: 2,
      intensifier: { type: 'restpause', pauseSec: 20 }
    }
    setRoutine([selected, entry('c2', 20), entry('c3', 30)])
    renderRoutine()

    act(() => moveButton('setup-10', 'Move down').click())

    expect(useStore.getState().S.routines[0].ex).toEqual([
      entry('c2', 20), selected, entry('c3', 30)
    ])
  })

  it('disables unit-boundary directions without cleaning or persisting state', () => {
    setRoutine([
      entry('c1', 10, 'orphan'),
      entry('c2', 20)
    ])
    renderRoutine()
    const before = useStore.getState().S

    expect(moveButton('c1', 'Move up').disabled).toBe(true)
    expect(moveButton('c2', 'Move down').disabled).toBe(true)
    act(() => moveButton('c1', 'Move up').click())

    expect(useStore.getState().S).toBe(before)
    expect(useStore.getState().S.routines[0].ex[0].sg).toBe('orphan')
    expect(localStorage.getItem('gym_state_v1')).toBeNull()
  })

  it('opening a row menu neither opens the exercise config nor changes the routine', () => {
    setRoutine([
      entry('c1', 10, 'orphan'),
      entry('c2', 20)
    ])
    renderRoutine()
    const before = useStore.getState().S
    act(() => itemFor('c1').querySelector('button.rt-more').click())

    expect(mocks.menuSheet).toHaveBeenCalledTimes(1)
    expect(mocks.exConfigSheet).not.toHaveBeenCalled()
    expect(useStore.getState().S).toBe(before)
    expect(localStorage.getItem('gym_state_v1')).toBeNull()
  })

  it('uses localized labels in the row menu and does not open config', () => {
    _setLangState('de', de, null, null)
    setRoutine([entry('c1', 10), entry('c2', 20)])
    renderRoutine()
    const more = itemFor('c2').querySelector('button.rt-more')
    expect(more.getAttribute('aria-label')).toBe(de['More'])
    const button = moveButton('c2', 'Nach oben')

    expect(button.label).toBe('Nach oben')
    act(() => button.click())

    expect(useStore.getState().S.routines[0].ex.map(e => e.id)).toEqual(['c2', 'c1'])
    expect(mocks.exConfigSheet).not.toHaveBeenCalled()
  })

  it('retains reordered occurrence order and grouping through plan export and import', () => {
    setRoutine([
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g'),
      entry('c3', 30)
    ])
    renderRoutine()
    act(() => moveButton('setup-10', 'Move down').click())

    const parsed = parsePlan(JSON.stringify(buildPlanBundle(useStore.getState().S, 'Move test')))
    expect(parsed.routines[0].ex).toEqual([
      entry('c3', 30),
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g')
    ])
  })
})

describe('superset link between rows', () => {
  const link = name => itemFor(name).closest('[data-routine-row]').querySelector('button.rt-link')

  it('joins an exercise to the one above, and the orange link separates them again', () => {
    setRoutine([entry('c1', 10), entry('c2', 20), entry('c3', 30)])
    renderRoutine()
    expect(itemFor('c1').closest('[data-routine-row]').querySelector('button.rt-link')).toBe(null)

    act(() => link('c2').click())
    let ex = useStore.getState().S.routines[0].ex
    expect(ex[0].sg).toBeTruthy()
    expect(ex[1].sg).toBe(ex[0].sg)
    expect(link('c2').getAttribute('aria-pressed')).toBe('true')

    act(() => link('c3').click())
    ex = useStore.getState().S.routines[0].ex
    expect(ex[2].sg).toBe(ex[0].sg)

    act(() => link('c2').click())
    ex = useStore.getState().S.routines[0].ex
    expect(ex[0].sg).toBeUndefined()
    expect(ex[1].sg).toBeTruthy()
    expect(ex[2].sg).toBe(ex[1].sg)
    expect(mocks.exConfigSheet).not.toHaveBeenCalled()
  })
})

describe('routine move-control locale coverage', () => {
  const packs = import.meta.glob('../locales/*.js', { eager: true, import: 'default' })

  it('defines both accessible names in every non-English locale pack', () => {
    expect(Object.keys(packs)).toHaveLength(Object.keys(LANGS).filter(c => c !== 'en' && !DERIVED_LOCALES[c]).length)
    Object.entries(packs).forEach(([path, pack]) => {
      expect(pack, `${path} is missing Move up`).toHaveProperty('Move up')
      expect(pack, `${path} is missing Move down`).toHaveProperty('Move down')
    })
  })
})
