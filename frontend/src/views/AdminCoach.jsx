import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import Icon from '../components/Icon.jsx'
import { Button, Switch, TextField } from '../components/ui.jsx'

/* The operator's side of the Coach, laid out as a guided setup: one master switch, numbered
   steps that each say what they are for, and everything an owner rarely needs folded away
   under "Advanced" and "Activity". Like the rest of the admin dashboard this is hard-coded
   (pt-BR in RestoFit) — it isn't part of the translated end-user surface.

   What it never shows: anybody's intake answers, payloads or proposals. An admin can enable
   the feature and see that jobs ran; they cannot read what their users asked it.

   This is the ONLY place the Coach can be switched off for everyone. Users can decline the
   consent screen for themselves, but they cannot disable the feature — that is an operator
   decision, so it lives with the operator. */

const rel = ts => {
  if (!ts) return 'nunca'
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'agora mesmo'
  if (s < 3600) return 'há ' + Math.floor(s / 60) + ' min'
  if (s < 86400) return 'há ' + Math.floor(s / 3600) + ' h'
  return 'há ' + Math.floor(s / 86400) + ' d'
}

// Which chips go under which heading. Runtime-backed providers are the ones that need the
// bigger `coach` image; the fixture exists so the whole loop can be walked without any account.
const RUNTIME_IDS = ['claude', 'codex']
const TESTING_IDS = ['fixture']

