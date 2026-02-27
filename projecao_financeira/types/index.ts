export interface MonthlyData {
  monthIndex: number;
  month: number;
  date: string;
  value: number;
}

export interface Assumption {
  id: string;
  project_id: string;
  scenario_id?: string;
  name: string;
  category: string;
  subcategory?: string | null;
  amount: number;
  growth_rate?: number;
  growth_rate_y2?: number | null;
  growth_rate_y3?: number | null;
  start_month?: number; 
  end_month?: number | null;
  driver_id?: string | null;
  driver_type?: 'total' | 'delta';
  is_recurring?: boolean;
  amortization_period?: number;
  payment_lag?: number;
  growth_type?: 'percentage' | 'linear';
  growth_start_month?: number | null;
  format?: 'currency' | 'percent' | 'number';
  created_at?: string;
}

// Totais do Setup (Mês 0)
export interface PreOperationalTotals {
  revenue: number;
  taxes_sale: number;
  costs_variable: number;
  costs_fixed: number;
  personnel: number;
  investment: number;
  depreciation: number;
  
  // Novos campos adicionados para evitar erro de tipo
  financial_revenue: number;
  financial_expense: number;
  tax_profit: number; 
  capital: number;

  ebitda: number;
  ebit: number;
  ebt: number;
  net_result: number;
  cash_flow: number;
  cash_accumulated: number;
}

// Totais Mensais (Arrays)
export interface ProjectionTotals {
  revenue: MonthlyData[];
  taxes_sale: MonthlyData[];
  costs_variable: MonthlyData[];
  costs_fixed: MonthlyData[];
  personnel: MonthlyData[];
  investment: MonthlyData[];
  depreciation: MonthlyData[];
  
  // Novos campos
  financial_revenue: MonthlyData[];
  financial_expense: MonthlyData[];
  tax_profit: MonthlyData[]; 
  capital: MonthlyData[];
  
  net_revenue: MonthlyData[];
  contribution_margin: MonthlyData[];
  ebitda: MonthlyData[];
  ebit: MonthlyData[];
  ebt: MonthlyData[];
  net_result: MonthlyData[];
  
  cash_flow: MonthlyData[];
  cash_accumulated: MonthlyData[];
}

export interface ProjectionItemDetail {
  assumptionId: string;
  name: string;
  category: string;
  format?: 'currency' | 'percent' | 'number';
  driver_id?: string | null;
  data: MonthlyData[];
  preOperationalValue: number;
}

export interface ProjectionSummary {
  totals: ProjectionTotals;
  preOperational: PreOperationalTotals; // Separado de totals
  items: ProjectionItemDetail[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  currency_main: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  is_base: boolean;
  created_at: string;
}