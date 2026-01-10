'use server'

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { addDays, addWeeks, addMonths, format } from "date-fns"

// Adicionar Tarefa
export async function addPersonalTaskAction(data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: "Usuário não logado" }

  const { error } = await supabase.from('personal_tasks').insert({
    user_email: user.email,
    title: data.text,
    context: data.context === 'no_context' ? null : data.context,
    recurrence: data.recurrence,
    due_date: data.targetDate || null,
    done: false
  })

  if (error) return { error: error.message }
  revalidatePath('/board/todo') // Atualiza a tela
  return { success: true }
}

// Concluir/Reabrir (Com Lógica de Recorrência Automática)
export async function togglePersonalTaskAction(id: string, currentStatus: boolean, taskData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const newStatus = !currentStatus
  const doneAt = newStatus ? new Date().toISOString() : null

  // 1. Atualiza o status da tarefa atual
  const { error } = await supabase.from('personal_tasks').update({ 
    done: newStatus, 
    done_at: doneAt 
  }).eq('id', id)

  if (error) return { error: error.message }

  // 2. Se for conclusão E tiver recorrência, cria a próxima automaticamente
  if (newStatus && taskData.recurrence && taskData.recurrence !== 'none') {
      let nextDate = new Date()
      // Se tinha data alvo, usa ela como base, senão usa hoje
      if (taskData.due_date) {
          nextDate = new Date(taskData.due_date)
          // Ajuste de fuso horário simples para não voltar o dia
          nextDate.setUTCHours(12,0,0,0)
      }

      if (taskData.recurrence === 'daily') nextDate = addDays(nextDate, 1)
      if (taskData.recurrence === 'weekly') nextDate = addWeeks(nextDate, 1)
      if (taskData.recurrence === 'monthly') nextDate = addMonths(nextDate, 1)

      await supabase.from('personal_tasks').insert({
          user_email: user?.email,
          title: taskData.title,
          context: taskData.context,
          recurrence: taskData.recurrence,
          due_date: format(nextDate, 'yyyy-MM-dd'),
          done: false
      })
  }

  revalidatePath('/board/todo')
  return { success: true }
}

// Excluir
export async function deletePersonalTaskAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('personal_tasks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/board/todo')
  return { success: true }
}

// Editar
export async function editPersonalTaskAction(id: string, updates: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('personal_tasks').update({
      title: updates.text,
      context: updates.context === 'no_context' ? null : updates.context,
      recurrence: updates.recurrence,
      due_date: updates.date || null
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/board/todo')
  return { success: true }
}