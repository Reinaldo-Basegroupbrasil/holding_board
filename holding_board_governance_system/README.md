Markdown

# 🏢 Holding Board - Governance System v1.0

Sistema avançado de governança corporativa e monitoramento de projetos integrando **Next.js**, **Supabase** e **Notion API**. O sistema permite uma visão executiva em tempo real de múltiplas frentes de trabalho (Holdings/Empresas).

## 🚀 Principais Funcionalidades

* **Executive Dashboard**: Visão holística de progresso com métricas de saúde dos projetos.
* **Integração Notion (Real-time)**: Sincronização automática de progresso de tarefas e fases diretamente do Notion.
* **Mapa Corporativo**: Visualização da estrutura societária e interconexões.
* **Governança & SLA**: Monitoramento de prazos, reuniões de conselho e demandas operacionais.
* **Painel Administrativo**: Gestão de permissões (Admin-Only) e configurações de sistema.

## 🛠️ Tech Stack

* **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
* **Backend & Auth**: Supabase (PostgreSQL), Next-Safe-Action.
* **Integrações**: Notion SDK, Lucide Icons, Shadcn/UI.
* **Testes**: Vitest, Testing Library, Coverage Reporting (V8).

## 📊 Qualidade & Testes

O projeto adota uma cultura de qualidade com testes automatizados para lógicas críticas e componentes de UI.

### Como rodar os testes:
```bash
# Rodar todos os testes
npm run test

# Gerar relatório de cobertura (Coverage Report)
npm run test:coverage
Indicadores de Cobertura (v1.0 stable):
Actions: 100% de cobertura nas lógicas de integração com Notion.

Components: Testes de renderização e estado para componentes críticos (PhaseCards, Sidebars).

⚙️ Configuração do Ambiente
Crie um arquivo .env.local com as seguintes chaves:

Code snippet

NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
NOTION_API_KEY=sua_secret_do_notion
NOTION_TASKS_DB_ID=id_do_banco_de_dados
🏗️ Estrutura do Projeto
/app: Rotas e Server Actions.

/components: Componentes de UI e lógicas de visualização.

/hooks: Hooks customizados para gestão de estado e permissões.

/lib: Configurações de clientes (Supabase/Notion).


---

### 3. O Passo Final do Desenvolvedor

Depois de excluir as pastas e salvar o README, execute este "combo" de comandos no terminal para finalizar sua entrega:

```bash
git add .
git commit -m "docs: finalized v1.0 readme and cleaned up test artifacts"
git push origin main