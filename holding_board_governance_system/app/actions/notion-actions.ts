'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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