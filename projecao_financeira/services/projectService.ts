import { createClient } from "@/lib/supabase/client";
import { Project } from "@/types";

export const projectService = {
  // 1. Listar todos os projetos
  async getProjects(): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Project[];
  },

  // 2. Buscar um projeto pelo ID (A FUNÇÃO QUE FALTAVA)
  async getProjectById(id: string): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Project;
  },

  // 3. Criar Projeto
  async createProject(projectData: { name: string; description?: string; currency_main: string }): Promise<Project> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name: projectData.name,
          description: projectData.description,
          currency_main: projectData.currency_main,
          user_id: user.id
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Project;
  },

  // 4. Atualizar Projeto
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Project;
  },

  // 5. Deletar Projeto
  async deleteProject(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
};