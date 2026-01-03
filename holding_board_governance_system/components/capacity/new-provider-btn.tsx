"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Cpu, Briefcase } from "lucide-react"

// AQUI ESTAVA O ERRO: O nome da função precisa ser ProviderModal para bater com a página
export function ProviderModal() { 
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const type = formData.get('type')
    
    const slotsInput = formData.get('slots')
    const slots = slotsInput ? Number(slotsInput) : (type === 'EXTERNAL_PARTNER' ? 999 : 5)

    const payload = {
      name: formData.get('name'),
      type: type,
      capacity_slots: slots,
    }

    const { error } = await supabase.from('providers').insert(payload)

    setLoading(false)
    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Erro ao criar: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-bold shadow-sm text-xs h-9">
            <Plus className="w-4 h-4" /> Novo Parceiro / Squad
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Adicionar Recurso
          </DialogTitle>
          <DialogDescription>
            Cadastre uma nova Squad Interna ou um Parceiro Externo.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-5 py-4">
          
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Nome</Label>
            <Input name="name" required placeholder="Ex: Squad Alpha ou Escritório X" className="font-medium" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Tipo</Label>
                <Select name="type" defaultValue="INTERNAL_SQUAD">
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
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Capacidade (Slots)
                </Label>
                <Input 
                    type="number" 
                    name="slots" 
                    defaultValue={5} 
                    min={1} 
                    required
                    className="font-mono font-bold"
                />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Recurso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}