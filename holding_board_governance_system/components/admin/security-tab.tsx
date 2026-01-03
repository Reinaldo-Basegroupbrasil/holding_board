"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Database, Lock, ExternalLink, Loader2, Save, AlertTriangle } from "lucide-react"

export function SecurityTab() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  
  // Estado das políticas de segurança
  const [policies, setPolicies] = useState({
    force_mfa: false,
    maintenance_mode: false,
    log_all_actions: true
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. CARREGAR POLÍTICAS DO BANCO
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*')
      
      if (data) {
        const newPolicies: any = { ...policies }
        data.forEach((item: any) => {
            if (item.key in newPolicies) {
                newPolicies[item.key] = item.value === 'true'
            }
        })
        setPolicies(newPolicies)
      }
      setFetching(false)
    }
    loadSettings()
  }, [])

  // 2. SALVAR POLÍTICAS
  const handleSave = async () => {
    setLoading(true)
    
    const updates = Object.entries(policies).map(([key, value]) => ({
        key,
        value: String(value)
    }))

    const { error } = await supabase.from('app_settings').upsert(updates)

    // Log de Auditoria (Segurança é crítico, vamos registrar quem mexeu)
    if (!error) {
        await supabase.from('audit_logs').insert({
            action: 'EDITAR', 
            category: 'SEGURANÇA', 
            details: 'Alterou políticas de segurança global',
            user_email: 'Admin'
        })
        alert("Políticas de segurança atualizadas!")
    } else {
        alert("Erro ao salvar: " + error.message)
    }
    setLoading(false)
  }

  const toggle = (key: keyof typeof policies) => {
    setPolicies(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (fetching) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /> Carregando políticas...</div>

  return (
    <div className="grid gap-6 md:grid-cols-2">
        
        {/* CARD 1: BACKUPS (Links Externos Seguros) */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4 h-fit">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Database className="w-5 h-5" /></div>
                <div>
                    <h3 className="font-bold text-slate-800">Data Room & Backup</h3>
                    <p className="text-xs text-slate-500">Recuperação de desastres e compliance.</p>
                </div>
            </div>
            <p className="text-sm text-slate-600">
                O backup do banco de dados (PITR) é gerenciado automaticamente pelo Supabase. Você pode acessar os pontos de restauração ou baixar um dump SQL manualmente.
            </p>
            <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" className="w-full justify-between" onClick={() => window.open('https://supabase.com/dashboard/project/_/database/backups', '_blank')}>
                    Gerenciar Backups (Supabase) <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="secondary" className="w-full justify-start gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => alert("Função disponível apenas via CLI ou Painel Supabase por segurança.")}>
                    <ShieldCheck className="w-4 h-4" /> Solicitar Dump Manual (SQL)
                </Button>
            </div>
        </div>

        {/* CARD 2: POLÍTICAS (Funcional - Salva no Banco) */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Lock className="w-5 h-5" /></div>
                <div>
                    <h3 className="font-bold text-slate-800">Políticas de Acesso</h3>
                    <p className="text-xs text-slate-500">Regras globais de segurança.</p>
                </div>
            </div>
            
            <div className="space-y-5 pt-1">
                
                {/* Toggle 1 */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/30">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">Forçar 2FA (MFA)</Label>
                        <p className="text-xs text-slate-500">Exigir autenticação de dois fatores para Admins.</p>
                    </div>
                    <Switch checked={policies.force_mfa} onCheckedChange={() => toggle('force_mfa')} />
                </div>

                {/* Toggle 2 */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/30">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">Log Completo (Audit)</Label>
                        <p className="text-xs text-slate-500">Registrar cada clique e visualização no sistema.</p>
                    </div>
                    <Switch checked={policies.log_all_actions} onCheckedChange={() => toggle('log_all_actions')} />
                </div>

                {/* Toggle 3 - Crítico */}
                <div className="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-amber-800 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Modo de Manutenção
                        </Label>
                        <p className="text-xs text-amber-700">Bloqueia o acesso de todos os usuários (exceto Admins).</p>
                    </div>
                    <Switch checked={policies.maintenance_mode} onCheckedChange={() => toggle('maintenance_mode')} className="data-[state=checked]:bg-amber-600" />
                </div>

                <div className="pt-2 flex justify-end">
                    <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Políticas"} 
                        {!loading && <Save className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </div>
        </div>

    </div>
  )
}