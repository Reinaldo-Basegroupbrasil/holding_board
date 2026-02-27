"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Wallet, Calendar } from "lucide-react";
import { NewProjectDialog } from "@/components/dashboard/NewProjectDialog";
import { useState } from "react";

export default function DashboardPage() {
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Meus Projetos</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas projeções e cenários financeiros.</p>
        </div>
        <Button onClick={() => setIsNewProjectOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      {/* Grid de Projetos */}
      {isLoading && projects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Carregando seus projetos...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/project/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border">
                      {project.currency_main} {/* <--- CORREÇÃO AQUI */}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {project.description || "Sem descrição definida."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4 mt-2">
                    <div className="flex items-center gap-1">
                       <Calendar className="h-3 w-3" />
                       <span>{new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium">
                       Abrir <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          
          {/* Card para Criar Novo (Vazio) */}
          <button 
            onClick={() => setIsNewProjectOpen(true)}
            className="flex flex-col items-center justify-center gap-4 h-full min-h-[200px] border-2 border-dashed rounded-xl border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-all group"
          >
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                <Plus className="h-6 w-6 text-slate-400 group-hover:text-primary" />
            </div>
            <span className="font-medium text-slate-500 group-hover:text-primary">Criar Novo Projeto</span>
          </button>
        </div>
      )}

      <NewProjectDialog 
        isOpen={isNewProjectOpen} 
        onClose={() => setIsNewProjectOpen(false)} 
      />
    </div>
  );
}