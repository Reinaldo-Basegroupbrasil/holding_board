import { create } from 'zustand';
import { Project, Assumption, ProjectionSummary, Scenario } from '@/types';
import { projectService } from '@/services/projectService';
import { assumptionService } from '@/services/assumptionService';
import { scenarioService } from '@/services/scenarioService';
import { calculateProjection, TaxConfig } from '@/lib/projectionEngine';

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
  discountRate: number;
  profitTaxMode: 'manual' | 'auto';
  profitTaxRate: number;

  compareMode: boolean;
  compareScenarioIds: string[];
  compareProjections: Record<string, { scenario: Scenario; projection: ProjectionSummary }>;

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
  setDiscountRate: (rate: number) => void;
  setProfitTaxMode: (mode: 'manual' | 'auto') => void;
  setProfitTaxRate: (rate: number) => void;

  setCompareMode: (on: boolean) => void;
  toggleCompareScenario: (scenarioId: string) => void;
  loadCompareProjections: () => Promise<void>;
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
  discountRate: 12,
  profitTaxMode: 'manual',
  profitTaxRate: 34,

  compareMode: false,
  compareScenarioIds: [],
  compareProjections: {},

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
        if (data.projection_months) {
          const { assumptions, profitTaxMode, profitTaxRate } = get();
          const tc: TaxConfig = { mode: profitTaxMode, rate: profitTaxRate };
          set({ projection: calculateProjection(assumptions, tc, data.projection_months) });
        }
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
    const { currentScenario, currentProject } = get();
    if (!currentScenario || !currentProject) return;

    set({ isLoading: true });
    try {
      const newScenario = await scenarioService.createScenarioRow(currentProject.id, name);
      if (!newScenario) return;

      const sourceAssumptions = await assumptionService.getAssumptions(currentScenario.id);
      const idMap: Record<string, string> = {};

      const parentBases = sourceAssumptions.filter(a => a.category === 'base' && !a.driver_id);
      const childBases = sourceAssumptions.filter(a => a.category === 'base' && a.driver_id);
      const others = sourceAssumptions.filter(a => a.category !== 'base');

      for (const item of parentBases) {
        const { id, created_at, ...rest } = item;
        const payload = { ...rest, project_id: currentProject.id, scenario_id: newScenario.id };
        const created = await assumptionService.createAssumption(payload as any);
        if (created) idMap[item.id] = created.id;
      }

      for (const item of childBases) {
        const { id, created_at, ...rest } = item;
        const newDriverId = rest.driver_id && idMap[rest.driver_id] ? idMap[rest.driver_id] : null;
        const payload = { ...rest, driver_id: newDriverId, project_id: currentProject.id, scenario_id: newScenario.id };
        const created = await assumptionService.createAssumption(payload as any);
        if (created) idMap[item.id] = created.id;
      }

      for (const item of others) {
        const { id, created_at, ...rest } = item;
        const newDriverId = rest.driver_id && idMap[rest.driver_id] ? idMap[rest.driver_id] : null;
        const payload = { ...rest, driver_id: newDriverId, project_id: currentProject.id, scenario_id: newScenario.id };
        const created = await assumptionService.createAssumption(payload as any);
        if (created) idMap[item.id] = created.id;
      }

      set(state => ({ scenarios: [...state.scenarios, newScenario] }));
      await get().changeScenario(newScenario.id);
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
      const tc: TaxConfig = { mode: get().profitTaxMode, rate: get().profitTaxRate };
      const months = get().currentProject?.projection_months || 36;
      set({ assumptions: data, projection: calculateProjection(data, tc, months) });
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
        const tc: TaxConfig = { mode: get().profitTaxMode, rate: get().profitTaxRate };
        const months = get().currentProject?.projection_months || 36;
        set({ assumptions: newList, projection: calculateProjection(newList, tc, months) });
      }
    } catch (error) { console.error("Erro add:", error); }
  },

  updateAssumption: async (id, updates) => {
    try {
      const tc: TaxConfig = { mode: get().profitTaxMode, rate: get().profitTaxRate };
      const months = get().currentProject?.projection_months || 36;
      const currentList = get().assumptions;
      const updatedList = currentList.map(item => item.id === id ? { ...item, ...updates } : item);
      set({ assumptions: updatedList, projection: calculateProjection(updatedList, tc, months) }); 

      const saved = await assumptionService.updateAssumption(id, updates);
      if (saved) {
         const finalList = get().assumptions.map(item => item.id === id ? saved : item);
         set({ assumptions: finalList, projection: calculateProjection(finalList, tc, months) });
      }
    } catch (error) { console.error("Erro update:", error); }
  },

  removeAssumption: async (id) => {
    try {
      const tc: TaxConfig = { mode: get().profitTaxMode, rate: get().profitTaxRate };
      const months = get().currentProject?.projection_months || 36;
      const currentList = get().assumptions;
      const updatedList = currentList.filter(item => item.id !== id);
      set({ assumptions: updatedList, projection: calculateProjection(updatedList, tc, months) });
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
  },

  setDiscountRate: (rate: number) => {
    set({ discountRate: rate });
  },

  setProfitTaxMode: (mode: 'manual' | 'auto') => {
    set({ profitTaxMode: mode });
    const { assumptions, profitTaxRate, currentProject } = get();
    const taxConfig = { mode, rate: profitTaxRate };
    const months = currentProject?.projection_months || 36;
    set({ projection: calculateProjection(assumptions, taxConfig, months) });
  },

  setProfitTaxRate: (rate: number) => {
    set({ profitTaxRate: rate });
    const { assumptions, profitTaxMode, currentProject } = get();
    if (profitTaxMode === 'auto') {
      const taxConfig = { mode: profitTaxMode, rate };
      const months = currentProject?.projection_months || 36;
      set({ projection: calculateProjection(assumptions, taxConfig, months) });
    }
  },

  // --- COMPARAÇÃO DE CENÁRIOS ---

  setCompareMode: (on: boolean) => {
    if (!on) {
      set({ compareMode: false, compareScenarioIds: [], compareProjections: {} });
    } else {
      set({ compareMode: true });
    }
  },

  toggleCompareScenario: (scenarioId: string) => {
    const { compareScenarioIds } = get();
    if (compareScenarioIds.includes(scenarioId)) {
      set({ compareScenarioIds: compareScenarioIds.filter(id => id !== scenarioId) });
    } else if (compareScenarioIds.length < 3) {
      set({ compareScenarioIds: [...compareScenarioIds, scenarioId] });
    }
  },

  loadCompareProjections: async () => {
    const { compareScenarioIds, scenarios, profitTaxMode, profitTaxRate, currentProject } = get();
    if (compareScenarioIds.length < 2) return;

    set({ isLoading: true });
    try {
      const taxConfig: TaxConfig = { mode: profitTaxMode, rate: profitTaxRate };
      const months = currentProject?.projection_months || 36;
      const result: Record<string, { scenario: Scenario; projection: ProjectionSummary }> = {};

      for (const sid of compareScenarioIds) {
        const scenario = scenarios.find(s => s.id === sid);
        if (!scenario) continue;
        const data = await assumptionService.getAssumptions(sid);
        result[sid] = { scenario, projection: calculateProjection(data, taxConfig, months) };
      }

      set({ compareProjections: result, compareMode: true });
    } catch (error) {
      console.error("Erro ao carregar comparação:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));