# Roadmap de Melhorias -- Motor de Projeção Financeira

> Versão atual: **v1.0** (concluída em 27/02/2026)

---

## Funcionalidades entregues na v1

1. Motor de projeção com DRE, Fluxo de Caixa e métricas base (drivers)
2. Composição base-a-base (total e delta) com acumulação
3. Crescimento com início específico (`growth_start_month`)
4. Redesign da aba Avançada (recorrência desacoplada de crescimento)
5. DRE com toggles consistentes e formatação correta (moeda/número/percentual)
6. Cálculo de percentual vinculado a driver (divide por 100 antes de multiplicar)
7. Export/Import de premissas (JSON v2 com remapeamento de `driver_id`)
8. VPL, TIR, Payback Descontado, Índice de Lucratividade
9. Análise de Sensibilidade (Tornado Chart + tabela de impacto)
10. IR/CSLL Automático (taxa personalizável, labels genéricos, nota no PDF)
11. Comparação de Cenários lado a lado (DRE anual condensado + KPIs comparativos)
12. Período de Projeção Configurável (12 a 60 meses)
13. Moeda dinâmica nas premissas (reflete a moeda base do projeto)
14. Testes unitários do motor (90 testes com Vitest)

---

## Melhorias pendentes (backlog v2+)

### Tier 2 -- Valor alto, risco baixo (não mexem no motor de cálculo)

#### 2.1 Error Boundaries
- Tratamento de erros robusto na UI com React Error Boundaries
- Evita tela branca se um componente falhar
- Arquivos: criar componente `ErrorBoundary.tsx`, envolver seções críticas

#### 2.2 Validações e Alertas Inteligentes
- Alertas automáticos no Editor de Premissas:
  - "Você não cadastrou nenhuma receita"
  - "Custos superam receita em todos os meses"
  - "Premissa X está vinculada a driver que não existe"
  - "Investimento sem período de amortização"
- Implementação: componente `ValidationAlerts.tsx` que lê `assumptions` do store e aplica regras
- Sem impacto no motor

#### 2.3 Notas/Comentários por Premissa
- Campo `notes` (texto livre) em cada premissa para justificativas
- Ex: "2500 cartões baseado no benchmark do mercado X"
- Útil para investidores e compliance
- Requer: coluna `notes text` na tabela `financial_items`, campo no dialog, exibição no AssumptionList

#### 2.4 Gráfico de Evolução dos Drivers
- Line chart (Recharts) mostrando como métricas base evoluem ao longo do tempo
- Ex: "Active Cards Portfolio" de 2500 subindo para 5000 ao longo de 36 meses
- Dados já disponíveis em `projection.items` filtrado por `category === 'base'`
- Componente: `DriverEvolutionChart.tsx`

#### 2.5 Gráficos Adicionais
- Receita vs Custos (stacked area chart)
- Margem EBITDA % ao longo do tempo
- ROI acumulado
- Todos read-only sobre dados já calculados

#### 2.6 Break-even Operacional Mensal
- Identificar o mês em que a receita mensal supera o custo mensal pela primeira vez
- Diferente do Payback (que é sobre caixa acumulado)
- Cálculo simples sobre `totals.revenue[m] > totals.costs_variable[m] + totals.costs_fixed[m] + totals.personnel[m]`

#### 2.7 Resumo Executivo Automático
- Texto gerado a partir das métricas calculadas:
  - "O projeto necessita de US$ X de investimento inicial"
  - "Atinge break-even no mês Y"
  - "Gera retorno de Z% (TIR) em N anos"
  - "Premissa mais sensível: Monthly Subscription Fee"
- Componente: `ExecutiveSummary.tsx`
- Útil para relatórios e apresentações

---

### Tier 3 -- Valor alto, risco moderado (mexem no motor ou banco)

#### 3.1 Import/Export CSV/Excel
- Importar premissas de planilha (CSV ou XLSX)
- Exportar projeção completa (DRE + Fluxo de Caixa) para Excel
- Biblioteca sugerida: `xlsx` (SheetJS)
- Reutilizar lógica de remapeamento do JSON export

#### 3.2 Templates de Negócio
- Modelos pré-prontos com premissas sugeridas:
  - SaaS (MRR, Churn, CAC, LTV)
  - E-commerce (GMV, Ticket Médio, Taxa de Conversão)
  - Marketplace (Take Rate, GMV, Sellers)
  - Serviços / Consultoria (Horas, Rate, Utilização)
- Implementação: JSON de templates + dialog de seleção na criação do projeto
- Usa o sistema de import existente para popular premissas

#### 3.3 Sazonalidade
- Perfil mensal de variação para premissas recorrentes
- Ex: dezembro vende 2x, janeiro 0.5x, fevereiro 0.8x
- Implementação: array de 12 multiplicadores `[1, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 2]`
- Requer: coluna JSONB `seasonality_profile` na tabela, lógica no motor para aplicar multiplicador mensal
- Os testes unitários existentes protegem contra regressões

#### 3.4 Capital de Giro
- Modelar necessidade de capital de giro com base no ciclo financeiro:
  - Prazo médio de recebimento (PMR)
  - Prazo médio de pagamento (PMP)
  - Prazo médio de estoque (PME)
- NCG = (PMR + PME - PMP) / 30 * Custo Mensal
- Novo componente de configuração + lógica no motor

#### 3.5 Versionamento de Premissas
- Histórico de alterações: quem mudou o quê e quando
- Tabela `assumption_history` no Supabase
- UI: timeline de mudanças por premissa
- Sem impacto no motor de cálculo

---

### Tier 4 -- Alta complexidade ou dependências externas

#### 4.1 Balanço Patrimonial Simplificado
- Completar a tríade contábil: DRE + Fluxo de Caixa + Balanço
- Ativo = Caixa + Investimentos (líquido de depreciação)
- Passivo = Capital de terceiros (se modelado)
- PL = Capital social + Lucros acumulados
- Requer reestruturação significativa do motor

#### 4.2 Premissas Condicionais
- "Se receita > 100k, contratar mais 2 pessoas"
- "Se EBITDA < 0 por 3 meses consecutivos, cortar custo X em 50%"
- Lógica condicional no motor (avaliação por mês, com dependências)
- Alta complexidade, potencial de loops

#### 4.3 Colaboração
- Compartilhar projeto com link (viewer ou editor)
- Requer: sistema de permissões no Supabase (RLS por projeto)
- Real-time sync com Supabase Realtime
- Maior risco por tocar em auth e permissões

#### 4.4 Cálculo no Servidor
- Mover `calculateProjection` para Supabase Edge Function
- Benefício: projetos com muitas premissas não travam o browser
- Requer: refatorar para funcionar em Deno runtime
- Mudança arquitetural significativa

#### 4.5 Caching Incremental
- Cache parcial das projeções -- só recalcular o que mudou
- Ex: alterar uma premissa de custo não precisa recalcular drivers
- Otimização de performance, baixa prioridade enquanto o motor for rápido

---

## Prioridade sugerida para v2

1. Error Boundaries (segurança)
2. Validações e Alertas Inteligentes (UX)
3. Notas/Comentários por Premissa (compliance)
4. Gráfico de Evolução dos Drivers (visualização)
5. Gráficos Adicionais (visualização)
6. Break-even Operacional (métrica)
7. Resumo Executivo Automático (relatório)
8. Import/Export CSV/Excel (produtividade)
9. Templates de Negócio (onboarding)
10. Sazonalidade (precisão do modelo)

---

*Documento criado em 27/02/2026. Atualizar conforme novas demandas surgirem.*
