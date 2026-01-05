'use server'

// Se o seu projeto usa outra pasta (ex: utils), ajuste esta linha. 
// Baseado no seu histórico, mantive @/lib/supabase-server
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
          // Não removemos o provider_id aqui para manter o histórico
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
 * Se a tarefa veio de um projeto, devolve o projeto para o Backlog (libera o slot)
 */
export async function deleteTaskAction(taskId: string) {
  const supabase = await createClient()
  try {
    // 1. Verifica vínculo antes de deletar
    const { data: task } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', taskId)
      .single()

    // 2. Se for tarefa de projeto, libera o projeto original
    if (task?.project_id) {
        await supabase
            .from('projects')
            .update({ 
                provider_id: null, // Remove o dono
                status: 'BACKLOG'  // Volta para a fila de disponíveis
            })
            .eq('id', task.project_id)
    }

    // 3. Exclui a tarefa
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
 * Garante que o project_id seja NULL se for "avulsa" para não violar a chave estrangeira
 */
export async function createTaskAction(payload: any) {
  const supabase = await createClient()
  try {
    // TRATAMENTO DE CHAVE ESTRANGEIRA (FK):
    // Se project_id for "avulsa", string vazia ou undefined, forçamos NULL.
    // Isso evita o erro "violates foreign key constraint".
    let finalProjectId = null;
    if (payload.project_id && payload.project_id !== "avulsa" && payload.project_id !== "") {
        finalProjectId = payload.project_id;
    }

    const insertData = { 
        title: payload.title,
        description: payload.description,
        provider_id: payload.provider_id,
        due_date: payload.due_date,
        project_id: finalProjectId, // ID limpo ou null
        status: 'em_andamento', 
        origin: 'manual' 
    }

    const { error } = await supabase
      .from('tasks')
      .insert(insertData)

    if (error) {
        console.error("Erro Supabase:", error.message)
        throw error
    }
    
    revalidatePath('/capacity')
    return { success: true }
  } catch (e: any) {
    console.error("Erro na criação:", e.message)
    return { success: false, error: e.message }
  }
}

/**
 * VINCULAR ROADMAP
 * Atualiza o projeto (a Trigger no banco criará a tarefa automaticamente se configurada)
 */
export async function linkRoadmapAction(projectId: string, providerId: string) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('projects')
      .update({ 
          provider_id: providerId, 
          status: 'ON_TRACK' 
      })
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
    // Mesma proteção de FK da criação
    let finalProjectId = null;
    if (payload.project_id && payload.project_id !== "avulsa" && payload.project_id !== "") {
        finalProjectId = payload.project_id;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
        project_id: finalProjectId,
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