import { create } from 'zustand';
import { Project, Assumption, ProjectionSummary, Scenario } from '@/types';
import { projectService } from '@/services/projectService';
import { assumptionService } from '@/services/assumptionService';
import { scenarioService } from '@/services/scenarioService';
import { calculateProjection } from '@/lib/projectionEngine';

interface ProjectState {
  // --- DADOS ---
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;

  scenarios: Scenario[];
  currentScenario: Scenario | null;
  
  assumptions: Assumption[];
  projection: ProjectionSummary | null;

  exchangeRate: number;    
  targetCurrency: string;  

  // --- AÇÕES ---
  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project | null>;
  updateProjectDetails: (id: string, data: Partial<Project>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  fetchProject: (id: string) => Promise<void>;

  // Cenários
  changeScenario: (scenarioId: string) => Promise<void>;
  createScenario: (name: string) => Promise<void>;
  renameScenario: (scenarioId: string, newName: string) => Promise<void>; // NOVO
  deleteScenario: (scenarioId: string) => Promise<void>;

  // Premissas
  fetchAssumptions: (scenarioId: string) => Promise<void>;
  addAssumption: (assumption: Partial<Assumption>) => Promise<void>;
  updateAssumption: (id: string, updates: Partial<Assumption>) => Promise<void>;
  removeAssumption: (id: string) => Promise<void>;
  importAssumptions: (items: Partial<Assumption>[]) => Promise<number>;

  setExchangeRate: (rate: number, currency: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  scenarios: [],
  currentScenario: null,
  assumptions: [],
  projection: null,
  isLoading: false,
  exchangeRate: 1.0,
  targetCurrency: 'BRL',

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const data = await projectService.getProjects();
      set({ projects: data });
    } catch (error) { console.error(error); } finally { set({ isLoading: false }); }
  },

  createProject: async (projectData) => {
    set({ isLoading: true });
    try {
      const newProject = await projectService.createProject(projectData);
      if (newProject) set((state) => ({ projects: [newProject, ...state.projects] }));
      return newProject;
    } catch (error) { console.error(error); return null; } finally { set({ isLoading: false }); }
  },

  updateProjectDetails: async (id, data) => {
    try {
      const updated = await projectService.updateProject(id, data);
      if (updated) {
        set({ currentProject: updated });
        set((state) => ({ projects: state.projects.map(p => p.id === id ? updated : p) }));
        if (data.currency_main) set({ targetCurrency: data.currency_main, exchangeRate: 1.0 });
      }
    } catch (error) { console.error("Erro update:", error); }
  },

