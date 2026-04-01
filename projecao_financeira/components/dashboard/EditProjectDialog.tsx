"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectStore } from "@/store/projectStore";
import { Project } from "@/types";
import { Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function EditProjectDialog({ isOpen, onClose, project }: Props) {
  const { updateProjectDetails, removeProject } = useProjectStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency_main: "BRL",
    projection_months: 36,
    projection_start_date: ""
  });

  useEffect(() => {
    if (project) {
      const startIso = project.projection_start_date;
      const monthInput = startIso ? startIso.slice(0, 7) : "";
      setFormData({
        name: project.name,
        description: project.description || "",
        currency_main: project.currency_main || "BRL",
        projection_months: project.projection_months || 36,
        projection_start_date: monthInput
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<Project> = {
        name: formData.name,
        description: formData.description,
        currency_main: formData.currency_main,
        projection_months: formData.projection_months,
      };
      if (formData.projection_start_date) {
        payload.projection_start_date = `${formData.projection_start_date}-01`;
      } else {
        payload.projection_start_date = null as any;
      }
      await updateProjectDetails(project.id, payload);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("ATENÇÃO: Isso excluirá o projeto e TODAS as premissas. Não há como desfazer. Tem certeza?")) {
      setLoading(true);
      await removeProject(project.id);
      router.push("/dashboard"); // Volta para a home
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações do Projeto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Projeto</Label>
            <Input 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Moeda Principal</Label>
            <Select 
              value={formData.currency_main} 
              onValueChange={(val) => setFormData({...formData, currency_main: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real (BRL)</SelectItem>
                <SelectItem value="USD">Dólar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Isso altera o símbolo da moeda em todo o sistema.</p>
          </div>

          <div className="space-y-2">
            <Label>Período de Projeção</Label>
            <Select 
              value={String(formData.projection_months)} 
              onValueChange={(val) => setFormData({...formData, projection_months: Number(val)})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">1 Ano (12 meses)</SelectItem>
                <SelectItem value="24">2 Anos (24 meses)</SelectItem>
                <SelectItem value="36">3 Anos (36 meses)</SelectItem>
                <SelectItem value="48">4 Anos (48 meses)</SelectItem>
                <SelectItem value="60">5 Anos (60 meses)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Define quantos meses a projeção vai cobrir. Afeta DRE, caixa e indicadores.</p>
          </div>

          <div className="space-y-2">
            <Label>Mês inicial da projeção</Label>
            <Input
              type="month"
              value={formData.projection_start_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  projection_start_date: e.target.value,
                })
              }
            />
            <p className="text-[10px] text-muted-foreground">
              Opcional. Se vazio, a projeção começa no mês atual. Ex.: selecionar 2026-05 fará a linha do tempo iniciar em mai/26.
            </p>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
               <Trash2 className="w-4 h-4 mr-2" /> Excluir Projeto
            </Button>
            <div className="flex gap-2">
               <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
               <Button type="submit" disabled={loading}>{loading ? "Salvar" : "Salvar"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}