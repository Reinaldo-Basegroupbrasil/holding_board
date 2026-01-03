"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Loader2, Building2, Link2 } from "lucide-react"

const countries = [
  "Brazil", "United States", "Cayman Islands", "Bahamas", 
  "Paraguay", "Uruguay", "Colombia", "Spain",
  "Portugal", "United Kingdom", "China", "Estonia", "BVI"
]

// AQUI ESTAVA FALTANDO O 'onUpdate'
interface AddCompanyModalProps {
  companyToEdit?: any;
  existingCompanies?: any[];
  onUpdate?: () => void; // <--- ADICIONADO
}

export function AddCompanyModal({ companyToEdit, existingCompanies = [], onUpdate }: AddCompanyModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const isEditing = !!companyToEdit

  const safeList = Array.isArray(existingCompanies) ? existingCompanies : []
  
  const uniqueList = Array.from(
    new Map(safeList.map(item => [item.id, item])).values()
  );

  const potentialParents = isEditing 
    ? uniqueList.filter(c => c.id !== companyToEdit.id)
    : uniqueList

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const parentIdValue = formData.get('parent_id')
    const parentId = (parentIdValue && parentIdValue !== "none") ? parentIdValue : null

    const payload = {
      name: formData.get('name'),
      country: formData.get('country'),
      type: formData.get('type'), 
      service_type: formData.get('service_type'),
      status: formData.get('status'),
      currency: formData.get('currency'),
      parent_company_id: parentId, 
      legal_status: formData.get('legal_status')
    }

    let error;
    if (isEditing) {
        const { error: uErr } = await supabase.from('companies').update(payload).eq('id', companyToEdit.id)
        error = uErr
    } else {
        const { error: iErr } = await supabase.from('companies').insert(payload)
        error = iErr
    }

    setLoading(false)
    if (!error) { 
        setOpen(false); 
        
        // AVISA O PAI PARA ATUALIZAR A LISTA
        if (onUpdate) {
            onUpdate();
        } else {
            router.refresh(); 
        }
    } else { 
        alert("Erro ao salvar: " + error.message); 
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></Button>
        ) : (
            <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold shadow-md"><Plus className="w-4 h-4" /> Nova Entidade</Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="w-5 h-5 text-rose-600" />
            {isEditing ? "Editar Entidade" : "Cadastrar Entidade"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Nome da Empresa / Projeto</Label>
            <Input name="name" defaultValue={companyToEdit?.name} required placeholder="Ex: Altavista Group" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Jurisdição</Label>
              <Select name="country" defaultValue={companyToEdit?.country || "Brazil"}>
                <SelectTrigger><SelectValue placeholder="País..." /></SelectTrigger>
                <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Status Operacional</Label>
              <Select name="status" defaultValue={companyToEdit?.status || "ACTIVE"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">🟢 Ativa / Operando</SelectItem>
                  <SelectItem value="STRUCTURING">🟠 Em Estruturação</SelectItem>
                  <SelectItem value="IDEA">🔵 Apenas Ideia</SelectItem>
                  <SelectItem value="INACTIVE">🔴 Inativa / Baixada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Tipo de Entidade</Label>
              <Select name="type" defaultValue={companyToEdit?.type || "Controlada"}>
                <SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Holding">Holding (Controladora)</SelectItem>
                  <SelectItem value="Controlada">Controlada (Operacional)</SelectItem>
                  <SelectItem value="Offshore">Offshore (Veículo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Serviço / Setor</Label>
              <Input name="service_type" defaultValue={companyToEdit?.service_type} placeholder="Ex: Software, Marketing..." />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 mt-2">
             <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <Link2 className="w-4 h-4" /> Estrutura Hierárquica
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-600">Holding Mãe</Label>
                    
                    <Select name="parent_id" defaultValue={companyToEdit?.parent_company_id?.toString() || "none"}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Independente / Sem Mãe --</SelectItem>
                            {potentialParents.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                </div>
                <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-600">Tipo de Vínculo</Label>
                    <Select name="legal_status" defaultValue={companyToEdit?.legal_status || "FORMALIZED"}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FORMALIZED">Formalizado (Sólido)</SelectItem>
                            <SelectItem value="PLANNED">Futuro / Planejado (Pontilhado)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             </div>
          </div>

          <div className="grid gap-2">
             <Label className="font-bold text-slate-700">Moeda Funcional</Label>
             <Select name="currency" defaultValue={companyToEdit?.currency || "USD"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                </SelectContent>
             </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={loading} className="w-full bg-slate-900 font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? "Salvar Alterações" : "Cadastrar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}