export default function AdminCoach() {
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(false)
  // The models the endpoint serves, fetched on demand. Seeded from the status call when the
  // stored key already let it list them.
  const [models, setModels] = useState(null)
  // The last "Test the Coach" outcome, shown inline where the button is rather than only as a
  // toast that is gone before anyone has read the provider's reason.
  const [testResult, setTestResult] = useState(null)

  const load = () => api('/api/admin/coach').then(r => { setD(r); setModels(r.knownModels || null) }).catch(e => toast(e.message || 'Falha ao carregar'))
  useEffect(() => { load() }, [])

  const patch = async body => {
    setBusy(true)
    try { await api('/api/admin/coach/config', { method: 'POST', body: JSON.stringify(body) }); await load() }
    catch (e) { toast(e.message) }
    setBusy(false)
  }
  const loadModels = async () => {
    setBusy(true)
    try {
      const r = await api('/api/admin/coach/models', { method: 'POST', body: '{}' })
      if (r.ok) { setModels(r.models); toast(r.models.length + ' modelos') } else toast(r.error || 'Não foi possível listar os modelos')
    } catch (e) { toast(e.message) }
    setBusy(false)
  }
  const test = async () => {
    setBusy(true); setTestResult({ pending: true })
    try {
      const r = await api('/api/admin/coach/test', { method: 'POST', body: '{}' })
      setTestResult(r)
      toast(r.ok ? 'Teste do Coach aprovado ✅' : 'O teste falhou')
      await load()
    } catch (e) { setTestResult({ ok: false, error: e.message }); toast(e.message) }
    setBusy(false)
  }
  const disconnect = async () => {
    setBusy(true)
    try { await api('/api/admin/coach/disconnect', { method: 'POST', body: JSON.stringify({ provider: d.provider }) }); toast('Credencial removida'); await load() }
    catch (e) { toast(e.message) }
    setBusy(false)
  }

  if (!d) return <div className="card"><div className="muted small">Carregando status do Coach…</div></div>

  if (d.disabledByEnv) return <div className="card">
    <h2 style={{ margin: '0 0 6px' }}>AI Coach</h2>
    <div className="adm-lead">Desativado à força por <code>COACH_DISABLED</code> no ambiente do servidor. Remova essa variável e reinicie para configurar o Coach aqui.</div>
  </div>

  const meta = d.providers.find(p => p.id === d.provider) || {}
  const authState = d.auth?.state
  const authed = authState === 'connected' || authState === 'not-required' || authState === 'optional'
  const needsEndpoint = !!meta.baseUrl
  const hasEndpoint = !needsEndpoint || !!d.baseUrl
  const live = d.enabled && d.runtime.ok && authed && hasEndpoint

  const status = !d.enabled ? 'Desligado: ninguém vê o Coach em nenhum lugar do app.'
    : live ? <>Ligado · {meta.label}{d.model ? ' · ' + d.model : ''}</>
      : !hasEndpoint ? 'Ligado, mas ainda sem endpoint: conclua o passo 2.'
        : !authed ? 'Ligado, mas ainda sem credencial: conclua o passo Credencial.'
          : !d.runtime.ok ? 'Ligado, mas não foi possível falar com o provedor: veja o passo Teste.'
            : 'Ligado'

  // Chips, grouped.
  const groups = [
    { title: 'Colar uma chave de API', hint: 'HTTPS direto para o provedor. Funciona com a imagem padrão da api, sem instalar nada a mais.', items: d.providers.filter(p => p.http) },
    { title: 'Roda um runtime de IA local', hint: 'Precisa da imagem maior da api, buildada com --target coach.', items: d.providers.filter(p => RUNTIME_IDS.includes(p.id)) },
    { title: 'Teste', hint: 'Um provedor de mentira embutido que responde na hora, para testar o fluxo inteiro sem conta nenhuma.', items: d.providers.filter(p => TESTING_IDS.includes(p.id)) }
  ]

  const hasCredentialStep = !!(meta.setupToken || meta.apiKey)
  const step1Done = !!d.provider
  const step2Done = hasEndpoint
  const step3Done = authed
  const step4Done = !!d.model
  const step5Done = !!testResult?.ok || !!d.lastSuccess
  // Step numbers only count the steps this provider actually shows — and like any wizard,
  // only the first unfinished step stands open; everything done folds to its summary line.
  const flags = [step1Done, ...(needsEndpoint ? [step2Done] : []), ...(hasCredentialStep ? [step3Done] : []), step4Done, step5Done]
  const doneCount = flags.filter(Boolean).length
  const firstTodo = flags.indexOf(false)
  let n = 1
  let idx = 0
  const num = () => n++
  const stepAt = () => { const i = idx++; return { open: i === (firstTodo === -1 ? -1 : firstTodo), key: i + ':' + (i === firstTodo) } }

  // Off = a quiet, optional feature: one clean pitch and one button, no half-dimmed controls.
  if (!d.enabled) return <div className="card">
    <div className="adm-hero">
      <div className="adm-hero-av"><Icon name="sparkles" /></div>
      <h2>AI Coach</h2>
      <p>Um coach opcional que monta planos de treino e revisa o que as pessoas realmente registram. Está desligado agora: ninguém vê o Coach em nenhum lugar do app.</p>
      <div className="adm-hero-feats">
        <div><Icon name="clipboard" /><span><b>Use qualquer IA.</b> Uma chave de API da Anthropic, OpenAI ou Gemini, ou um modelo local gratuito via Ollama.</span></div>
        <div><Icon name="shield" /><span><b>Privado por padrão.</b> Uma lista restrita decide o que sai do servidor; toda mudança precisa do sim do usuário e pode ser desfeita.</span></div>
        <div><Icon name="person" /><span><b>Cada usuário decide.</b> Ligar aqui só deixa o Coach disponível; cada pessoa dá o próprio consentimento.</span></div>
      </div>
      <Button variant="primary" icon="sparkles" disabled={busy} onClick={() => patch({ enabled: true })}>Configurar o Coach</Button>
    </div>
  </div>

  return <div className="card" style={{ borderColor: live ? 'var(--acc)' : undefined }}>
    <div className="row between" style={{ marginBottom: 2 }}>
      <h2 style={{ margin: 0 }}>AI Coach</h2>
      <Switch checked={!!d.enabled} disabled={busy} onChange={v => patch({ enabled: v })} />
    </div>
    <div className="adm-status">
      <span className={'adm-pill ' + (live ? 'ok' : 'warn')}>{live ? 'pronto' : 'não pronto'}</span>
      <span>{status}</span>
    </div>
    {!live && <div className="adm-progress" aria-hidden="true"><i style={{ width: Math.round(doneCount / flags.length * 100) + '%' }} /></div>}
    <div className="adm-lead">
      {live ? 'Os usuários encontram o Coach em Plano → Coach. Esta chave é o único lugar onde ele pode ser desligado para todos.'
        : `${doneCount} de ${flags.length} passos concluídos: termine o passo aberto e o próximo se abre.`}
    </div>

    {d.enabled && <>
      {/* ---------- provider ---------- */}
      <Step n={num()} title="Provedor" hint={meta.label || 'Qual IA responde pelo Coach'} done={step1Done} {...stepAt()}>
        <div className="adm-hint">Escolha quem responde. A chave ou token salvo fica com o respectivo provedor, então dá para alternar entre eles sem colar de novo.</div>
        {groups.map(g => !!g.items.length && <div key={g.title} className="adm-group">
          <div className="adm-group-t">{g.title}</div>
          <div className="adm-chips">
            {g.items.map(p => <button key={p.id} className={'chip' + (p.id === d.provider ? ' on' : '')} disabled={busy}
              onClick={() => { setTestResult(null); patch({ provider: p.id }) }}>
              {p.label}{p.connected && <span className="adm-chip-key">chave salva</span>}
            </button>)}
          </div>
          <div className="adm-hint" style={{ margin: '6px 0 0' }}>{g.hint}</div>
        </div>)}
      </Step>

      {/* ---------- endpoint (compatible only) ---------- */}
      {needsEndpoint && <Step n={num()} title="Endpoint" hint={d.baseUrl || 'Onde o modelo roda'} done={step2Done} {...stepAt()}>
        <div className="adm-hint">O endereço de qualquer servidor compatível com a API de chat da OpenAI: <b>Ollama</b>, <b>LM Studio</b>, <b>vLLM</b>, <b>OpenRouter</b> ou um gateway próprio. Só a base: sem <code>/v1</code> e sem chave na URL.</div>
        <div className="adm-field">
          <label>URL base</label>
          <TextField key={d.baseUrl || ''} defaultValue={d.baseUrl || ''} placeholder="http://ollama:11434  ou  https://openrouter.ai/api" inputMode="url" autoCapitalize="none" autoCorrect="off"
            onBlur={e => e.target.value !== (d.baseUrl || '') && patch({ baseUrl: e.target.value })} />
        </div>
        <div className="adm-hint" style={{ margin: 0 }}>O host fica gravado no log de execuções, então dá para ver sempre para onde as requisições foram.</div>
      </Step>}

      {/* ---------- credential ---------- */}
      {hasCredentialStep && <Step n={num()} title="Credencial" hint={credentialHint(d.auth, meta)} done={step3Done} {...stepAt()}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <CredentialPill auth={d.auth} />
        </div>
        {authState === 'connected' ? <>
          <div className="adm-hint">Conectado{d.auth.account ? ' como ' + d.auth.account : ''} via {credentialLabel(d.auth.type)}{d.auth.connectedAt ? ' · adicionado ' + rel(d.auth.connectedAt) : ''}. A chave fica guardada criptografada e nunca mais é exibida.</div>
          <div className="adm-actions">
            {meta.apiKey && <Button size="sm" variant="tinted" icon="lock" disabled={busy}
              onClick={() => openSheet(close => <ApiKeySheet close={close} onDone={load} label={meta.label} placeholder={meta.keyPlaceholder} optional={meta.keyOptional} />)}>Trocar chave</Button>}
            <Button size="sm" danger disabled={busy} onClick={disconnect}>Remover</Button>
          </div>
        </> : <>
          {authState === 'unreadable' && <div className="adm-hint" style={{ color: 'var(--red)' }}>
            Não foi possível descriptografar a credencial salva. Normalmente isso acontece quando o <code>./data</code> foi restaurado sem o arquivo <code>secret</code>. Adicione a chave de novo para resolver.
          </div>}
          {authState === 'optional' && <div className="adm-hint">Este endpoint funciona sem chave. Só adicione uma se o seu servidor pedir (o OpenRouter pede; um modelo na sua própria rede normalmente não).</div>}
          {authState === 'none' && <div className="adm-hint">{meta.setupToken
            ? 'Cole um setup token do Claude Code (sua assinatura) ou uma chave de API da Anthropic (pago por uso).'
            : 'Cole uma chave de API do console do provedor. Ela fica guardada criptografada neste servidor e só é enviada ao provedor enquanto uma execução roda.'}</div>}
          <div className="adm-actions">
            {meta.setupToken && <Button size="sm" variant="primary" icon="key" disabled={busy}
              onClick={() => openSheet(close => <SetupTokenSheet close={close} onDone={load} label={meta.label} />)}>Adicionar token do Claude Code</Button>}
            {meta.apiKey && <Button size="sm" variant={meta.setupToken ? undefined : 'primary'} icon="lock" disabled={busy}
              onClick={() => openSheet(close => <ApiKeySheet close={close} onDone={load} label={meta.label} placeholder={meta.keyPlaceholder} optional={meta.keyOptional} />)}>
              {meta.keyOptional ? 'Adicionar chave de API (opcional)' : 'Adicionar chave de API'}</Button>}
          </div>
        </>}
      </Step>}

      {/* ---------- model ---------- */}
      <Step n={num()} title="Modelo" hint={d.model || (meta.defaultModel ? 'padrão: ' + meta.defaultModel : 'ainda não escolhido')} done={step4Done} {...stepAt()}>
        <div className="adm-hint">{meta.http
          ? 'Qual modelo o provedor deve usar. "Listar modelos" pede ao provedor a lista atual, então nada aqui fica desatualizado.'
          : 'Opcional. Deixe vazio para usar o padrão do próprio runtime.'}</div>
        <div className="adm-field">
          <label>Modelo</label>
          {models && models.length
            ? <select className="adm-select" value={models.includes(d.model) ? d.model : ''} disabled={busy} onChange={e => patch({ model: e.target.value })}>
              <option value="">{meta.defaultModel ? `Padrão (${meta.defaultModel})` : 'Escolha um modelo…'}</option>
              {d.model && !models.includes(d.model) && <option value={d.model}>{d.model} (fora da lista)</option>}
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            : <TextField key={d.provider} defaultValue={d.models?.[d.provider] || ''} placeholder={meta.defaultModel ? `Padrão: ${meta.defaultModel}` : needsEndpoint ? 'ex.: qwen2.5:3b, ou toque em "Listar modelos"' : '(padrão do runtime)'}
              onBlur={e => e.target.value !== (d.models?.[d.provider] || '') && patch({ model: e.target.value })} />}
        </div>
        {meta.http && <div className="adm-actions">
          <Button size="sm" variant="tinted" icon="reset" disabled={busy} onClick={loadModels}>{models ? 'Atualizar lista' : 'Listar modelos'}</Button>
          {models && models.length ? <span className="dim small" style={{ alignSelf: 'center' }}>{models.length} disponíveis no provedor</span> : null}
        </div>}
      </Step>

      {/* ---------- test ---------- */}
      <Step n={num()} title="Teste" hint={step5Done ? 'aprovado' : 'uma chamada real, sem dados de usuário'} done={step5Done} {...stepAt()} forceOpen={!!testResult}>
        <div className="adm-hint">Envia uma pergunta curta ao provedor e confere a resposta. Nenhum dado de treino é usado. Faça isso depois de cada mudança acima.</div>
        <div className="adm-actions">
          <Button size="sm" variant="primary" icon="check" disabled={busy || !authed || !hasEndpoint} onClick={test}>Testar o Coach</Button>
        </div>
        {(!authed || !hasEndpoint) && <div className="adm-hint" style={{ margin: '6px 0 0' }}>
          {!hasEndpoint ? 'Conclua primeiro o passo Endpoint.' : 'Conclua primeiro o passo Credencial.'}
        </div>}
        {testResult && <div className={'adm-result ' + (testResult.pending ? '' : testResult.ok ? 'ok' : 'bad')}>
          {testResult.pending ? 'Consultando o provedor…'
            : testResult.ok ? <><b>Aprovado</b>{testResult.version ? 'Provedor: ' + testResult.version : 'O provedor respondeu como esperado.'}</>
              : <><b>Falhou</b>{testResult.error || 'O provedor não respondeu.'}</>}
        </div>}
        <div className="adm-kv" style={{ marginTop: 10 }}>
          <span className="k">Runtime</span>
          <span className="v">{d.runtime.ok ? <span className="adm-pill ok">pronto</span> : <span className="adm-pill bad">ausente</span>}{d.runtime.version ? <div className="dim small">{d.runtime.version}</div> : null}{!d.runtime.ok && d.runtime.error ? <div className="small" style={{ color: 'var(--red)' }}>{d.runtime.error}</div> : null}</span>
        </div>
      </Step>

      {/* ---------- advanced ---------- */}
      <details className="adm-fold">
        <summary>Avançado <Icon name="chevronRight" className="chev" /></summary>
        <div className="adm-fold-b">
          <div className="adm-group-t">Limites</div>
          <div className="adm-hint">Quantas execuções do Coach são permitidas por dia. Cada execução é uma requisição na conta do provedor acima. 0 significa sem limite.</div>
          <div className="adm-kv"><span className="k">Por usuário, por dia</span>
            <span className="v"><input className="num" type="number" min="0" max="200" defaultValue={d.caps.perProfileDaily} disabled={busy}
              onBlur={e => +e.target.value !== d.caps.perProfileDaily && patch({ caps: { ...d.caps, perProfileDaily: +e.target.value } })} /></span></div>
          <div className="adm-kv"><span className="k">Instância inteira, por dia</span>
            <span className="v"><input className="num" type="number" min="0" max="5000" defaultValue={d.caps.instanceDaily} disabled={busy}
              onBlur={e => +e.target.value !== d.caps.instanceDaily && patch({ caps: { ...d.caps, instanceDaily: +e.target.value } })} /></span></div>

          <div className="adm-group-t" style={{ marginTop: 14 }}>Comparar com outras pessoas</div>
          <div className="row between" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="adm-hint" style={{ margin: 0 }}>
              <b>Permitir que as pessoas se comparem.</b> Medianas anônimas (1RM estimado, treinos por semana) entre os perfis que aceitarem participar; é preciso pelo menos três compartilhando antes de alguém ver um número. Cada pessoa ativa isso por conta própria no chat do Coach e não vê nada se não ativar.
            </div>
            <Switch checked={!!d.community} disabled={busy} onChange={v => patch({ community: v })} />
          </div>

          <div className="adm-group-t" style={{ marginTop: 14 }}>Qual conta paga</div>
          <div className="adm-hint">{d.authMode === 'profile'
            ? 'Cada perfil entra com a própria conta.'
            : d.auth?.type === 'apikey' || meta.http
              ? 'Uma chave de API para a instância inteira: todos os perfis podem usar o Coach com ela, e os limites diários acima é que controlam o gasto.'
              : d.boundUid
                ? 'Uma conta pessoal, já em uso por um perfil. Todos os outros perfis são recusados, para ninguém gastar a assinatura de outra pessoa.'
                : 'Uma conta pessoal. O primeiro perfil que usar passa a ser o único permitido, e todos os outros são recusados. Cole uma chave de API se a instância inteira deve ter o Coach.'}</div>

          <div className="adm-group-t" style={{ marginTop: 14 }}>Isolamento</div>
          <div className="adm-hint">{d.unprivileged && !d.unprivileged.ok
            ? <span style={{ color: 'var(--red)' }}>Execuções bloqueadas: {d.unprivileged.why}. Nada roda até isso ser corrigido.</span>
            : d.unprivileged?.dropped
              ? 'As execuções rodam com um usuário separado, sem privilégios, que não consegue ler a pasta de dados nem os segredos.'
              : d.unprivileged?.why?.includes('no child process')
                ? 'Não é necessário para este provedor: ele só faz uma requisição HTTPS e não inicia nenhum programa neste servidor.'
                : 'As execuções rodam com o próprio usuário do servidor neste host (não há usuário separado para usar).'}</div>
        </div>
      </details>

      {/* ---------- activity ---------- */}
      <details className="adm-fold">
        <summary>Atividade <Icon name="chevronRight" className="chev" /></summary>
        <div className="adm-fold-b">
          <div className="tiles" style={{ textAlign: 'left', marginBottom: 10 }}>
            <div className="tile"><div className="l">Execuções hoje</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.jobsToday}</div></div>
            <div className="tile"><div className="l">Último sucesso</div><div className="v" style={{ fontSize: '.85rem' }}>{rel(d.lastSuccess?.at)}</div></div>
          </div>
          {d.lastError && <>
            <div className="adm-group-t">Última falha</div>
            <div className="adm-result bad" style={{ marginTop: 0, marginBottom: 10 }}>
              <b>{failureTitle(d.lastError.errorClass)}</b>
              {d.lastError.detail ? <span className="small">{d.lastError.detail}</span> : null}
              <div className="dim" style={{ fontSize: '.72rem', marginTop: 4 }}>{rel(d.lastError.at)}</div>
            </div>
          </>}
          <div className="adm-group-t">Execuções recentes</div>
          {d.recent?.length ? <div className="adm-log">
            {d.recent.slice(0, 10).map((e, i) => <div key={i} className="adm-log-row">
              <span>{e.kind === 'create' ? 'Plano' : 'Revisão'}{e.trigger === 'scheduled' ? ' · agendada' : ''} · <span style={{ color: e.outcome === 'failed' ? 'var(--red)' : e.outcome === 'ready' ? 'var(--acc)' : 'var(--label-2)' }}>{({ failed: 'falhou', ready: 'pronto', nochange: 'sem mudanças' })[e.outcome] || e.outcome}</span>{e.ms ? ' · ' + Math.round(e.ms / 1000) + ' s' : ''}</span>
              <span className="when">{rel(e.at)}</span>
            </div>)}
          </div> : <div className="adm-empty">Nenhuma execução ainda.</div>}
          <div className="adm-hint" style={{ margin: '8px 0 0' }}>Só contagens e resultados. O que as pessoas perguntaram ao Coach, e o que ele respondeu, nunca aparece aqui.</div>
        </div>
      </details>
    </>}
  </div>
}

