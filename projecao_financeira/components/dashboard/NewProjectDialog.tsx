"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// 1. Definimos a interface para aceitar as props do Pai
interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// 2. Recebemos as props na função
export function NewProjectDialog({ isOpen, onClose }: NewProjectDialogProps) {
  const { createProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency_main: "BRL"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      await createProject(formData);
      // Limpa o form e fecha
      setFormData({ name: "", description: "", currency_main: "BRL" });
      onClose(); 
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 3. Ligamos o estado do Dialog às props do Pai
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Defina o nome e a moeda base para sua nova projeção financeira.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto</Label>
            <Input 
              id="name" 
              placeholder="Ex: Expansão 2025" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Moeda Base</Label>
            <select 
              id="currency"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.currency_main}
              onChange={(e) => setFormData({...formData, currency_main: e.target.value})}
            >
                <option value="BRL">Real Brasileiro (BRL)</option>
                <option value="USD">Dólar Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição (Opcional)</Label>
            <Textarea 
              id="desc" 
              placeholder="Detalhes sobre o cenário..." 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}