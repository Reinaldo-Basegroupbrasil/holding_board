"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  FileText, Plus, DollarSign, ExternalLink, 
  CheckCircle2, Clock, XCircle, MoreVertical, Search,
  ArrowUpRight, Building2
} from "lucide-react"
import { useAdmin } from "@/hooks/use-admin"

export default function ProposalsPage() {
  const { isAdmin, userEmail } = useAdmin()
  const [loading, setLoading] = useState(true)
  const [proposals, setProposals] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    // Busca propostas vinculadas a empresas e provedores
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        companies(name),
        profiles!proposals_provider_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (data) setProposals(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  // Helper para Status com cores executivas
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovada': 
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 px-3">Aprovada</Badge>
      case 'paga': 
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px] font-black px-3">Liquidada</Badge>
      case 'recusada': 
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 px-3">Recusada</Badge>
      default: 
        return <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50 px-3">Em Análise</Badge>
    }
  }

  // Permissão: Reinaldo (Admin) ou Armando (Financeiro)
  const canManage = isAdmin || userEmail === 'armando@basegroupbrasil.com.br'

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      
      {/* HEADER REFINADO - MELHORIA VISUAL LUPA E BOTÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-100">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Gestão de Propostas</h1>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Controle Financeiro e Orçamentos</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* BUSCA COM ÍCONE ALINHADO */}
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Buscar por serviço ou fornecedor..." 
              className="pl-10 h-11 w-[320px] text-xs border-slate-200 bg-slate-50/50 focus:bg-white transition-all rounded-xl focus:ring-blue-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* BOTÃO COM ALTO CONTRASTE */}
          {canManage && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 h-11 px-6 rounded-xl shadow-md shadow-blue-100 border-none transition-all active:scale-95">
              <Plus className="w-5 h-5" /> 
              <span>Nova Proposta</span>
            </Button>
          )}
        </div>
      </div>

      {/* TABELA DE GESTÃO */}
      <Card className="border-slate-200 overflow-hidden shadow-sm rounded-2xl bg-white">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-black text-slate-500 uppercase py-5 pl-6 tracking-wider">Serviço / Proposta</TableHead>
              <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fornecedor</TableHead>
              <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Unidade</TableHead>
              <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Valor Total</TableHead>
              <TableHead className="text-[10px] font-black text-slate-500 uppercase text-center tracking-wider">Status</TableHead>
              <TableHead className="text-[10px] font-black text-slate-500 uppercase text-right pr-6 tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((prop) => (
              <TableRow key={prop.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100 last:border-0">
                <TableCell className="py-5 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{prop.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Criado em {new Date(prop.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                     {prop.profiles?.full_name || 'Fornecedor'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{prop.companies?.name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-black text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.value)}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(prop.status)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-2">
                    {prop.file_url && (
                      <a href={prop.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-9 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 gap-1.5 font-bold text-[10px] uppercase">
                          Ver PDF <ArrowUpRight className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 rounded-lg">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {proposals.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-24">
                  <div className="flex flex-col items-center opacity-40">
                    <FileText className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium italic text-sm">Nenhuma proposta cadastrada no sistema.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}