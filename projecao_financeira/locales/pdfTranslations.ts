export type PdfLanguage = 'pt' | 'en' | 'es';

interface TranslationTerms {
  title: string;
  subtitle: string;
  generated_on: string;
  scenario: string;
  currency: string;
  
  headers: {
    account: string;
    setup: string;
    total: string;
  };

  rows: {
    revenue: string;
    taxes_sale: string;
    net_revenue: string;
    costs_variable: string;
    contribution_margin: string;
    costs_fixed: string;
    ebitda: string;
    depreciation: string;
    ebit: string;
    financial_revenue: string;
    financial_expense: string;
    ebt: string;
    taxes_profit: string;
    net_result: string;
    cash_flow: string;
    accumulated_cash: string;
  };

  // Alterado: Removemos o footer longo e adicionamos assinaturas
  footer_confidential: string; 
  signatures: {
    ceo: string;
    accountant: string;
  };
}

export const translations: Record<PdfLanguage, TranslationTerms> = {
  pt: {
    title: "Relatório de Projeção Financeira",
    subtitle: "Demonstrativo de Resultados & Fluxo de Caixa",
    generated_on: "Gerado em",
    scenario: "Cenário",
    currency: "Moeda",
    headers: { account: "Contas / Estrutura", setup: "Setup (Mês 0)", total: "Total Acumulado" },
    rows: {
      revenue: "(+) Receita Bruta",
      taxes_sale: "(-) Impostos s/ Venda",
      net_revenue: "(=) Receita Líquida",
      costs_variable: "(-) Custos Variáveis",
      contribution_margin: "(=) Margem de Contribuição",
      costs_fixed: "(-) Custos Fixos (OpEx)",
      ebitda: "(=) EBITDA",
      depreciation: "(-) Depreciação",
      ebit: "(=) EBIT",
      financial_revenue: "(+) Receita Financeira",
      financial_expense: "(-) Despesa Financeira",
      ebt: "(=) Lucro Antes IR (EBT)",
      taxes_profit: "(-) IRPJ / CSLL",
      net_result: "(=) LUCRO LÍQUIDO",
      cash_flow: "Fluxo de Caixa Mensal",
      accumulated_cash: "Saldo Acumulado de Caixa"
    },
    footer_confidential: "Documento Confidencial - Uso Interno e Estratégico",
    signatures: {
        ceo: "Diretor Executivo (CEO)",
        accountant: "Responsável Financeiro / Contador"
    }
  },
  en: {
    title: "Financial Projection Report",
    subtitle: "Income Statement (P&L) & Cash Flow",
    generated_on: "Generated on",
    scenario: "Scenario",
    currency: "Currency",
    headers: { account: "Accounts / Structure", setup: "Setup (Month 0)", total: "Total Year" },
    rows: {
      revenue: "(+) Gross Revenue",
      taxes_sale: "(-) Sales Taxes",
      net_revenue: "(=) Net Revenue",
      costs_variable: "(-) Variable Costs (COGS)",
      contribution_margin: "(=) Contribution Margin",
      costs_fixed: "(-) Fixed Costs (OpEx)",
      ebitda: "(=) EBITDA",
      depreciation: "(-) Depreciation",
      ebit: "(=) EBIT",
      financial_revenue: "(+) Financial Income",
      financial_expense: "(-) Financial Expense",
      ebt: "(=) EBT",
      taxes_profit: "(-) Income Taxes",
      net_result: "(=) NET INCOME",
      cash_flow: "Monthly Cash Flow",
      accumulated_cash: "Accumulated Cash Balance"
    },
    footer_confidential: "Confidential Document - Internal and Strategic Use",
    signatures: {
        ceo: "Chief Executive Officer (CEO)",
        accountant: "Chief Financial Officer (CFO) / Accountant"
    }
  },
  es: {
    title: "Informe de Proyección Financiera",
    subtitle: "Estado de Resultados & Flujo de Caja",
    generated_on: "Generado el",
    scenario: "Escenario",
    currency: "Moneda",
    headers: { account: "Cuentas / Estructura", setup: "Setup (Mes 0)", total: "Total Acumulado" },
    rows: {
      revenue: "(+) Ingresos Brutos",
      taxes_sale: "(-) Impuestos s/ Ventas",
      net_revenue: "(=) Ingresos Netos",
      costs_variable: "(-) Costos Variables",
      contribution_margin: "(=) Margen de Contribución",
      costs_fixed: "(-) Gastos Fijos (OpEx)",
      ebitda: "(=) EBITDA",
      depreciation: "(-) Depreciación",
      ebit: "(=) EBIT",
      financial_revenue: "(+) Ingresos Financieros",
      financial_expense: "(-) Gastos Financieros",
      ebt: "(=) EBT",
      taxes_profit: "(-) Impuestos s/ Renta",
      net_result: "(=) RESULTADO NETO",
      cash_flow: "Flujo de Caja Mensual",
      accumulated_cash: "Saldo Acumulado de Caja"
    },
    footer_confidential: "Documento Confidencial - Uso Interno y Estratégico",
    signatures: {
        ceo: "Director Ejecutivo (CEO)",
        accountant: "Director Financiero / Contador"
    }
  }
};