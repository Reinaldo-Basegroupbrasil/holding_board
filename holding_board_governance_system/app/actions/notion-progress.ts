"use server"

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function parseNotionProgress(value: any): Promise<number> {
  if (!value) return 0;
  
  // A lógica permanece a mesma, mas agora retorna uma Promise
  const progress = value <= 1 && value > 0 ? value * 100 : value;
  return progress;
}

export async function getPhasesProgress(notionPageIds: string[]) {
  try {
    // Filtramos apenas IDs válidos para não dar erro na API
    const validIds = notionPageIds.filter(id => id && id.length > 10);
    
    if (validIds.length === 0) return {};

    const progressMap: Record<string, number> = {};

    // Buscamos os dados de cada página no Notion
    // Nota: Em produção, o ideal é fazer cache ou busca em lote
    const promises = validIds.map(async (pageId) => {
      try {
        const response: any = await notion.pages.retrieve({ page_id: pageId });
        
        // Buscamos a propriedade 'Progresso'. 
        // Se for Rollup ou Formula, o Notion entrega em caminhos diferentes:
        const prop = response.properties["Progresso"] || response.properties["Progress"];
        
        let value = 0;
        if (prop.type === "rollup") {
          value = prop.rollup.number || 0;
        } else if (prop.type === "formula") {
          value = prop.formula.number || 0;
        } else if (prop.type === "number") {
          value = prop.number || 0;
        }

        // Se o Notion retornar 0.95, convertemos para 95
        progressMap[pageId] = value <= 1 ? value * 100 : value;
      } catch (err) {
        progressMap[pageId] = 0;
      }
    });

    await Promise.all(promises);
    return progressMap;
  } catch (error) {
    console.error("Erro ao buscar progresso no Notion:", error);
    return {};
  }
}