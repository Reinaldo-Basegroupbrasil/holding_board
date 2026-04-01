'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

type GeminiTask = { tarefa: string; epico?: string; inicio?: string; fim?: string; checklist?: string[] }

export async function createNotionTasksFromJsonAction(
  projectNotionId: string,
  phaseNotionId: string,
  tasksJson: string
): Promise<{ success?: true; count?: number; error?: string }> {
  const tasksDbId = process.env.NOTION_TASKS_DB_ID
  if (!projectNotionId || !phaseNotionId) {
    return { error: 'Projeto e fase devem estar vinculados ao Notion.' }
  }
  if (!tasksDbId) {
    return { error: 'NOTION_TASKS_DB_ID não configurado.' }
  }
  const cleaned = tasksJson.replace(/```json/g, '').replace(/```/g, '').trim()
  let tasks: GeminiTask[]
  try {
    tasks = JSON.parse(cleaned)
  } catch {
    return { error: 'JSON inválido. Cole um array de tarefas.' }
  }
  if (!Array.isArray(tasks)) {
    return { error: 'JSON deve ser um array de tarefas.' }
  }
  const validTasks = tasks.filter((t) => t.tarefa && typeof t.tarefa === 'string')
  if (validTasks.length === 0) {
    return { error: 'Nenhuma tarefa válida encontrada.' }
  }
  try {
    for (const task of validTasks) {
      const childrenBlocks: object[] = []
      if (task.checklist && Array.isArray(task.checklist) && task.checklist.length > 0) {
        childrenBlocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: '📋 Plano de Ação' } }] },
        })
        task.checklist.forEach((item) => {
          childrenBlocks.push({
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [{ type: 'text', text: { content: String(item) } }],
              checked: false,
            },
          } as object)
        })
      }
      const properties: Record<string, object> = {
        'Nome da Tarefa': { title: [{ text: { content: task.tarefa } }] },
        Status: { status: { name: 'A fazer' } },
        Área: { select: { name: task.epico || 'Geral' } },
        Projeto: { relation: [{ id: projectNotionId }] },
        Fases: { relation: [{ id: phaseNotionId }] },
      }
      if (task.inicio || task.fim) {
        properties['Prazo'] = {
          date: { start: task.inicio || task.fim!, end: task.fim || null },
        }
      }
      await notion.pages.create({
        parent: { database_id: tasksDbId },
        properties,
        ...(childrenBlocks.length > 0 ? { children: childrenBlocks } : {}),
      })
    }
    revalidatePath('/portfolio')
    return { success: true, count: validTasks.length }
  } catch (error: unknown) {
    const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : 'Erro ao criar tarefas no Notion.'
    console.error('createNotionTasksFromJsonAction:', error)
    return { error: msg }
  }
}

export async function getPhaseNotionTasksAction(phaseNotionId: string): Promise<{ id: string; title: string; status: string }[]> {
  const tasksDbId = process.env.NOTION_TASKS_DB_ID
  if (!phaseNotionId || !tasksDbId) return []
  try {
    const { results } = await notion.databases.query({
      database_id: tasksDbId,
      filter: { property: 'Fases', relation: { contains: phaseNotionId } },
    })
    return results.map((page: { id: string; properties: Record<string, { title?: { plain_text: string }[]; status?: { name: string } }>) => ({
      id: page.id,
      title: page.properties['Nome da Tarefa']?.title?.[0]?.plain_text || 'Sem título',
      status: page.properties.Status?.status?.name || '—',
    }))
  } catch {
    return []
  }
}

export async function createPhaseWithNotionAction(data: { name: string, parentNotionId?: string }, parentId: string, timeline: string) {
  const supabase = await createClient()

  try {
    // Verificação de segurança: O projeto pai precisa ter o ID do Notion
    if (!data.parentNotionId) {
        return { error: "Este Projeto Macro não está vinculado ao Notion. Verifique o ID no Supabase." }
    }

    // A. CRIAR NO NOTION
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DATABASE_FASES_ID },
        properties: {
          // Verifique se no Notion o título da coluna é exatamente "Nome"
          "Nome": { 
            title: [{ text: { content: data.name } }] 
          },
          // O erro estava aqui: usei notionParentId em vez de parentNotionId
          "Projetos": { 
            relation: [{ id: data.parentNotionId }] 
          },
          "Cronograma": { rich_text: [{ text: { content: timeline } }] } 
        }
      })
    })

    const notionData = await notionRes.json()

    // Se o Notion retornar erro, capturamos aqui
    if (!notionRes.ok) {
        console.error("Erro da API do Notion:", notionData)
        return { error: `Notion API: ${notionData.message}` }
    }

    const notionPageId = notionData.id

    // B. SALVAR NO SUPABASE
    const { error: supabaseError } = await supabase.from('projects').insert({
      name: data.name,
      parent_project_id: parentId,
      custom_timeline: timeline,
      status: 'ON_TRACK',
      notion_page_id: notionPageId // Salvando o ID que o Notion acabou de gerar
    })

    if (supabaseError) throw supabaseError

    revalidatePath('/portfolio') // Atualiza a página de portfólio
    return { success: true }

  } catch (error: any) {
    console.error("Erro completo na automação:", error)
    return { error: error.message || "Erro interno no servidor" }
  }
}