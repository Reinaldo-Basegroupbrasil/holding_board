import { Scenario } from "@/types";
import { createClient } from "@/lib/supabase/client";

export const scenarioService = {
  // 1. Listar
  async getScenarios(projectId: string): Promise<Scenario[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Clonar (Criar Novo) - via RPC (legacy, não remapeia driver_id)
  async cloneScenario(sourceScenarioId: string, newName: string): Promise<Scenario | null> {
    const supabase = createClient();
    const { data: newId, error } = await supabase
      .rpc('clone_scenario', {
        source_scenario_id: sourceScenarioId,
        new_name: newName
      });

    if (error) throw error;

    const { data: newScenario, error: fetchError } = await supabase
      .from('scenarios')
      .select('*')
      .eq('id', newId)
      .single();
    
    if (fetchError) throw fetchError;
    return newScenario;
  },

  // 2b. Criar cenário vazio (para clone client-side com remapeamento)
  async createScenarioRow(projectId: string, name: string): Promise<Scenario | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scenarios')
      .insert({ project_id: projectId, name, is_base: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 3. Atualizar (Renomear) - NOVO
  async updateScenario(id: string, name: string): Promise<Scenario | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scenarios')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 4. Excluir
  async deleteScenario(scenarioId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', scenarioId);

    if (error) throw error;
  }
};