"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Trash2, Save, Loader2, Briefcase, Users } from "lucide-react"

export function ProviderSettings({ provider }: { provider: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)

    const updates = {
        name: formData.get('name'),
        type: formData.get('type'),
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
          <DialogTitle>Configurações do Parceiro</DialogTitle>
          <DialogDescription>
            Edite os dados deste parceiro ou prestador.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="grid gap-5 py-4">
          
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Nome</Label>
            <Input name="name" defaultValue={provider.name} required className="font-medium" />
          </div>

          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Tipo</Label>
            <Select name="type" defaultValue={provider.type || "EXTERNAL_PARTNER"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="INTERNAL_SQUAD">
                        <div className="flex items-center gap-2"><Users className="w-3 h-3" /> Squad Interno</div>
                    </SelectItem>
                    <SelectItem value="EXTERNAL_PARTNER">
                        <div className="flex items-center gap-2"><Briefcase className="w-3 h-3" /> Parceiro</div>
                    </SelectItem>
                </SelectContent>
            </Select>
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