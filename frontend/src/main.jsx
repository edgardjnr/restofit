import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import { setLang } from './lib/i18n.js'
import './index.css'

// App.jsx restores per-route scroll itself; the browser's own attempt races it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// RestoFit defaults to pt-BR. Load the saved language (or pt-BR) before the first render so the
// screen never flashes English while App.jsx's own setLang is still fetching the locale pack.
const savedLang = (() => { try { return JSON.parse(localStorage.getItem('gym_state_v1'))?.lang } catch { return null } })()
setLang(savedLang || 'pt-BR').catch(() => {}).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode><App /></StrictMode>
  )
})

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
