"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ShieldAlert, User, Trash2, Users, Link2, AlertTriangle, Plus, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { createUserAction } from "@/app/actions/admin-actions"

const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin",
  manager: "Gestor",
  partner: "Parceiro",
  viewer: "Visualizador",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "text-rose-600",
  manager: "text-blue-600",
  partner: "text-amber-600",
  viewer: "text-slate-400",
}

export function TeamManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [deletionLogs, setDeletionLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'partner', providerId: '' })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchData = async () => {
    setLoading(true)
    const [usersRes, providersRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('providers').select('id, name').order('name'),
      supabase.from('deletion_logs').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    
    if (usersRes.data) setUsers(usersRes.data)
    if (providersRes.data) setProviders(providersRes.data)
    if (logsRes.data) setDeletionLogs(logsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    
    const updateData: any = { role: newRole }
    if (newRole === 'admin') {
      updateData.provider_id = null
    }

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

    if (error) {
        alert("Erro ao atualizar: " + error.message)
    } else {
        setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u))
    }
    setUpdating(null)
  }

  const handleProviderLink = async (userId: string, providerId: string) => {
    setUpdating(userId)

    const finalId = providerId === '_none' ? null : providerId
    const { error } = await supabase
        .from('profiles')
        .update({ provider_id: finalId })
        .eq('id', userId)

    if (error) {
        alert("Erro ao vincular: " + error.message)
    } else {
        setUsers(users.map(u => u.id === userId ? { ...u, provider_id: finalId } : u))
    }
    setUpdating(null)
  }

  const handleDelete = async (userId: string) => {
      if(!confirm("Isso removerá o acesso visual deste usuário. Para deletar a conta permanentemente, use o painel do Supabase.")) return;
      
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (!error) {
          setUsers(users.filter(u => u.id !== userId))
      }
  }

  const getProviderName = (providerId: string | null) => {
    if (!providerId) return null
    return providers.find(p => p.id === providerId)?.name || null
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Preencha email e senha")
      return
    }
    if (newUser.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setCreating(true)
    const res = await createUserAction({
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      providerId: newUser.providerId || null,
    })

    if (res.success) {
      toast.success(`Usuário ${newUser.email} criado com sucesso`)
      setDialogOpen(false)
      setNewUser({ email: '', password: '', role: 'partner', providerId: '' })
      setShowPassword(false)
      fetchData()
    } else {
      toast.error(res.error || "Erro ao criar usuário")
    }
    setCreating(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-medium">Usuários do Sistema</h3>
            <p className="text-sm text-slate-500">Gerencie roles e vínculos de cada usuário.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
              Atualizar Lista
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] md:left-[calc(50%+9rem)]" style={{ backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <DialogHeader>
                <DialogTitle style={{ color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>Criar Novo Usuário</DialogTitle>
                <DialogDescription style={{ color: '#64748b', fontSize: '14px' }}>O usuário poderá acessar o sistema com este email e senha.</DialogDescription>
              </DialogHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Email</label>
                  <input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    style={{ height: '40px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px', color: '#1e293b', fontSize: '14px', outline: 'none', width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Senha Temporária</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      style={{ height: '40px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 40px 0 12px', color: '#1e293b', fontSize: '14px', outline: 'none', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Função (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    style={{ height: '40px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px', color: '#1e293b', fontSize: '14px', outline: 'none', width: '100%', cursor: 'pointer' }}
                  >
                    <option value="admin">Super Admin</option>
                    <option value="manager">Gestor</option>
                    <option value="partner">Parceiro</option>
                  </select>
                </div>
                {['partner', 'manager'].includes(newUser.role) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Provider Vinculado</label>
                    <select
                      value={newUser.providerId || '_none'}
                      onChange={e => setNewUser({...newUser, providerId: e.target.value === '_none' ? '' : e.target.value})}
                      style={{ height: '40px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px', color: '#1e293b', fontSize: '14px', outline: 'none', width: '100%', cursor: 'pointer' }}
                    >
                      <option value="_none">Nenhum</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ paddingTop: '8px' }}>
                <Button
                  onClick={handleCreateUser}
                  disabled={creating}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 h-10 font-bold"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função (Role)</TableHead>
                    <TableHead>Provider Vinculado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                    </TableRow>
                ) : users.map((user) => {
                    const roleIcon = user.role === 'admin' ? <ShieldAlert className="w-4 h-4 text-rose-600" /> 
                                   : user.role === 'manager' ? <Users className="w-4 h-4 text-blue-600" />
                                   : <User className="w-4 h-4 text-slate-400" />
                    const providerName = getProviderName(user.provider_id)

                    return (
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
                                {roleIcon}
                                <Select 
                                    value={user.role || 'partner'} 
                                    onValueChange={(val) => handleRoleChange(user.id, val)}
                                    disabled={updating === user.id}
                                >
                                    <SelectTrigger className="h-8 w-[150px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Super Admin</SelectItem>
                                        <SelectItem value="manager">Gestor</SelectItem>
                                        <SelectItem value="partner">Parceiro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TableCell>

                        <TableCell>
                            {['partner', 'manager'].includes(user.role) ? (
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                                    <Select 
                                        value={user.provider_id || '_none'} 
                                        onValueChange={(val) => handleProviderLink(user.id, val)}
                                        disabled={updating === user.id}
                                    >
                                        <SelectTrigger className="h-8 w-[180px] text-xs">
                                            <SelectValue placeholder="Selecionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">Nenhum</SelectItem>
                                            {providers.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">-</span>
                            )}
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
                    )
                })}
                {users.length === 0 && !loading && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                            Nenhum usuário encontrado na tabela de perfis.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </div>

      {deletionLogs.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Log de Exclusões (Parceiros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {deletionLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">
                      {log.action}
                    </Badge>
                    <span className="text-slate-600 font-medium">{log.target_title || log.target_id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>{log.user_email}</span>
                    <span>{new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}