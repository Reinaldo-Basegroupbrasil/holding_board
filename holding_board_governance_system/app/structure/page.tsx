"use client"

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Globe2, Network, Map, GitFork } from 'lucide-react'

// Importando componentes filhos
import { CompanyMap } from "@/components/structure/company-map"
import { OrgChart } from "@/components/structure/org-chart"
import { AddCompanyModal } from "@/components/structure/add-company-modal"
import { CompanyActions } from "@/components/structure/company-actions"
import { RegulatoryModal } from "@/components/structure/regulatory-modal"
import { useAdmin } from "@/hooks/use-admin"

// --- LÓGICA DE TRADUÇÃO DE STATUS ---
// Garante que o status visual seja sempre bonito e traduzido
const getStatusInfo = (status: string) => {
    const s = status?.toUpperCase() || 'ACTIVE';
    if (s === 'ACTIVE') return { label: 'Ativa / Operando', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (s === 'STRUCTURING') return { label: 'Em Estruturação', style: 'bg-orange-50 text-orange-700 border-orange-200' }
    if (s === 'IDEA') return { label: 'Em Validação', style: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (s === 'INACTIVE') return { label: 'Inativa / Baixada', style: 'bg-red-50 text-red-700 border-red-200' }
    return { label: 'Ativa', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

export default function StructurePage() {
  const [companies, setCompanies] = useState<any[]>([])
  const { isAdmin } = useAdmin()

  // Conexão com o Supabase no Cliente
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // --- FUNÇÃO CENTRAL DE RECARREGAMENTO ---
  // Esta função busca os dados no banco e atualiza a tela.
  // Ela é passada para os modais para que eles possam "pedir" uma atualização.
  const fetchData = useCallback(async () => {
        // console.log("🔄 Atualizando lista de empresas...") // Debug opcional
        const { data } = await supabase
            .from('companies')
            .select('*, regulatory_docs(status, expiration_date)')
            .order('name')
        
        if (data) setCompanies(data)
  }, [supabase])

  // Busca inicial ao carregar a página
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Network className="w-8 h-8 text-rose-600" />
            Estrutura Societária
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Visão global das holdings, controladas e veículos de investimento.
          </p>
        </div>
        
        {/* BOTÃO DE ADICIONAR (Topo) */}
        {/* Passamos 'onUpdate={fetchData}' para que a nova empresa apareça assim que for criada */}
        {isAdmin && (
            <AddCompanyModal 
                existingCompanies={companies} 
                onUpdate={fetchData} 
            />
        )}
      </div>

      {/* ABAS MAPA/ORGANOGRAMA */}
      <Tabs defaultValue="map" className="w-full">
        <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-white border p-1 h-10 shadow-sm">
                <TabsTrigger value="map" className="flex items-center gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100">
                    <Map className="w-3.5 h-3.5" /> Mapa Global
                </TabsTrigger>
                <TabsTrigger value="chart" className="flex items-center gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100">
                    <GitFork className="w-3.5 h-3.5" /> Organograma (Miro)
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="map" className="mt-0">
            <CompanyMap companies={companies} />
        </TabsContent>

        <TabsContent value="chart" className="mt-0">
            <OrgChart companies={companies} />
        </TabsContent>
      </Tabs>

      {/* TABELA DE EMPRESAS */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Entidades Legais Cadastradas
            </CardTitle>
            <CardDescription>Monitoramento de conformidade e status operacional.</CardDescription>
        </CardHeader>
        
        <Table>
            <TableHeader className="bg-slate-50/50">
                <TableRow>
                    <TableHead className="w-[250px] font-bold text-slate-700">Razão Social / Nome</TableHead>
                    <TableHead className="font-bold text-slate-700">Jurisdição (País)</TableHead>
                    <TableHead className="font-bold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-bold text-slate-700">Serviço</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Status Op.</TableHead>
                    <TableHead className="text-center font-bold text-slate-700 w-[180px]">Compliance / Docs</TableHead>
                    {isAdmin && <TableHead className="text-right pr-6 font-bold text-slate-700">Ações</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {companies.map((company) => {
                    // 1. PEGA O STATUS TRADUZIDO E A COR
                    const statusInfo = getStatusInfo(company.status)

                    // 2. LÓGICA DE BOLINHAS (CRÍTICO / ALERTA)
                    const docs = company.regulatory_docs || []
                    const today = new Date()
                    
                    const criticalCount = docs.filter((d: any) => 
                        d.status === 'MISSING' || 
                        (d.expiration_date && new Date(d.expiration_date) < today)
                    ).length

                    const warningCount = docs.filter((d: any) => {
                        if (!d.expiration_date) return false
                        const exp = new Date(d.expiration_date)
                        const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        // Vence entre hoje e 30 dias
                        return diff >= 0 && diff <= 30
                    }).length
                    
                    return (
                        <TableRow key={company.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                            <TableCell className="font-bold text-slate-700 py-4">{company.name}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-600">{company.country || 'N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] text-slate-500">{company.type}</Badge></TableCell>
                            <TableCell><span className="text-xs text-slate-600 font-medium">{company.service_type || '-'}</span></TableCell>
                            
                            {/* 3. APLICA O BADGE TRADUZIDO */}
                            <TableCell className="text-center">
                                <Badge className={`border text-[10px] shadow-sm ${statusInfo.style}`}>
                                    {statusInfo.label}
                                </Badge>
                            </TableCell>

                            {/* 4. MODAL DE DOCUMENTOS (Bolinhas) */}
                            {/* Passamos 'onDataChange={fetchData}' para atualizar a bolinha instantaneamente */}
                            <TableCell className="text-center">
                                <div className="flex justify-center">
                                    {criticalCount > 0 ? (
                                        <div className="relative group cursor-pointer">
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
                                            
                                            <RegulatoryModal company={company} onDataChange={fetchData} />
                                        </div>
                                    ) : warningCount > 0 ? (
                                        <div className="relative group cursor-pointer">
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping opacity-75"></div>
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white"></div>
                                            
                                            <RegulatoryModal company={company} onDataChange={fetchData} />
                                        </div>
                                    ) : (
                                        <div className="opacity-80 hover:opacity-100 transition-opacity">
                                            <RegulatoryModal company={company} onDataChange={fetchData} />
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            {/* 5. AÇÕES (EDITAR / EXCLUIR) */}
                            {/* Passamos 'onUpdate={fetchData}' para a exclusão remover a linha instantaneamente */}
                            {isAdmin && (
                                <TableCell className="text-right pr-6">
                                    <CompanyActions 
                                        company={company} 
                                        allCompanies={companies} 
                                        onUpdate={fetchData} 
                                    />
                                </TableCell>
                            )}
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
      </Card>
    </div>
  )
}