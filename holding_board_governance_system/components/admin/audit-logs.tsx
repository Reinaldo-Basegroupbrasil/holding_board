"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Trash2, Edit, PlusCircle, ShieldAlert } from "lucide-react"

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const getIcon = (action: string) => {
    if (action === 'EXCLUIR') return <Trash2 className="w-4 h-4 text-red-500" />
    if (action === 'EDITAR') return <Edit className="w-4 h-4 text-amber-500" />
    if (action === 'CRIAR') return <PlusCircle className="w-4 h-4 text-emerald-500" />
    return <FileText className="w-4 h-4 text-slate-400" />
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[180px]">Data/Hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Detalhes do Evento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
          ) : logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-xs text-slate-500 font-mono">
                {new Date(log.created_at).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                        {log.user_email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">Admin</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex w-fit items-center gap-1 text-[10px] font-bold">
                    {getIcon(log.action)} {log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                <span className="font-bold text-slate-800">[{log.category}]</span> {log.details}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}