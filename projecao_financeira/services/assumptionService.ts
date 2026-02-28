import { Assumption } from '@/types';
import { createClient } from '@/lib/supabase/client';

type AssumptionCreate = Omit<Assumption, 'id' | 'created_at'>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNumberOrZero(value: unknown): number {
  return toNumberOrNull(value) ?? 0;
}

function sanitizeAssumptionFromDb(row: any): Assumption {
  // Supabase pode devolver números como string dependendo do schema/driver.
  // Garantimos coerção básica para evitar NaN propagando no engine.
  return {
    ...row,
    amount: toNumberOrZero(row?.amount),
    growth_rate: row?.growth_rate === null ? undefined : toNumberOrZero(row?.growth_rate),
    growth_rate_y2: row?.growth_rate_y2 === null ? undefined : toNumberOrZero(row?.growth_rate_y2),
    growth_rate_y3: row?.growth_rate_y3 === null ? undefined : toNumberOrZero(row?.growth_rate_y3),
    growth_rate_y4: row?.growth_rate_y4 === null ? undefined : toNumberOrZero(row?.growth_rate_y4),
    growth_rate_y5: row?.growth_rate_y5 === null ? undefined : toNumberOrZero(row?.growth_rate_y5),
    start_month: row?.start_month === null || row?.start_month === undefined ? undefined : toNumberOrZero(row?.start_month),
    end_month: row?.end_month === null || row?.end_month === undefined ? undefined : toNumberOrZero(row?.end_month),
    amortization_period: row?.amortization_period === null || row?.amortization_period === undefined ? undefined : toNumberOrZero(row?.amortization_period),
    payment_lag: row?.payment_lag === null || row?.payment_lag === undefined ? undefined : toNumberOrZero(row?.payment_lag),
    growth_start_month: row?.growth_start_month === null || row?.growth_start_month === undefined ? undefined : toNumberOrZero(row?.growth_start_month),
  } as Assumption;
}

export const assumptionService = {
  
  // 1. Buscar todas as premissas de um CENÁRIO (Atualizado Sprint 4)
  // Nota: Mudamos o parâmetro de projectId para scenarioId
  async getAssumptions(scenarioId: string): Promise<Assumption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('financial_items')
      .select('*')
      .eq('scenario_id', scenarioId) // <--- Filtro alterado para suportar Cenários
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Erro ao buscar premissas:", error);
      throw error;
    }
    
    return (data || []).map(sanitizeAssumptionFromDb);
  },

  // 2. Criar nova premissa
  async createAssumption(assumption: AssumptionCreate): Promise<Assumption | null> {
    const supabase = createClient();
    // Sanitização: Remove campos undefined para não dar erro no banco
    const cleanPayload = JSON.parse(JSON.stringify(assumption));

    const { data, error } = await supabase
      .from('financial_items')
      .insert([cleanPayload])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar premissa:", error);
      throw error;
    }
    return data ? sanitizeAssumptionFromDb(data) : null;
  },

  // 3. Atualizar premissa existente
  async updateAssumption(id: string, updates: Partial<Assumption>): Promise<Assumption | null> {
    const supabase = createClient();
    // Sanitização
    const cleanUpdates = JSON.parse(JSON.stringify(updates));
    delete cleanUpdates.id; // Nunca atualiza o ID
    delete cleanUpdates.created_at;

    const { data, error } = await supabase
      .from('financial_items')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar premissa:", error);
      throw error;
    }
    return data ? sanitizeAssumptionFromDb(data) : null;
  },

  // 4. Deletar premissa
  async deleteAssumption(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('financial_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao deletar premissa:", error);
      throw error;
    }
  }
};