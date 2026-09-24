import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, DAYS, weekOrder, weekStartOf, uid, exCount, routineCount, todayISO, fmtDur } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, starterPlanSheet, planToolsSheet, startFlow } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { coachAvailable } from '../lib/coach.js'
import { routineStats, sessionStats, weekSummary, upcomingSession, shortDay } from '../lib/plan-summary.js'

const setCount = n => t(n === 1 ? '{0} set' : '{0} sets', n)
// "6 exercises · 20 sets · ~55 min" — the one technical line a routine or a session gets.
const statLine = s => s.ex ? [exCount(s.ex), setCount(s.sets), '~' + t('{0} min', s.min)].join(' · ') : exCount(0)

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const config = useStore(s => s.config)
  const coachMode = useStore(s => s.coachLocal?.mode)
  const user = useStore(s => s.user)

  /* The Coach's only entry point in the app. Its screens have existed since the UI landed and
     nothing linked to them, so the feature was reachable only by typing the URL — enabled,
     configured, and invisible. The same predicate every other Coach surface uses gates it, so
     an instance without the feature sees exactly the Plan screen it saw before. */
  const showCoach = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode })

  // Swap with the neighbour, the way the routine editor moves an exercise. `S.routines` is the
  // one order the whole app reads, so this is all there is to it (#142).
  const moveRoutine = (i, delta) => update(s => {
    const to = i + delta
    if (to < 0 || to >= s.routines.length) return
    const [moved] = s.routines.splice(i, 1)
    s.routines.splice(to, 0, moved)
  })

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  const order = weekOrder(weekStartOf(S))
  const idsOn = d => [].concat(S.week[d] || []).filter(id => S.routines.some(r => r.id === id))
  const todayWd = new Date().getDay()
  const next = upcomingSession(S, todayISO())
  const week = weekSummary(S)
  // A session already running is resumed, not started over.
  const start = () => S.active ? nav('/workout') : startFlow(next.ids)
  const when = !next ? '' : next.offset === 0 ? t('Today') : next.offset === 1 ? t('Tomorrow') : t(DAYN[next.weekday])

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    {showCoach && <button className="coach-cta" onClick={() => nav('/coach')}>
      <span className="coach-cta-av"><Icon name="sparkles" /></span>
      <span className="coach-cta-t">
        <b>{t('Coach')} <em className="coach-cta-ai">{t('AI')}</em></b>
        <span>{t('Artificial intelligence that designs and reviews your plan from your own training.')}</span>
      </span>
      <Icon name="chevronRight" className="coach-cta-chev" />
    </button>}

    {S.routines.length ? <div className="cols"><div>
      <div className="row between plan-sec"><h4 className="sec">{t('Next workout')}</h4></div>
      <div className="plan-next">
        {next ? <>
          <div className="plan-next-k">{when}</div>
          <div className="plan-next-n">{next.routines.map(r => r.name).join(' + ')}</div>
          <div className="plan-next-m">{statLine(sessionStats(next.routines))}</div>
          <Button variant="primary" icon="play" onClick={start}>{S.active ? t('Continue workout') : t('Start')}</Button>
        </> : <div className="plan-next-m">{t('Nothing scheduled yet — tap a day below to plan your week.')}</div>}
      </div>
      {/* The week, one tap per day. A day never grows with its routines any more — the sheet
          behind the tap is where a combined day is edited. */}
      <div className="plan-week">
        {order.map(d => {
          const n = idsOn(d).length
          return <button key={d} className={'plan-day' + (n ? ' on' : '') + (d === todayWd ? ' today' : '')}
            aria-label={`${t(DAYN[d])} · ${n ? routineCount(n) : t('Rest')}`} onClick={() => dayAssignSheet(d)}>
            <span className="lbl">{t(DAYS[d])}</span><span className="dot" />
          </button>
        })}
      </div>
      {week.days > 0 && <div className="plan-sum">{t('{0} training days · {1} sets · {2} per week', week.days, week.sets, '~' + fmtDur(week.min * 60000))}</div>}
    </div><div>
      <div className="row between plan-sec">
        <h4 className="sec">{t('Routines')}</h4>
        <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
      </div>
      <div className="list plan-list">{S.routines.map((r, i) => {
        const days = order.filter(d => idsOn(d).includes(r.id))
        return <div key={r.id} className="item plan-routine" {...tappable(() => nav('/plan/r/' + r.id))}>
          <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
          <div className="grow">
            <div className="plan-rt"><span className="tt">{r.name}</span>
              <span className={'plan-days' + (days.length ? ' on' : '')}>{days.length ? days.map(d => shortDay(d)).join(' · ') : '—'}</span></div>
            <div className="ss">{statLine(routineStats(r))}</div>
          </div>
          {/* The order of this list is the order of `S.routines`, and every other screen reads the
              same array — the Start screen, the day-assignment sheets, the routine pickers. So
              moving a routine here moves it everywhere, which is what the request asked for (#142). */}
          {S.routines.length > 1 && <div className="plan-move">
            <button className="iconbtn" aria-label={t('Move up')} title={t('Move up')} disabled={i === 0}
              onClick={ev => { ev.stopPropagation(); moveRoutine(i, -1) }}><Icon name="chevronUp" /></button>
            <button className="iconbtn" aria-label={t('Move down')} title={t('Move down')} disabled={i === S.routines.length - 1}
              onClick={ev => { ev.stopPropagation(); moveRoutine(i, 1) }}><Icon name="chevronDown" /></button>
          </div>}
          <Icon name="chevronRight" className="chev" /></div>
      })}</div>
    </div></div> : <>
      <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
      <Button icon="sparkles" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
    </>}
  </>
}