/* ---------------------------------- pieces ---------------------------------- */

function Step({ n, title, hint, done, open, forceOpen, children }) {
  // `key` remounts the <details> when the wizard advances, so the next step unfolds itself.
  return <details className={'adm-step ' + (done ? 'done' : 'todo')} open={open || forceOpen}>
    <summary>
      <span className="adm-num">{done ? <Icon name="check" /> : n}</span>
      <span className="adm-step-t"><b>{title}</b><span>{hint}</span></span>
      <Icon name="chevronRight" className="chev" />
    </summary>
    <div className="adm-step-b">{children}</div>
  </details>
}

function CredentialPill({ auth }) {
  const s = auth?.state
  if (s === 'connected') return <span className="adm-pill ok">conectado{auth.account ? ' · ' + auth.account : ''}</span>
  if (s === 'not-required') return <span className="adm-pill">não necessária</span>
  if (s === 'optional') return <span className="adm-pill">opcional, nenhuma salva</span>
  if (s === 'unreadable') return <span className="adm-pill bad">ilegível</span>
  return <span className="adm-pill warn">necessária</span>
}

const credentialHint = (auth, meta) => {
  const s = auth?.state
  if (s === 'connected') return 'Conectado' + (auth.account ? ' como ' + auth.account : '')
  if (s === 'not-required') return 'Não necessária'
  if (s === 'optional') return 'Opcional para este endpoint'
  if (s === 'unreadable') return 'A chave salva está ilegível: adicione de novo'
  return meta.setupToken ? 'Precisa de token ou chave de API' : 'Precisa de chave de API'
}

