// Rendering for the admin activity log (GET /api/admin/audit).
//
// The server stores reason codes, not sentences — `{ ev: 'auth.login.fail', msg: 'unknown-credential' }`
// rather than "someone tried a passkey we don't know". Turning those into English
// belongs here and not in Admin.jsx: it is the only part of the feature that can be wrong in a way
// a person sees, and as a plain module it is testable without mounting the dashboard.
//
// Like the rest of the admin screen this is hard-coded (pt-BR in RestoFit) — the operator surface
// deliberately stays out of the per-language string packs (see the header of views/Admin.jsx). Times still
// follow the UI language, the way numbers and dates already do.
import { dateLocale } from './i18n-core.js'

// The first segment of an event name is also the filter chip it belongs to.
export const auditCat = ev => String(ev || '').split('.')[0]

const LABELS = {
  'auth.login.ok': 'Entrou',
  'auth.login.fail': 'Falha ao entrar',
  'auth.register.ok': 'Criou um perfil',
  'auth.register.fail': 'Falha ao criar perfil',
  'auth.register.denied': 'Cadastro recusado',
  'auth.logout': 'Saiu',
  'auth.logout.all': 'Saiu de todos os dispositivos',
  // Device pairing (Settings → "Pair the mobile app"): the code is minted in a signed-in browser
  // tab and redeemed by the app, so "ok" is the phone coming online, not a sign-in.
  'auth.pair.create': 'Criou um código de pareamento',
  'auth.pair.ok': 'Pareou um celular',
  'auth.pair.fail': 'Falha no pareamento',
  'admin.user.disable': 'Desativou uma conta',
  'admin.user.enable': 'Reativou uma conta',
  'admin.user.delete': 'Excluiu uma conta',
  'admin.invite.create': 'Criou um código de convite',
  'admin.invite.revoke': 'Revogou um código de convite',
  'admin.audit.clear': 'Limpou o registro de atividades',
  'admin.denied': 'Bloqueado no painel de admin'
}
// An unknown event is shown raw rather than dropped or rendered as "undefined": a dashboard
// that is one version behind the server should still say *something* truthful.
export const auditLabel = ev => LABELS[ev] || String(ev || 'Evento desconhecido')

const REASONS = {
  'challenge-expired': 'o login demorou demais e expirou',
  'unknown-credential': 'passkey desconhecida',
  'verify-error': 'não foi possível verificar a passkey',
  'not-verified': 'a passkey foi rejeitada',
  'user-missing': 'a passkey aponta para um perfil que não existe mais',
  'account-disabled': 'a conta está desativada',
  'credential-exists': 'essa passkey já pertence a um perfil',
  'invite-invalid': 'o código de convite foi usado ou revogado nesse meio-tempo',
  'invite-rejected': 'código de convite errado ou já usado',
  'code-invalid': 'código de pareamento errado ou expirado',
  'user-unavailable': 'o perfil do código de pareamento está desativado ou não existe mais'
}
export const auditReason = msg => REASONS[msg] || (msg ? String(msg) : '')

// → { title, sub }. `sub` is the house "a · b · c" metadata line used by every list row.
export function auditLine(e) {
  if (!e) return { title: '', sub: '' }
  const parts = []
  if (e.name) parts.push(e.name)
  else if (e.uid) parts.push(e.uid)
  else if (!e.ok) parts.push('origem desconhecida')
  if (e.tname) parts.push('→ ' + e.tname)
  // The reason codes and the invite codes share the msg field; only failures read as a reason.
  if (e.msg) parts.push(e.ok ? e.msg : auditReason(e.msg))
  if (e.ip) parts.push(e.ip)
  return { title: auditLabel(e.ev), sub: parts.join(' · ') }
}

// The activity log is the one place in the app that needs a clock, and fmtDate() renders none —
// it is used by every other view and is not worth changing for this.
export function fmtWhen(ts, now = Date.now()) {
  if (!ts) return ''
  const d = new Date(ts)
  const time = d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
  const n = new Date(now)
  const sameDay = d.toDateString() === n.toDateString()
  if (sameDay) return 'hoje ' + time
  if (now - ts < 6 * 86400000 && ts <= now) return d.toLocaleDateString(dateLocale(), { weekday: 'short' }) + ' ' + time
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) + ' ' + time
}
