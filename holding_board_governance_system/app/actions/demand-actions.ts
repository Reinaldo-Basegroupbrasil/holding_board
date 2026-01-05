'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * CONCLUIR TAREFA (Sincronização Bilateral)
 * Garante a baixa no Portfólio e no Monitoramento
 */
export async function completeTaskAction(taskId: string) {
  const supabase = await createClient()
  try {
    // 1. Busca o vínculo de projeto antes de concluir
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', taskId)
      .single()

    if (fetchError) throw fetchError

    // 2. Se houver projeto vinculado, marca como COMPLETED no Portfólio
    if (task?.project_id) {
      const { error: projectError } = await supabase
        .from('projects')
        .update({ 
          status: 'COMPLETED', 
          provider_id: null 
        })
        .eq('id', task.project_id)
      
      if (projectError) throw projectError
    }

    // 3. Marca a tarefa operacional como concluída
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'concluido' })
      .eq('id', taskId)

    if (taskError) throw taskError
    
    revalidatePath('/capacity')
    revalidatePath('/portfolio') 
    return { success: true }
  } catch (e: any) {
    console.error("Erro na conclusão:", e.message)
    return { success: false, error: e.message }
  }
}

/**
 * EXCLUIR TAREFA
 */
export async function deleteTaskAction(taskId: string) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
    revalidatePath('/capacity')
    return { success: true }
  } catch (e: any) {
    console.error("Erro na exclusão:", e.message)
    return { success: false, error: e.message }
  }
}

/**
 * CRIAR TAREFA
 * Garante que o nome da empresa seja salvo para evitar o bug de "Demanda Avulsa"
 */
export async function createTaskAction(payload: any) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('tasks')
      .insert({ 
        title: payload.title,
        description: payload.description,
        provider_id: payload.provider_id,
        due_date: payload.due_date,
        // Removido o company_name pois ele não existe na tabela
        project_id: payload.project_id === "avulsa" ? null : payload.project_id,
        status: 'em_andamento', 
        origin: 'manual' 
      })

    if (error) throw error
    
    revalidatePath('/capacity')
    return { success: true }
  } catch (e: any) {
    console.error("Erro na criação:", e.message)
    return { success: false, error: e.message }
  }
}

/**
 * VINCULAR ROADMAP
 */
export async function linkRoadmapAction(projectId: string, providerId: string) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('projects')
      .update({ provider_id: providerId, status: 'ON_TRACK' })
      .eq('id', projectId)

    if (error) throw error
    revalidatePath('/capacity')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * ATUALIZAR TAREFA (Edição)
 */
export async function updateTaskAction(taskId: string, payload: any) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
        project_id: payload.project_id === "avulsa" || !payload.project_id ? null : payload.project_id,
        status: 'em_andamento'
      })
      .eq('id', taskId)

    if (error) throw error
    revalidatePath('/capacity')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}