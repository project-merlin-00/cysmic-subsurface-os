/**
 * Phase 4: Integration Components
 * Petrel/Eclipse/Kappa Integration UI
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// Types
interface PetrelProject {
  project_name: string;
  project_path: string;
  wells: string[];
  seismic_volumes: string[];
  petrophysical_models: string[];
}

interface EclipseDeck {
  deck_name: string;
  deck_path: string;
  include_files: string[];
  run_parameters: Record<string, any>;
}

interface KappaProject {
  project_name: string;
  project_path: string;
  well_test_models: string[];
  pressure_transient_models: string[];
}

interface ImportResult {
  success: boolean;
  imported_wells: string[];
  imported_data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

interface ExportResult {
  success: boolean;
  output_file: string;
  exported_data: Record<string, any>;
  errors: string[];
}

interface SyncStatus {
  id: number;
  source: string;
  entity_type: string;
  entity_id: string;
  sync_status: string;
  last_sync: string;
}

// API functions
const api = {
  // Petrel
  parsePetrel: async (projectPath: string): Promise<PetrelProject> => {
    const formData = new FormData();
    formData.append('project_path', projectPath);
    const response = await fetch('/api/v1/integration/petrel/parse', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  importFromPetrel: async (projectPath: string, wellNames?: string[]): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('project_path', projectPath);
    if (wellNames) formData.append('well_names', wellNames.join(','));
    const response = await fetch('/api/v1/integration/petrel/import', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  exportToPetrel: async (wells: number[], outputPath: string): Promise<ExportResult> => {
    const formData = new FormData();
    formData.append('output_path', outputPath);
    wells.forEach(id => formData.append('wells', id.toString()));
    const response = await fetch('/api/v1/integration/petrel/export', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  // Eclipse
  parseEclipse: async (deckPath: string): Promise<EclipseDeck> => {
    const formData = new FormData();
    formData.append('deck_path', deckPath);
    const response = await fetch('/api/v1/integration/eclipse/parse', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  importFromEclipse: async (deckPath: string): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('deck_path', deckPath);
    const response = await fetch('/api/v1/integration/eclipse/import', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  exportToEclipse: async (wells: number[], outputPath: string): Promise<ExportResult> => {
    const formData = new FormData();
    formData.append('output_path', outputPath);
    wells.forEach(id => formData.append('wells', id.toString()));
    const response = await fetch('/api/v1/integration/eclipse/export', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  // Kappa
  parseKappa: async (projectPath: string): Promise<KappaProject> => {
    const formData = new FormData();
    formData.append('project_path', projectPath);
    const response = await fetch('/api/v1/integration/kappa/parse', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  importFromKappa: async (projectPath: string): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('project_path', projectPath);
    const response = await fetch('/api/v1/integration/kappa/import', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  exportToKappa: async (wells: number[], outputPath: string): Promise<ExportResult> => {
    const formData = new FormData();
    formData.append('output_path', outputPath);
    wells.forEach(id => formData.append('wells', id.toString()));
    const response = await fetch('/api/v1/integration/kappa/export', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  // Sync status
  getSyncStatus: async (source: string): Promise<SyncStatus[]> => {
    const response = await fetch(`/api/v1/integration/sync/status/${source}`);
    return response.json();
  },
  
  // Wells
  getWells: async (): Promise<any[]> => {
    const response = await fetch('/api/v1/wells');
    return response.json();
  },
};

// Integration Panel Component
interface IntegrationPanelProps {
  onClose?: () => void;
}

export const IntegrationPanel: React.FC<IntegrationPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'petrel' | 'eclipse' | 'kappa'>('petrel');
  
  return (
    <div className="panel-border bg-[#F7F5F2] p-6 rounded-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#d44211' }}>
          Petrel / Eclipse / Kappa Integration
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-[#C7C0B0] mb-6">
        {(['petrel', 'eclipse', 'kappa'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 text-[#d44211] border-[#d44211]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'petrel' && '🔹 Petrel'}
            {tab === 'eclipse' && '🔸 Eclipse'}
            {tab === 'kappa' && '🔷 Kappa'}
          </button>
        ))}
      </div>
      
      {/* Content */}
      {activeTab === 'petrel' && <PetrelIntegration />}
      {activeTab === 'eclipse' && <EclipseIntegration />}
      {activeTab === 'kappa' && <KappaIntegration />}
    </div>
  );
};

