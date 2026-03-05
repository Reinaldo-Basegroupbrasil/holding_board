const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE
const WHATSAPP_GROUP_JID = process.env.WHATSAPP_GROUP_JID

export function isWhatsAppConfigured(): boolean {
  return !!(EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE && WHATSAPP_GROUP_JID)
}

async function evolutionFetch(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: object } = {}
): Promise<Response> {
  const { body, ...rest } = options
  const url = `${EVOLUTION_API_URL?.replace(/\/$/, '')}${path}`
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY || '',
      ...options.headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return res
}

export interface BoardTaskForWhatsApp {
  id: string
  title: string
  description?: string | null
  due_date?: string | null
  requestor?: string | null
  link_url?: string | null
  attachment_url?: string | null
  providers?: { name?: string } | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return String(dateStr)
  }
}

function shortId(id: string): string {
  return id.slice(0, 8)
}

export async function sendTaskToGroup(
  task: BoardTaskForWhatsApp,
  providerName?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, error: 'WhatsApp não configurado' }
  }

  const sid = shortId(task.id)
  const provider = providerName || task.providers?.name || '-'
  const due = formatDate(task.due_date)
  const requestor = task.requestor || '-'

  let description = `${task.title}\n\n`
  description += `👤 Responsável: ${provider}\n`
  description += `📅 Prazo: ${due}\n`
  description += `✍️ Solicitado por: ${requestor}\n\n`
  if (task.description) {
    description += `Descrição:\n${task.description}\n\n`
  }
  if (task.link_url) {
    description += `🔗 Referência: ${task.link_url}\n`
  }
  if (task.attachment_url) {
    description += `📎 Documento: ${task.attachment_url}\n`
  }

  const body = {
    number: WHATSAPP_GROUP_JID!,
    title: `🔔 NOVA DEMANDA #${sid}`,
    description,
    footer: 'Responda usando os botões abaixo',
    buttons: [
      { title: 'reply', displayText: '✅ Concluído', id: `${task.id}_concluido` },
      { title: 'reply', displayText: '🔄 Em andamento', id: `${task.id}_em_andamento` },
      { title: 'reply', displayText: '❌ Recusar', id: `${task.id}_recusar` },
    ],
  }

  const res = await evolutionFetch(
    `/message/sendButtons/${EVOLUTION_INSTANCE}`,
    { method: 'POST', body }
  )

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Evolution API: ${res.status} - ${text}` }
  }
  return { ok: true }
}

export async function sendText(text: string): Promise<{ ok: boolean; error?: string }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, error: 'WhatsApp não configurado' }
  }

  const body = {
    number: WHATSAPP_GROUP_JID!,
    text,
  }

  const res = await evolutionFetch(
    `/message/sendText/${EVOLUTION_INSTANCE}`,
    { method: 'POST', body }
  )

  if (!res.ok) {
    const txt = await res.text()
    return { ok: false, error: `Evolution API: ${res.status} - ${txt}` }
  }
  return { ok: true }
}

export interface PendingTaskSummary {
  id: string
  title: string
  due_date?: string | null
  providers?: { name?: string } | null
}

export async function sendDailySummary(
  tasks: PendingTaskSummary[],
  appUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || ''

  let text = `📋 *Pendências em aberto (${tasks.length})*\n\n`
  tasks.forEach((t) => {
    const sid = shortId(t.id)
    const due = formatDate(t.due_date)
    const prov = t.providers?.name || '-'
    text += `• #${sid} - ${t.title}\n  Prazo: ${due} | Responsável: ${prov}\n\n`
  })
  if (baseUrl) {
    text += `\nVer todas: ${baseUrl}/board/pendentes`
  }

  return sendText(text)
}

export async function sendDeadlineReminder(
  task: PendingTaskSummary,
  daysLeft: number
): Promise<{ ok: boolean; error?: string }> {
  const sid = shortId(task.id)
  const prov = task.providers?.name || '-'
  const text = `⏰ *Lembrete* - #${sid}\n${task.title}\nResponsável: ${prov}\nVence em ${daysLeft} dia(s)!`

  return sendText(text)
}
