"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Globe2, Network, Map, GitFork } from 'lucide-react'

import { CompanyMap } from "@/components/structure/company-map"
import { OrgChart } from "@/components/structure/org-chart"
import { AddCompanyModal } from "@/components/structure/add-company-modal"
import { CompanyActions } from "@/components/structure/company-actions"
import { RegulatoryModal } from "@/components/structure/regulatory-modal"
import { useAdmin } from "@/hooks/use-admin"

// HELPER DE TRADUÇÃO E COR
const getStatusInfo = (status: string) => {
    // Garante que a comparação seja feita em maiúsculo
    const s = status?.toUpperCase() || 'ACTIVE';

    if (s === 'ACTIVE') return { label: 'Ativa / Operando', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (s === 'STRUCTURING') return { label: 'Em Estruturação', style: 'bg-orange-50 text-orange-700 border-orange-200' }
    if (s === 'IDEA') return { label: 'Apenas Ideia', style: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (s === 'INACTIVE') return { label: 'Inativa / Baixada', style: 'bg-red-50 text-red-700 border-red-200' }
    
    return { label: s, style: 'bg-slate-100 text-slate-600' }
}

export function StructureView({ companies }: { companies: any[] }) {
  const { isAdmin } = useAdmin()

  return (
    <div className="space-y-8">
      
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
        
        {isAdmin && <AddCompanyModal existingCompanies={companies} />}
      </div>

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

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="border-b border-slate-50 pb-4">
            {/* TÍTULO EM VERMELHO PARA TESTE - SE NÃO FICAR VERMELHO, O ARQUIVO NÃO ATUALIZOU */}
            <CardTitle className="flex items-center gap-2 text-lg text-rose-600 font-bold">
                <Building2 className="w-5 h-5" /> Entidades Legais Cadastradas (Versão Atualizada)
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
                    const statusInfo = getStatusInfo(company.status)

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
                            
                            {/* AQUI APLICA A COR E TEXTO CORRETOS */}
                            <TableCell className="text-center">
                                <Badge className={`border text-[10px] ${statusInfo.style}`}>
                                    {statusInfo.label}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                                <div className="flex justify-center">
                                    {criticalCount > 0 ? (
                                        <div className="relative group cursor-pointer">
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                                            <RegulatoryModal company={company} />
                                        </div>
                                    ) : warningCount > 0 ? (
                                        <div className="relative group cursor-pointer">
                                            {/* BOLINHA AMARELA PULSANDO */}
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-75"></div>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white"></div>
                                            <RegulatoryModal company={company} />
                                        </div>
                                    ) : (
                                        <div className="opacity-80 hover:opacity-100 transition-opacity">
                                            <RegulatoryModal company={company} />
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            {isAdmin && (
                                <TableCell className="text-right pr-6">
                                    <CompanyActions company={company} allCompanies={companies} />
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