  removeProject: async (id) => {
    try {
      await projectService.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject
      }));
    } catch (error) { console.error("Erro delete:", error); }
  },

  fetchProject: async (id) => {
    set({ isLoading: true });
    try {
      const project = await projectService.getProjectById(id);
      const scenarios = await scenarioService.getScenarios(id);
      
      const baseScenario = scenarios.find(s => s.is_base) || scenarios[0];

      set({ 
        currentProject: project,
        targetCurrency: project?.currency_main || 'BRL',
        exchangeRate: 1.0,
        scenarios: scenarios,
        currentScenario: baseScenario || null
      });

      if (baseScenario) {
        await get().fetchAssumptions(baseScenario.id);
      }

    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  // --- CENÁRIOS ---

  changeScenario: async (scenarioId: string) => {
    const { scenarios } = get();
    const targetScenario = scenarios.find(s => s.id === scenarioId);
    
    if (targetScenario) {
      set({ currentScenario: targetScenario, isLoading: true });
      await get().fetchAssumptions(scenarioId);
      set({ isLoading: false });
    }
  },

  createScenario: async (name: string) => {
    const { currentScenario } = get();
    if (!currentScenario) return;

    set({ isLoading: true });
    try {
      const newScenario = await scenarioService.cloneScenario(currentScenario.id, name);
      if (newScenario) {
        set(state => ({ scenarios: [...state.scenarios, newScenario] }));
        await get().changeScenario(newScenario.id);
      }
    } catch (error) {
      console.error("Erro ao clonar cenário:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // NOVA: Renomear
  renameScenario: async (scenarioId: string, newName: string) => {
    try {
      const updated = await scenarioService.updateScenario(scenarioId, newName);
      if (updated) {
        set(state => ({
          scenarios: state.scenarios.map(s => s.id === scenarioId ? updated : s),
          currentScenario: state.currentScenario?.id === scenarioId ? updated : state.currentScenario
        }));
      }
    } catch (error) {
      console.error("Erro ao renomear:", error);
    }
  },

  deleteScenario: async (scenarioId: string) => {
    try {
      await scenarioService.deleteScenario(scenarioId);
      
      const { scenarios, currentScenario } = get();
      const updatedScenarios = scenarios.filter(s => s.id !== scenarioId);
      
      set({ scenarios: updatedScenarios });

      // Se deletou o cenário ativo, muda para o primeiro disponível
      if (currentScenario?.id === scenarioId) {
        const fallback = updatedScenarios.find(s => s.is_base) || updatedScenarios[0];
        if (fallback) {
          await get().changeScenario(fallback.id);
        } else {
          set({ currentScenario: null, assumptions: [], projection: null });
        }
      }

    } catch (error) {
      console.error("Erro ao deletar cenário:", error);
    }
  },

  // --- PREMISSAS ---

  fetchAssumptions: async (scenarioId) => {
    try {
      const data = await assumptionService.getAssumptions(scenarioId);
      set({ assumptions: data, projection: calculateProjection(data) });
    } catch (error) { console.error(error); }
  },

  addAssumption: async (newAssumption) => {
    try {
      const { currentScenario } = get();
      if (!currentScenario) {
        alert("Erro: Nenhum cenário selecionado.");
        return;
      }
      const assumptionWithScenario = {
        ...newAssumption,
        scenario_id: currentScenario.id,
      } as Omit<Assumption, 'id' | 'created_at'>;

      const created = await assumptionService.createAssumption(assumptionWithScenario);
      if (created) {
        const newList = [...get().assumptions, created];
        set({ assumptions: newList, projection: calculateProjection(newList) });
      }
    } catch (error) { console.error("Erro add:", error); }
  },

  updateAssumption: async (id, updates) => {
    try {
      const currentList = get().assumptions;
      const updatedList = currentList.map(item => item.id === id ? { ...item, ...updates } : item);
      set({ assumptions: updatedList, projection: calculateProjection(updatedList) }); 

      const saved = await assumptionService.updateAssumption(id, updates);
      if (saved) {
         const finalList = get().assumptions.map(item => item.id === id ? saved : item);
         set({ assumptions: finalList, projection: calculateProjection(finalList) });
      }
    } catch (error) { console.error("Erro update:", error); }
  },

  removeAssumption: async (id) => {
    try {
      const currentList = get().assumptions;
      const updatedList = currentList.filter(item => item.id !== id);
      set({ assumptions: updatedList, projection: calculateProjection(updatedList) });
      await assumptionService.deleteAssumption(id);
    } catch (error) { console.error("Erro delete:", error); }
  },

  importAssumptions: async (items) => {
    const { currentScenario, currentProject } = get();
    if (!currentScenario || !currentProject) return 0;

    set({ isLoading: true });
    let imported = 0;

    const idMap: Record<string, string> = {};

    const parentBases = items.filter((i: any) => i.category === 'base' && !i.driver_id);
    const childBases = items.filter((i: any) => i.category === 'base' && i.driver_id);
    const rest = items.filter((i: any) => i.category !== 'base');

    try {
      for (const item of parentBases) {
        const exportId = (item as any)._exportId;
        const { _exportId, ...cleanItem } = item as any;
        const payload = {
          ...cleanItem,
          driver_id: null,
          project_id: currentProject.id,
          scenario_id: currentScenario.id,
        } as Omit<Assumption, 'id' | 'created_at'>;
        const created = await assumptionService.createAssumption(payload);
        if (created) {
          imported++;
          if (exportId) idMap[exportId] = created.id;
        }
      }

      for (const item of childBases) {
        const exportId = (item as any)._exportId;
        const { _exportId, ...cleanItem } = item as any;
        let newDriverId = cleanItem.driver_id;
        if (newDriverId && idMap[newDriverId]) newDriverId = idMap[newDriverId];
        else if (newDriverId) newDriverId = null;
        const payload = {
          ...cleanItem,
          driver_id: newDriverId,
          project_id: currentProject.id,
          scenario_id: currentScenario.id,
        } as Omit<Assumption, 'id' | 'created_at'>;
        const created = await assumptionService.createAssumption(payload);
        if (created) {
          imported++;
          if (exportId) idMap[exportId] = created.id;
        }
      }

      for (const item of rest) {
        const { _exportId, ...cleanItem } = item as any;
        let newDriverId = cleanItem.driver_id;
        if (newDriverId && idMap[newDriverId]) {
          newDriverId = idMap[newDriverId];
        } else if (newDriverId) {
          newDriverId = null;
        }
        const payload = {
          ...cleanItem,
          driver_id: newDriverId,
          project_id: currentProject.id,
          scenario_id: currentScenario.id,
        } as Omit<Assumption, 'id' | 'created_at'>;
        const created = await assumptionService.createAssumption(payload);
        if (created) imported++;
      }

      await get().fetchAssumptions(currentScenario.id);
    } catch (error) {
      console.error("Erro import:", error);
    } finally {
      set({ isLoading: false });
    }
    return imported;
  },

  setExchangeRate: (rate: number, currency: string) => {
    set({ exchangeRate: rate, targetCurrency: currency });
  }
}));