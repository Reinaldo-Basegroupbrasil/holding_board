"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Trash2, Save, Loader2, Cpu, Briefcase } from "lucide-react"

export function ProviderSettings({ provider }: { provider: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. ATUALIZAR DADOS (Nome, Tipo e Slots)
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const type = formData.get('type')
    
    // Se for parceiro externo, sugerimos 999 se o usuário deixar vazio, mas respeitamos o input
    const slotsInput = formData.get('slots')
    const slots = slotsInput ? Number(slotsInput) : (type === 'EXTERNAL_PARTNER' ? 999 : 5)

    const updates = {
        name: formData.get('name'),
        type: type,
        capacity_slots: slots
    }
    
    const { error } = await supabase
        .from('providers')
        .update(updates)
        .eq('id', provider.id)

    setLoading(false)
    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Erro ao atualizar: " + error.message)
    }
  }

  // 2. EXCLUIR PARCEIRO
  const handleDelete = async () => {
    const confirm = window.confirm(`ATENÇÃO: Você vai excluir ${provider.name}.\n\nPara segurança, certifique-se de que não há projetos ativos vinculados a ele antes de excluir.`)
    
    if (!confirm) return

    setLoading(true)
    const { error } = await supabase.from('providers').delete().eq('id', provider.id)

    setLoading(false)
    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Não foi possível excluir. Verifique se existem projetos vinculados.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 transition-colors">
            <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Configurações de Capacidade</DialogTitle>
          <DialogDescription>
            Ajuste os slots disponíveis ou altere o tipo de alocação.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="grid gap-5 py-4">
          
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Nome da Entidade</Label>
            <Input name="name" defaultValue={provider.name} required className="font-medium" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label className="font-bold text-slate-700">Tipo</Label>
                <Select name="type" defaultValue={provider.type || "INTERNAL_SQUAD"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="INTERNAL_SQUAD">
                            <div className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Engine Interna</div>
                        </SelectItem>
                        <SelectItem value="EXTERNAL_PARTNER">
                            <div className="flex items-center gap-2"><Briefcase className="w-3 h-3" /> Parceiro Externo</div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label className="font-bold text-slate-700 flex justify-between">
                    Slots (Capacidade)
                </Label>
                <Input 
                    name="slots" 
                    type="number" 
                    defaultValue={provider.capacity_slots || 5} 
                    min={1} 
                    required
                    className="font-mono font-bold"
                />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between gap-2 border-t pt-4 mt-2">
            {/* Botão de Excluir */}
            <Button 
                type="button" 
                variant="ghost" 
                onClick={handleDelete}
                disabled={loading}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Excluir
            </Button>

            {/* Botão de Salvar */}
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}