import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDailySummary, sendDeadlineReminder, isWhatsAppConfigured } from '@/lib/whatsapp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CRON_SECRET = process.env.CRON_SECRET

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return true
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice(7) === CRON_SECRET
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ message: 'WhatsApp não configurado' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const today = new Date()
  const inTwoDays = new Date(today)
  inTwoDays.setDate(inTwoDays.getDate() + 2)
  const twoDaysStr = inTwoDays.toISOString().slice(0, 10)
  const twoDaysPlusOne = new Date(inTwoDays)
  twoDaysPlusOne.setDate(twoDaysPlusOne.getDate() + 1)
  const twoDaysPlusOneStr = twoDaysPlusOne.toISOString().slice(0, 10)

  const { data: pendingTasks } = await supabase
    .from('board_tasks')
    .select('id, title, due_date, providers(name)')
    .in('status', ['pendente', 'em_andamento'])

  const tasks = pendingTasks || []

  const res: { summary?: string; reminders?: number } = {}

  if (tasks.length > 0) {
    const summaryResult = await sendDailySummary(tasks)
    res.summary = summaryResult.ok ? 'sent' : summaryResult.error
  }

  const deadlineTasks = tasks.filter((t) => {
    const d = t.due_date as string | null
    if (!d) return false
    return d >= twoDaysStr && d < twoDaysPlusOneStr
  })

  for (const task of deadlineTasks) {
    await sendDeadlineReminder(task, 2)
  }
  res.reminders = deadlineTasks.length

  return NextResponse.json(res)
}