const credentialLabel = type => ({
  'cli-token': 'setup token do Claude Code', 'chatgpt-cli': 'login do ChatGPT CLI', oauth: 'token antigo', apikey: 'chave de API'
}[type] || 'credencial')

// The failure classes jobs.js emits, in words an operator can act on.
const failureTitle = cls => ({
  timeout: 'O provedor passou do tempo limite da execução (COACH_JOB_TIMEOUT_MS, padrão 5 minutos)',
  missing: 'Falta o runtime ou a chave do provedor',
  auth: 'O provedor rejeitou a credencial',
  provider: 'O provedor retornou um erro',
  unusable: 'O modelo respondeu, mas num formato que o app não consegue usar',
  restart: 'O servidor reiniciou durante uma execução',
  nostate: 'Não foi possível ler os dados de treino do usuário',
  off: 'O Coach estava desligado quando a execução rodou',
  internal: 'Algo deu errado no servidor'
}[cls] || cls || 'Falhou')

/* ------------------------------- setup token -------------------------------- */

function SetupTokenSheet({ close, onDone, label }) {
  const toast = useUI(s => s.toast)
  const [token, setToken] = useState('')
  // Which account this token belongs to. Optional, and stored as a plain label — it is what the
  // admin card and the user's Coach screen both show when they name whose account is spent.
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/admin/coach/connect', { method: 'POST', body: JSON.stringify({ type: 'cli-token', token: token.trim(), account: account.trim() }) })
      setToken('')
      toast(r.test?.ok ? 'Conectado ✅' : 'Token salvo')
      close(); onDone()
    } catch (e) { toast(e.message); setBusy(false) }
  }

  return <>
    <h3>Conectar {label}</h3>
    <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>
      Num computador confiável onde você usa o Claude Code, rode <code>claude setup-token</code>, faça o login normal no navegador e cole aqui o token que ele mostrar. Este app nunca abre nem manipula o fluxo de autorização do Claude.
    </div>
    <TextField value={token} autoFocus type="password" placeholder="cole o setup token" onChange={e => setToken(e.target.value)} />
    <div style={{ height: 8 }} />
    <TextField value={account} placeholder="de quem é esta conta? (ex.: voce@exemplo.com)" onChange={e => setAccount(e.target.value)} />
    <div style={{ height: 12 }} />
    <Button variant="primary" disabled={busy || !token.trim()} onClick={save}>Salvar token</Button>
    <div style={{ height: 8 }} />
  </>
}

function ApiKeySheet({ close, onDone, label, placeholder, optional }) {
  const toast = useUI(s => s.toast)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/admin/coach/connect', { method: 'POST', body: JSON.stringify({ type: 'apikey', token: key.trim() }) })
      toast(r.test?.ok ? 'Chave salva ✅' : 'Chave salva')
      close(); onDone()
    } catch (e) { toast(e.message); setBusy(false) }
  }
  return <>
    <h3>Chave de API {label}</h3>
    <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>
      Fica guardada criptografada neste servidor e só é enviada ao provedor enquanto uma execução roda. Nunca mais é exibida e não sai do servidor{optional ? '. Para um endpoint que não usa chave, pode deixar vazio e fechar.' : '.'}
    </div>
    <TextField value={key} autoFocus type="password" placeholder={placeholder || 'sk-…'} autoCapitalize="none" autoCorrect="off" onChange={e => setKey(e.target.value)} />
    <div style={{ height: 12 }} />
    <Button variant="primary" disabled={busy || !key.trim()} onClick={save}>Salvar chave</Button>
    <div style={{ height: 8 }} />
  </>
}