// Petrel Integration
const PetrelIntegration: React.FC = () => {
  const [projectPath, setProjectPath] = useState('');
  const [selectedWells, setSelectedWells] = useState<number[]>([]);
  const [outputPath, setOutputPath] = useState('');
  
  const { data: wells } = useQuery({
    queryKey: ['wells'],
    queryFn: api.getWells,
  });
  
  const parseMutation = useMutation({
    mutationFn: () => api.parsePetrel(projectPath),
  });
  
  const importMutation = useMutation({
    mutationFn: (wellNames?: string[]) => api.importFromPetrel(projectPath, wellNames),
  });
  
  const exportMutation = useMutation({
    mutationFn: () => api.exportToPetrel(selectedWells, outputPath),
  });
  
  return (
    <div className="space-y-6">
      {/* Import Section */}
      <div className="bg-white p-4 rounded border border-[#C7C0B0]">
        <h3 className="text-lg font-semibold mb-4">Import from Petrel</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Path</label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/petrel/project"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          
          <button
            onClick={() => parseMutation.mutate()}
            disabled={!projectPath || parseMutation.isPending}
            className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
          >
            {parseMutation.isPending ? 'Parsing...' : 'Parse Project'}
          </button>
          
          {parseMutation.isSuccess && parseMutation.data && (
            <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
              <p className="font-medium">Found {parseMutation.data.wells.length} wells</p>
              {parseMutation.data.wells.length > 0 && (
                <ul className="mt-2 text-sm">
                  {parseMutation.data.wells.slice(0, 5).map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                  {parseMutation.data.wells.length > 5 && (
                    <li className="text-gray-500">...and {parseMutation.data.wells.length - 5} more</li>
                  )}
                </ul>
              )}
              
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing...' : 'Import Wells'}
              </button>
              
              {importMutation.isSuccess && (
                <div className={`mt-4 p-3 rounded ${importMutation.data.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {importMutation.data.success
                    ? `✓ Imported ${importMutation.data.imported_wells.length} wells`
                    : `✗ Error: ${importMutation.data.errors.join(', ')}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Export Section */}
      <div className="bg-white p-4 rounded border border-[#C7C0B0]">
        <h3 className="text-lg font-semibold mb-4">Export to Petrel</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Output Path</label>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="/path/to/export/folder"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          
          {wells && wells.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Wells</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-[#C7C0B0] rounded p-2">
                {wells.map((well: any) => (
                  <label key={well.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedWells.includes(well.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWells([...selectedWells, well.id]);
                        } else {
                          setSelectedWells(selectedWells.filter(id => id !== well.id));
                        }
                      }}
                      className="accent-[#d44211]"
                    />
                    <span className="text-sm">{well.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => exportMutation.mutate()}
            disabled={selectedWells.length === 0 || !outputPath || exportMutation.isPending}
            className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export to Petrel'}
          </button>
          
          {exportMutation.isSuccess && (
            <div className={`mt-4 p-3 rounded ${exportMutation.data.success ? 'bg-green-100' : 'bg-red-100'}`}>
              {exportMutation.data.success
                ? `✓ Exported to ${exportMutation.data.output_file}`
                : `✗ Error: ${exportMutation.data.errors.join(', ')}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Eclipse Integration
const EclipseIntegration: React.FC = () => {
  const [deckPath, setDeckPath] = useState('');
  const [selectedWells, setSelectedWells] = useState<number[]>([]);
  const [outputPath, setOutputPath] = useState('');
  
  const { data: wells } = useQuery({
    queryKey: ['wells'],
    queryFn: api.getWells,
  });
  
  const parseMutation = useMutation({
    mutationFn: () => api.parseEclipse(deckPath),
  });
  
  const importMutation = useMutation({
    mutationFn: () => api.importFromEclipse(deckPath),
  });
  
  const exportMutation = useMutation({
    mutationFn: () => api.exportToEclipse(selectedWells, outputPath),
  });
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded border border-[#C7C0B0]">
        <h3 className="text-lg font-semibold mb-4">Import from Eclipse</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deck Path (.DATA file)</label>
            <input
              type="text"
              value={deckPath}
              onChange={(e) => setDeckPath(e.target.value)}
              placeholder="/path/to/case.DATA"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          
          <button
            onClick={() => parseMutation.mutate()}
            disabled={!deckPath || parseMutation.isPending}
            className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
          >
            {parseMutation.isPending ? 'Parsing...' : 'Parse Deck'}
          </button>
          
          {parseMutation.isSuccess && parseMutation.data && (
            <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
              <p className="font-medium">Found {parseMutation.data.include_files.length} includes</p>
              {Object.keys(parseMutation.data.run_parameters).length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Parameters:</p>
                  <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(parseMutation.data.run_parameters, null, 2)}
                  </pre>
                </div>
              )}
              
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing...' : 'Import Data'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded border border-[#C7C0B0]">
        <h3 className="text-lg font-semibold mb-4">Export to Eclipse</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Output Deck Path</label>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="/path/to/case.DATA"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          
          {wells && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Wells</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-[#C7C0B0] rounded p-2">
                {wells.map((well: any) => (
                  <label key={well.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedWells.includes(well.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWells([...selectedWells, well.id]);
                        } else {
                          setSelectedWells(selectedWells.filter(id => id !== well.id));
                        }
                      }}
                      className="accent-[#d44211]"
                    />
                    <span className="text-sm">{well.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => exportMutation.mutate()}
            disabled={selectedWells.length === 0 || !outputPath || exportMutation.isPending}
            className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export Deck'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Kappa Integration
const KappaIntegration: React.FC = () => {
  const [projectPath, setProjectPath] = useState('');
  const [selectedWells, setSelectedWells] = useState<number[]>([]);
  const [outputPath, setOutputPath] = useState('');
  
  const { data: wells } = useQuery({
    queryKey: ['wells'],
    queryFn: api.getWells,
  });
  
  const parseMutation = useMutation({
    mutationFn: () => api.parseKappa(projectPath),
  });
  
  const importMutation = useMutation({
    mutationFn: () => api.importFromKappa(projectPath),
  });
  
  const exportMutation = useMutation({
    mutationFn: () => api.exportToKappa(selectedWells, outputPath),
  });
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded border border-[#C7C0B0]">
        <h3 className="text-lg font-semibold mb-4">Import from Kappa Workbench</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Path</label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/kappa/project"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          
          <button
            onClick={() => parseMutation.mutate()}
            disabled={!projectPath || parseMutation.isPending}
            className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
          >
            {parseMutation.isPending ? 'Parsing...' : 'Parse Project'}
          </button>
          
          {parseMutation.isSuccess && parseMutation.data && (
            <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
              <p className="font-medium">
                Found {parseMutation.data.well_test_models.length} well test models,{' '}
                {parseMutation.data.pressure_transient_models.length} pressure models
              </p>
              
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing...' : 'Import Models'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded border border-[#C7C0B0]">
        <h3 className="text-lg font-semibold mb-4">Export to Kappa</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Output Path</label>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="/path/to/kappa/export"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          
          {wells && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Wells</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-[#C7C0B0] rounded p-2">
                {wells.map((well: any) => (
                  <label key={well.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedWells.includes(well.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWells([...selectedWells, well.id]);
                        } else {
                          setSelectedWells(selectedWells.filter(id => id !== well.id));
                        }
                      }}
                      className="accent-[#d44211]"
                    />
                    <span className="text-sm">{well.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => exportMutation.mutate()}
            disabled={selectedWells.length === 0 || !outputPath || exportMutation.isPending}
            className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export to Kappa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default {
  IntegrationPanel,
};
