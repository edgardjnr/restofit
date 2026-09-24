// @vitest-environment happy-dom
// The Plan week is a strip of day buttons; the sheet behind each one is where a day's routines
// are set. Every routine is a check that stays open, so a combined day is two taps.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { dayAssignSheet } from './sheets.jsx'

const clone = v => JSON.parse(JSON.stringify(v))
const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const rowFor = (host, name) => [...host.querySelectorAll('.item')].find(el => el.querySelector('.tt')?.textContent === name)
const click = el => act(() => { el.click() })

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  document.body.innerHTML = ''
  const S = clone(useStore.getState().S)
  S.routines = [
    { id: 'push', name: 'Push', emoji: null, ex: [{ id: '0025', sets: 3 }] },
    { id: 'core', name: 'Core', emoji: null, ex: [] },
  ]
  S.week = {}
  useStore.setState({ S, user: null })
})
afterEach(() => { act(() => { mounted.splice(0).forEach(r => r.unmount()) }) })

describe('day assign sheet', () => {
  it('adds routines to a day one tap each, and stays open', () => {
    dayAssignSheet(1)
    const host = renderTop()
    click(rowFor(host, 'Push'))
    click(rowFor(host, 'Core'))
    expect(useStore.getState().S.week[1]).toEqual(['push', 'core'])
    expect(useUI.getState().sheets.length).toBe(1)
    expect(rowFor(host, 'Push').getAttribute('aria-checked')).toBe('true')
  })

  it('unticking the last routine drops the day key instead of storing []', () => {
    useStore.setState(s => ({ S: { ...s.S, week: { 1: ['push'] } } }))
    dayAssignSheet(1)
    const host = renderTop()
    click(rowFor(host, 'Push'))
    expect(useStore.getState().S.week).not.toHaveProperty('1')
  })

  it('Rest day clears a combined day', () => {
    useStore.setState(s => ({ S: { ...s.S, week: { 3: ['push', 'core'] } } }))
    dayAssignSheet(3)
    const host = renderTop()
    click(rowFor(host, 'Rest day'))
    expect(useStore.getState().S.week).not.toHaveProperty('3')
  })

  it('Done closes the sheet', () => {
    dayAssignSheet(1)
    const host = renderTop()
    click([...host.querySelectorAll('button')].find(b => b.textContent === 'Done'))
    expect(useUI.getState().sheets.length).toBe(0)
  })
})
