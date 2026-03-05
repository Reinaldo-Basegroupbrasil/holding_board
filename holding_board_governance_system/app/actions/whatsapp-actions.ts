'use server'

import { createClient } from '@/lib/supabase-server'
import { sendTaskToGroup } from '@/lib/whatsapp'

export async function sendTaskToWhatsApp(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: task, error } = await supabase
      .from('board_tasks')
      .select('id, title, description, due_date, requestor, link_url, attachment_url, providers(name)')
      .eq('id', taskId)
      .single()

    if (error || !task) {
      return { success: false, error: error?.message || 'Tarefa não encontrada' }
    }

    // Supabase retorna providers como array na relação; sendTaskToGroup espera objeto
    const providers = task.providers as { name?: string }[] | { name?: string } | null
    const providerObj = Array.isArray(providers) ? providers[0] : providers
    const taskForWhatsApp = {
      ...task,
      providers: providerObj ?? null,
    }

    const result = await sendTaskToGroup(taskForWhatsApp, providerObj?.name)

    if (!result.ok) {
      return { success: false, error: result.error }
    }

    await supabase
      .from('board_tasks')
      .update({ whatsapp_sent_at: new Date().toISOString() })
      .eq('id', taskId)

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao enviar para WhatsApp'
    return { success: false, error: msg }
  }
}
