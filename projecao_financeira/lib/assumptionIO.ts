import { Assumption } from '@/types';

export interface ExportedAssumption extends Omit<Assumption, 'id' | 'project_id' | 'scenario_id' | 'created_at'> {
  _exportId: string;
}

export interface ExportPayload {
  version: 2;
  exportedAt: string;
  projectName: string;
  scenarioName: string;
  assumptions: ExportedAssumption[];
}

export function buildExportPayload(
  assumptions: Assumption[],
  projectName: string,
  scenarioName: string
): ExportPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    projectName,
    scenarioName,
    assumptions: assumptions.map(({ id, project_id, scenario_id, created_at, ...rest }) => ({
      ...rest,
      _exportId: id,
    })),
  };
}

export function downloadJSON(payload: ExportPayload, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<ExportPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.version || !Array.isArray(data.assumptions)) {
          reject(new Error('Formato de arquivo inválido. Esperado JSON exportado pelo sistema.'));
          return;
        }
        if (data.version === 1) {
          data.version = 2;
          data.assumptions = data.assumptions.map((a: any, idx: number) => ({
            ...a,
            _exportId: a._exportId || `legacy_${idx}`,
          }));
        }
        resolve(data as ExportPayload);
      } catch {
        reject(new Error('Erro ao ler o arquivo. Verifique se é um JSON válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsText(file);
  });
}
