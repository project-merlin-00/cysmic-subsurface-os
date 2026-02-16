/**
 * Phase 4: Report Builder Components
 * PDF, DOCX, PPTX Generation
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface Report {
  id: number;
  name: string;
  format: 'pdf' | 'docx' | 'pptx';
  file_path: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

interface ReportTemplate {
  id: number;
  name: string;
  format: string;
  description?: string;
  sections: any[];
  is_default: boolean;
}

interface Well {
  id: number;
  name: string;
  field?: string;
  status: string;
}

// API functions
const api = {
  getTemplates: async (format?: string): Promise<ReportTemplate[]> => {
    const url = format ? `/api/v1/reports/templates?format=${format}` : '/api/v1/reports/templates';
    const response = await fetch(url);
    return response.json();
  },
  
  getReports: async (): Promise<Report[]> => {
    const response = await fetch('/api/v1/reports');
    return response.json();
  },
  
  createReport: async (data: {
    name: string;
    format: string;
    wells: number[];
    analyses: number[];
    title?: string;
    subtitle?: string;
    template_id?: number;
  }): Promise<Report> => {
    const params = new URLSearchParams();
    params.append('name', data.name);
    params.append('format', data.format);
    data.wells.forEach(id => params.append('wells', id.toString()));
    data.analyses.forEach(id => params.append('analyses', id.toString()));
    if (data.title) params.append('title', data.title);
    if (data.subtitle) params.append('subtitle', data.subtitle);
    if (data.template_id) params.append('template_id', data.template_id.toString());
    
    const response = await fetch(`/api/v1/reports?${params.toString()}`, {
      method: 'POST',
    });
    return response.json();
  },
  
  deleteReport: async (reportId: number): Promise<void> => {
    await fetch(`/api/v1/reports/${reportId}`, {
      method: 'DELETE',
    });
  },
  
  getWells: async (): Promise<Well[]> => {
    const response = await fetch('/api/v1/wells');
    return response.json();
  },
};

// Report Builder Component
interface ReportBuilderProps {
  onClose?: () => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'pdf' | 'docx' | 'pptx'>('pdf');
  const [title, setTitle] = useState('CYSMIC Subsurface Report');
  const [subtitle, setSubtitle] = useState('');
  const [selectedWells, setSelectedWells] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  
  // Fetch data
  const { data: templates } = useQuery({
    queryKey: ['reportTemplates', format],
    queryFn: () => api.getTemplates(format),
  });
  
  const { data: wells } = useQuery({
    queryKey: ['wells'],
    queryFn: api.getWells,
  });
  
  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: api.getReports,
  });
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: api.createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setName('');
      setSelectedWells([]);
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: api.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate({
      name: name || `Report ${new Date().toLocaleDateString()}`,
      format,
      wells: selectedWells,
      analyses: [], // Could be added
      title,
      subtitle,
      template_id: selectedTemplate || undefined,
    });
  };
  
  const toggleWell = (wellId: number) => {
    setSelectedWells(prev =>
      prev.includes(wellId)
        ? prev.filter(id => id !== wellId)
        : [...prev, wellId]
    );
  };
  
  return (
    <div className="panel-border bg-[#F7F5F2] p-6 rounded-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#d44211' }}>Report Builder</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Report Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Report ${new Date().toLocaleDateString()}`}
            className="w-full p-2 border border-[#C7C0B0] rounded"
          />
        </div>
        
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Output Format</label>
          <div className="flex gap-4">
            {(['pdf', 'docx', 'pptx'] as const).map((f) => (
              <label key={f} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={(e) => setFormat(e.target.value as typeof format)}
                  className="accent-[#d44211]"
                />
                <span className="uppercase font-medium">{f}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Title & Subtitle */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Optional subtitle"
              className="w-full p-2 border border-[#C7C0B0] rounded"
            />
          </div>
        </div>
        
        {/* Template Selection */}
        {templates && templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Template (Optional)</label>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border border-[#C7C0B0] rounded"
            >
              <option value="">No template (use defaults)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_default && '(Default)'}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Well Selection */}
        {wells && wells.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Include Wells ({selectedWells.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-[#C7C0B0] rounded p-2">
              {wells.map((well) => (
                <label
                  key={well.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-[#EBE8E1] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedWells.includes(well.id)}
                    onChange={() => toggleWell(well.id)}
                    className="accent-[#d44211]"
                  />
                  <span className="text-sm truncate">{well.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-3 bg-[#d44211] text-white rounded-lg hover:bg-[#b8380e] disabled:opacity-50 font-medium"
          >
            {createMutation.isPending ? 'Generating...' : `Generate ${format.toUpperCase()} Report`}
          </button>
        </div>
      </form>
      
      {/* Recent Reports */}
      {reports && reports.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
          <div className="space-y-2">
            {reports.slice(0, 5).map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 bg-white border border-[#C7C0B0] rounded"
              >
                <div>
                  <span className="font-medium">{report.name}</span>
                  <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded bg-gray-100">
                    {report.format}
                  </span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded ${
                      report.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : report.status === 'generating'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {report.status === 'completed' && (
                    <a
                      href={`/api/v1/reports/${report.id}/download`}
                      className="text-sm text-[#d44211] hover:underline"
                    >
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(report.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Export button component that can be placed anywhere
interface ExportButtonProps {
  wells?: number[];
  analyses?: number[];
  format?: 'pdf' | 'docx' | 'pptx';
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  wells = [],
  analyses = [],
  format = 'pdf',
  label = 'Export',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const createMutation = useMutation({
    mutationFn: api.createReport,
  });
  
  const handleExport = (exportFormat: 'pdf' | 'docx' | 'pptx') => {
    createMutation.mutate({
      name: `Export ${new Date().toLocaleDateString()}`,
      format: exportFormat,
      wells,
      analyses,
    });
    setShowMenu(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 border border-[#C7C0B0] rounded hover:bg-[#EBE8E1] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {label}
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-[#C7C0B0] rounded shadow-lg z-10">
          <button
            onClick={() => handleExport('pdf')}
            className="w-full text-left px-4 py-2 hover:bg-[#EBE8E1] rounded-t"
          >
            📄 Export as PDF
          </button>
          <button
            onClick={() => handleExport('docx')}
            className="w-full text-left px-4 py-2 hover:bg-[#EBE8E1]"
          >
            📝 Export as DOCX
          </button>
          <button
            onClick={() => handleExport('pptx')}
            className="w-full text-left px-4 py-2 hover:bg-[#EBE8E1] rounded-b"
          >
            📊 Export as PPTX
          </button>
        </div>
      )}
    </div>
  );
};

export default {
  ReportBuilder,
  ExportButton,
};
