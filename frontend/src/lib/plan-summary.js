// The numbers the Plan screen reads at a glance: what a routine weighs (exercises, work sets, a
// rough duration), what the whole week adds up to, and which session comes next.
import { effectiveRoutines, effectiveRoutineIds, nextTrainingDay } from './history.js'
import { dateLocale, t } from './i18n-core.js'
import { exCount } from './format.js'

// The same floor buildSets uses: an exercise without a set count still starts with one set.
const setsOf = e => Math.max(1, Number(e?.sets) || 1)

// A rough session length: ~2.5 min per work set (the set plus its rest) and ~1 min per
// exercise to set up, rounded to 5. It is a label for planning, not a timer.
export const estMinutes = (exN, sets) => sets ? Math.max(5, Math.round((sets * 2.5 + exN) / 5) * 5) : 0

export function routineStats(r) {
  const ex = r?.ex || []
  const sets = ex.reduce((n, e) => n + setsOf(e), 0)
  return { ex: ex.length, sets, min: estMinutes(ex.length, sets) }
}

// Several routines trained as one session (a combined day) add up.
export function sessionStats(routines) {
  const ex = routines.reduce((n, r) => n + (r.ex || []).length, 0)
  const sets = routines.reduce((n, r) => n + routineStats(r).sets, 0)
  return { ex, sets, min: estMinutes(ex, sets) }
}

// Days with at least one routine, and the sets and minutes the weekly plan asks for. A day is
// counted once however many routines it holds, the same as the Home screen's weekly target.
export function weekSummary(S) {
  let days = 0, sets = 0, min = 0
  for (const ids of Object.values(S.week || {})) {
    const rs = [].concat(ids || []).map(id => S.routines.find(r => r.id === id)).filter(Boolean)
    if (!rs.length) continue
    days++
    const s = sessionStats(rs)
    sets += s.sets
    min += s.min
  }
  return { days, sets, min }
}

// Today's session while it is still to do, otherwise the next planned day within a week.
// `offset` is days from `iso` (0 today, 1 tomorrow). Null when nothing with exercises is planned.
export function upcomingSession(S, iso) {
  const today = effectiveRoutines(S, iso)
  const doneToday = (S.workouts || []).some(w => w.d === iso)
  if (!doneToday && today.some(r => (r.ex || []).length)) {
    return { iso, offset: 0, weekday: new Date(iso + 'T12:00:00').getDay(), routines: today, ids: effectiveRoutineIds(S, iso) }
  }
  const next = nextTrainingDay(S, iso)
  if (!next) return null
  const offset = Math.round((new Date(next.iso + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 864e5)
  return { iso: next.iso, offset, weekday: next.weekday, routines: next.routines, ids: effectiveRoutineIds(S, next.iso) }
}

// "Seg", "Sáb", "Mon": the short weekday name from the platform, so no locale pack needs a
// key per day. 2024-01-07 is a Sunday, so day `wd` (a getDay() index) is the 7th + wd.
export function shortDay(wd, locale = dateLocale()) {
  const s = new Date(2024, 0, 7 + wd, 12).toLocaleDateString(locale, { weekday: 'short' }).replace(/\.$/, '')
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1)
}

export const setCount = n => t(n === 1 ? '{0} set' : '{0} sets', n)
// "6 exercises · 20 sets · ~55 min" — the one technical line a routine or a session gets.
export const statLine = s => s.ex ? [exCount(s.ex), setCount(s.sets), '~' + t('{0} min', s.min)].join(' · ') : exCount(0)
