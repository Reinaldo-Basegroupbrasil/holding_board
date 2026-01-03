"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ShieldAlert, User, Trash2 } from "lucide-react"

export function TeamManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. BUSCA OS USUÁRIOS REAIS DO BANCO
  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // 2. ATUALIZA A FUNÇÃO (ROLE)
  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

    if (error) {
        alert("Erro ao atualizar: " + error.message)
    } else {
        // Atualiza a lista localmente
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setUpdating(null)
  }

  // 3. REMOVER USUÁRIO (Apenas do perfil visual, exclusão real é no painel Supabase)
  const handleDelete = async (userId: string) => {
      if(!confirm("Isso removerá o acesso visual deste usuário. Para deletar a conta permanentemente, use o painel do Supabase.")) return;
      
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (!error) {
          setUsers(users.filter(u => u.id !== userId))
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-medium">Usuários do Sistema</h3>
            <p className="text-sm text-slate-500">Gerencie quem tem acesso total (Admin) ou apenas leitura (Viewer).</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
            Atualizar Lista
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função (Role)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                    </TableRow>
                ) : users.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold uppercase">
                                    {user.email?.substring(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm text-slate-700">{user.email}</span>
                                <span className="text-xs text-slate-400">ID: {user.id.substring(0, 8)}...</span>
                            </div>
                        </TableCell>
                        
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {user.role === 'admin' ? <ShieldAlert className="w-4 h-4 text-rose-600" /> : <User className="w-4 h-4 text-slate-400" />}
                                <Select 
                                    defaultValue={user.role || 'viewer'} 
                                    onValueChange={(val) => handleRoleChange(user.id, val)}
                                    disabled={updating === user.id}
                                >
                                    <SelectTrigger className="h-8 w-[140px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Super Admin</SelectItem>
                                        <SelectItem value="viewer">Visualizador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TableCell>

                        <TableCell>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">
                                ATIVO
                            </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDelete(user.id)}
                                className="text-slate-400 hover:text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {users.length === 0 && !loading && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                            Nenhum usuário encontrado na tabela de perfis.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </div>
    </div>
  )
}