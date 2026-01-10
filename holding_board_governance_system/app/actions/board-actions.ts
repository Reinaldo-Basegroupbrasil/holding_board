'use server'

import { createClient } from '@/lib/supabase-server' 
import { revalidatePath } from 'next/cache'

/**
 * CRIAR NOVA PENDÊNCIA (Tabela board_tasks)
 */
export async function createBoardTask(payload: any) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('board_tasks')
      .insert({
        title: payload.title,
        description: payload.description,
        provider_id: payload.provider_id,
        task_type: payload.task_type || 'acao',
        due_date: payload.due_date,
        attachment_url: payload.attachment_url,
        status: 'pendente'
      })

    if (error) throw error
    
    revalidatePath('/board/todo')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * CONCLUIR PENDÊNCIA
 */
export async function completeBoardTask(taskId: string) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('board_tasks')
      .update({ status: 'concluido' })
      .eq('id', taskId)

    if (error) throw error
    
    revalidatePath('/board/todo')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}