"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Filter, Plus, DollarSign, Briefcase, Archive, XCircle, LayoutTemplate, Target } from 'lucide-react'

// SEUS COMPONENTES
import { AddProjectModal } from "@/components/portfolio/add-project-modal"
import { EditProjectModal } from "@/components/portfolio/edit-project-modal"
import { AddPhaseBtn } from "@/components/portfolio/add-phase-btn"
import { PhaseCard } from "@/components/portfolio/phase-card"
import { useAdmin } from "@/hooks/use-admin"

// --- UTILITÁRIOS DE ORDENAÇÃO E FILTRO ---
const monthMap: Record<string, number> = { "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12 }
const weekMap: Record<string, number> = { "W1": 0.1, "W2": 0.2, "W3": 0.3, "W4": 0.4 }

const getTimelineScore = (timeline: string) => {
    if (!timeline) return 99
    const parts = timeline.split(' ')
    const mScore = monthMap[parts[0]] || 99
    const weekPart = parts.length > 1 ? parts[1].substring(0, 2) : ""
    const wScore = weekMap[weekPart] || 0
    return mScore + wScore
}

const getQuarterFromMonth = (monthName: string) => {
    const monthNum = monthMap[monthName] || 0
    if (monthNum <= 3) return "Q1"
    if (monthNum <= 6) return "Q2"
    if (monthNum <= 9) return "Q3"
    return "Q4"
}

const getTimelineHeader = (quarter: string) => {
    switch (quarter) {
      case "Q1": return "Foco Q1: Janeiro - Fevereiro - Março"
      case "Q2": return "Foco Q2: Abril - Maio - Junho"
      case "Q3": return "Foco Q3: Julho - Agosto - Setembro"
      case "Q4": return "Foco Q4: Outubro - Novembro - Dezembro"
      default: return "Cronograma de Fases (Q1 - Q4)"
    }
}

// --- COMPONENTE PRINCIPAL ---
export function PortfolioView({ projects, milestones, companies, providers }: { projects: any[], milestones: any[], companies: any[], providers: any[] }) {
  const { isAdmin } = useAdmin()

  // 1. ESTADOS DOS FILTROS
  const [filterQuarter, setFilterQuarter] = useState<string>("all")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterWeek, setFilterWeek] = useState<string>("all")
  const [filterProject, setFilterProject] = useState<string>("all")

  // 2. LÓGICA DE FILTRAGEM
  const filteredProjects = projects.filter(project => {
    // Filtro por Projeto Específico
    if (filterProject !== "all" && project.id !== filterProject) return false

    // Se não tiver filtro de tempo, mostra o projeto
    if (filterQuarter === "all" && filterMonth === "all" && filterWeek === "all") return true

    // Se tiver filtro de tempo, verifica se o projeto tem ALGUMA fase que atenda aos critérios
    // Precisamos olhar para os milestones passados via props, filtrando pelo ID do projeto atual
    const projectPhases = milestones.filter(m => m.parent_project_id === project.id)
    
    const hasMatchingPhase = projectPhases.some(f => {
        const faseMonth = f.custom_timeline?.split(' ')[0]
        const faseQuarter = getQuarterFromMonth(faseMonth)

        const matchQuarter = filterQuarter === "all" || faseQuarter === filterQuarter
        const matchMonth = filterMonth === "all" || f.custom_timeline?.includes(filterMonth)
        const matchWeek = filterWeek === "all" || f.custom_timeline?.includes(filterWeek)

        return matchQuarter && matchMonth && matchWeek
    })

    return hasMatchingPhase
  })

  const clearFilters = () => {
      setFilterQuarter("all")
      setFilterMonth("all")
      setFilterWeek("all")
      setFilterProject("all")
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Calendar className="w-8 h-8 text-rose-600" />
            Matriz de Execução
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Gestão de entregas por Trimestre (Quarter) e Janelas Semanais.
          </p>
        </div>
        
        {isAdmin && <AddProjectModal companies={companies} />}
      </div>

      {/* BARRA DE FILTROS */}
      <Card className="border-none shadow-sm bg-white p-2 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-2 min-w-max">
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
            
            {/* Filtro Projeto */}
            <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="h-9 w-[180px] text-xs bg-slate-50 border-none font-bold text-slate-700">
                    <Target className="w-3 h-3 mr-2 text-indigo-500" />
                    <SelectValue placeholder="Todos Projetos" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Projetos</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <div className="h-6 w-px bg-slate-200 mx-1" />
            
            {/* Filtro Quarter */}
            <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger className="h-9 w-[130px] text-xs bg-slate-50 border-none"><LayoutTemplate className="w-3 h-3 mr-2 text-rose-500" /><SelectValue placeholder="Quarter" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Ano Todo</SelectItem>
                    <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Abr-Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul-Set)</SelectItem>
                    <SelectItem value="Q4">Q4 (Out-Dez)</SelectItem>
                </SelectContent>
            </Select>
            
            {/* Filtro Mês */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 w-[110px] text-xs bg-slate-50 border-none"><SelectValue placeholder="Mês" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Meses</SelectItem>
                    {Object.keys(monthMap).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Filtro Semana */}
            <Select value={filterWeek} onValueChange={setFilterWeek}>
                <SelectTrigger className="h-9 w-[110px] text-xs bg-slate-50 border-none"><SelectValue placeholder="Semanas" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas Semanas</SelectItem>
                    <SelectItem value="w1">W1 (Início)</SelectItem>
                    <SelectItem value="w2">W2</SelectItem>
                    <SelectItem value="w3">W3</SelectItem>
                    <SelectItem value="w4">W4 (Fim)</SelectItem>
                </SelectContent>
            </Select>

            {(filterQuarter !== "all" || filterMonth !== "all" || filterWeek !== "all" || filterProject !== "all") && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="h-9 w-9 text-red-500 hover:bg-red-50 ml-1">
                    <XCircle className="w-4 h-4" />
                </Button>
            )}
        </div>
      </Card>

      {/* LISTA DE PROJETOS (VISUAL DE CARDS) */}
      <div className="space-y-4">
        
        {/* Cabeçalho da Tabela Visual */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">Projeto / Holding</div>
            <div className="col-span-7 text-center text-indigo-500">{getTimelineHeader(filterQuarter)}</div>
            <div className="col-span-2 text-right">Financeiro</div>
        </div>

        {filteredProjects.length > 0 ? filteredProjects.map((project: any) => {
            // AQUI ESTÁ A MÁGICA:
            // 1. Pegamos todas as fases deste projeto (que vieram da prop milestones)
            // 2. Aplicamos os filtros TAMBÉM nas fases, para limpar a timeline visualmente
            const projectPhases = milestones.filter(m => m.parent_project_id === project.id)
            
            const visiblePhases = projectPhases
                .filter((phase: any) => {
                    const monthName = phase.custom_timeline?.split(' ')[0]
                    const phaseQuarter = getQuarterFromMonth(monthName)
                    
                    const matchQuarter = filterQuarter === "all" || phaseQuarter === filterQuarter
                    const matchMonth = filterMonth === "all" || phase.custom_timeline?.includes(filterMonth)
                    const matchWeek = filterWeek === "all" || phase.custom_timeline?.includes(filterWeek)
                    
                    return matchQuarter && matchMonth && matchWeek
                })
                .sort((a: any, b: any) => 
                    getTimelineScore(a.custom_timeline) - getTimelineScore(b.custom_timeline)
                )

            const investment = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(project.investment_realized || 0)
            const monthly = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(project.monthly_cost || 0)

            return (
                <Card key={project.id} className="border-none shadow-sm bg-white hover:shadow-md transition-all group">
                    <CardContent className="p-0">
                        <div className="grid grid-cols-12 gap-4 items-center p-6">
                            
                            {/* COLUNA 1: INFO */}
                            <div className="col-span-3 space-y-1 border-r border-slate-50 pr-4">
                                <h3 className="font-bold text-slate-800 leading-tight">{project.name}</h3>
                                {project.companies && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                        <Briefcase className="w-3 h-3" />
                                        {project.companies.name}
                                    </div>
                                )}
                                {/* Badge de filtro ativo */}
                                {(filterQuarter !== "all" || filterProject !== "all") && (
                                    <div className="mt-2"><Badge variant="outline" className="text-[8px] border-indigo-100 text-indigo-500">Filtrado</Badge></div>
                                )}
                            </div>

                            {/* COLUNA 2: TIMELINE (FASES) */}
                            <div className="col-span-7 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide px-2">
                                {visiblePhases.length > 0 ? visiblePhases.map((phase: any, index: number) => {
                                    // A última fase visível ganha a bandeira
                                    const isLast = index === visiblePhases.length - 1
                                    return (
                                        <PhaseCard key={phase.id} phase={phase} isLast={isLast} />
                                    )
                                }) : (
                                    <div className="w-full text-center py-2 border-2 border-dashed border-slate-100 rounded-lg text-xs text-slate-300">
                                        {filterQuarter === "all" ? "Sem fases planejadas" : "Sem entregas neste período"}
                                    </div>
                                )}
                                
                                {isAdmin && <AddPhaseBtn parentId={project.id} />}
                            </div>

                            {/* COLUNA 3: FINANCEIRO E AÇÕES */}
                            <div className="col-span-2 flex flex-col items-end justify-center gap-1 border-l border-slate-50 pl-4">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-800">{investment}</div>
                                    <div className="text-[9px] font-bold text-rose-600 flex items-center justify-end gap-1">
                                        <DollarSign className="w-2.5 h-2.5" /> MEN: {monthly}
                                    </div>
                                </div>
                                {isAdmin && (
                                    <EditProjectModal 
                                        project={project} 
                                        currentFases={visiblePhases} 
                                        companies={companies || []} 
                                    />
                                )}
                            </div>

                        </div>
                    </CardContent>
                </Card>
            )
        }) : (
            <div className="text-center py-16 bg-white border border-dashed rounded-xl">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Archive className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-medium">Nenhum projeto encontrado com os filtros selecionados.</span>
                    <Button variant="link" onClick={clearFilters} className="text-rose-600 text-xs">Limpar Filtros</Button>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}