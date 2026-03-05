import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function parseButtonId(payload: unknown): string | null {
  const data = payload as Record<string, unknown>
  const msg = data?.data as Record<string, unknown> | undefined
  if (!msg) return null
  if ((msg.key as Record<string, unknown>)?.fromMe === true) return null

  const message = msg.message as Record<string, unknown> | undefined
  if (!message) return null

  const btnResp = message.buttonsResponseMessage as Record<string, unknown> | undefined
  if (btnResp?.selectedButtonId && typeof btnResp.selectedButtonId === 'string') {
    return btnResp.selectedButtonId
  }
  if (btnResp?.selectedId && typeof btnResp.selectedId === 'string') {
    return btnResp.selectedId
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const event = (payload?.event as string) || ''
    if (event !== 'messages.upsert') {
      return NextResponse.json({ received: true })
    }

    const buttonId = parseButtonId(payload)
    if (!buttonId) return NextResponse.json({ received: true })

    const match = buttonId.match(/^([a-f0-9-]+)_(concluido|em_andamento|recusar)$/i)
    if (!match) return NextResponse.json({ received: true })

    const [, taskId, action] = match
    if (!taskId || !action) return NextResponse.json({ received: true })

    const statusMap: Record<string, string> = {
      concluido: 'concluido',
      em_andamento: 'em_andamento',
      recusar: 'recusado',
    }
    const status = statusMap[action]
    if (!status) return NextResponse.json({ received: true })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const updates: Record<string, unknown> = { status }
    if (status === 'recusado') {
      updates.refusal_reason = 'Recusado via WhatsApp'
    }

    const { error } = await supabase
      .from('board_tasks')
      .update(updates)
      .eq('id', taskId)

    if (error) {
      console.error('[whatsapp webhook] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ received: true, updated: taskId })
  } catch (e) {
    console.error('[whatsapp webhook] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
