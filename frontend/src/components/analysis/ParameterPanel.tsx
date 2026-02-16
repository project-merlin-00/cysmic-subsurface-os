import { useState } from 'react';
import { Sliders, RotateCcw, Save, Info } from 'lucide-react';
import { clsx } from 'clsx';

export interface Parameter {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  category: 'reservoir' | 'fluid' | 'production' | 'economic';
  description?: string;
}

interface ParameterPanelProps {
  parameters: Parameter[];
  onChange: (params: Parameter[]) => void;
  onSave?: (params: Parameter[]) => void;
  title?: string;
}

const defaultCategories = [
  { id: 'reservoir', label: 'Reservoir', color: '#d44211' },
  { id: 'fluid', label: 'Fluid Properties', color: '#2d6a4f' },
  { id: 'production', label: 'Production', color: '#d97706' },
  { id: 'economic', label: 'Economic', color: '#2563eb' }
];

export function ParameterPanel({
  parameters,
  onChange,
  onSave,
  title = 'Analysis Parameters'
}: ParameterPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [localParams, setLocalParams] = useState(parameters);

  const updateParameter = (id: string, value: number) => {
    const updated = localParams.map(p => 
      p.id === id ? { ...p, value } : p
    );
    setLocalParams(updated);
    onChange(updated);
  };

  const resetToDefaults = () => {
    const defaults = parameters.map(p => ({
      ...p,
      value: (p.min + p.max) / 2 // Reset to middle value
    }));
    setLocalParams(defaults);
    onChange(defaults);
  };

  const filteredParams = activeCategory 
    ? localParams.filter(p => p.category === activeCategory)
    : localParams;

  const getCategoryColor = (category: string) => {
    return defaultCategories.find(c => c.id === category)?.color || '#8C8370';
  };

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-sandstone-50 border-b border-sandstone-200">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-sandstone-900">{title}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1 px-2 py-1 text-xs text-sandstone-600 hover:text-sandstone-800 hover:bg-sandstone-100 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          {onSave && (
            <button
              onClick={() => onSave(localParams)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 px-4 py-2 bg-sandstone-100 border-b border-sandstone-200 overflow-x-auto">
        <button
          onClick={() => setActiveCategory(null)}
          className={clsx(
            'px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors',
            activeCategory === null
              ? 'bg-white text-sandstone-900 shadow-sm'
              : 'text-sandstone-600 hover:text-sandstone-800'
          )}
        >
          All
        </button>
        {defaultCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors flex items-center gap-1',
              activeCategory === cat.id
                ? 'bg-white shadow-sm'
                : 'text-sandstone-600 hover:text-sandstone-800'
            )}
            style={activeCategory === cat.id ? { color: cat.color } : undefined}
          >
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Parameters List */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {filteredParams.map(param => (
          <div key={param.id} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getCategoryColor(param.category) }}
                />
                <label 
                  htmlFor={param.id}
                  className="text-sm font-medium text-sandstone-700"
                >
                  {param.name}
                </label>
                {param.description && (
                  <div className="group relative">
                    <Info className="w-3 h-3 text-sandstone-400 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-sandstone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {param.description}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Value Input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id={param.id}
                  value={param.value}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  onChange={e => updateParameter(param.id, Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm font-mono border border-sandstone-300 rounded text-right"
                />
                {param.unit && (
                  <span className="text-xs text-sandstone-400 w-8">{param.unit}</span>
                )}
              </div>
            </div>
            
            {/* Slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-sandstone-400 w-12 text-right">{param.min}</span>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={param.value}
                onChange={e => updateParameter(param.id, Number(e.target.value))}
                className="flex-1 h-2 bg-sandstone-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                style={{ accentColor: getCategoryColor(param.category) }}
              />
              <span className="text-xs text-sandstone-400 w-12">{param.max}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="px-4 py-3 bg-sandstone-50 border-t border-sandstone-200">
        <div className="flex items-center justify-between text-xs text-sandstone-500">
          <span>{filteredParams.length} parameters</span>
          <span>
            Categories: {[...new Set(filteredParams.map(p => p.category))].join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}

// Default parameters for common analyses
export const defaultAnalysisParameters: Parameter[] = [
  // Reservoir
  {
    id: 'porosity',
    name: 'Porosity',
    value: 0.2,
    min: 0,
    max: 0.4,
    step: 0.01,
    unit: 'fraction',
    category: 'reservoir',
    description: 'Rock porosity (φ)'
  },
  {
    id: 'sw',
    name: 'Water Saturation',
    value: 0.3,
    min: 0,
    max: 1,
    step: 0.05,
    unit: 'fraction',
    category: 'reservoir',
    description: 'Water saturation (Sw)'
  },
  {
    id: 'thickness',
    name: 'Net Thickness',
    value: 50,
    min: 0,
    max: 200,
    step: 1,
    unit: 'ft',
    category: 'reservoir',
    description: 'Net pay thickness'
  },
  {
    id: 'area',
    name: 'Drainage Area',
    value: 160,
    min: 10,
    max: 640,
    step: 10,
    unit: 'acres',
    category: 'reservoir',
    description: 'Reservoir drainage area'
  },
  
  // Fluid Properties
  {
    id: 'bo',
    name: 'Oil FVF',
    value: 1.2,
    min: 1,
    max: 2,
    step: 0.01,
    unit: 'rbbl/stb',
    category: 'fluid',
    description: 'Oil Formation Volume Factor (Bo)'
  },
  {
    id: 'bg',
    name: 'Gas FVF',
    value: 0.005,
    min: 0.001,
    max: 0.02,
    step: 0.0001,
    unit: 'rbbl/Mscf',
    category: 'fluid',
    description: 'Gas Formation Volume Factor (Bg)'
  },
  {
    id: 'viscosity',
    name: 'Oil Viscosity',
    value: 2,
    min: 0.1,
    max: 10,
    step: 0.1,
    unit: 'cp',
    category: 'fluid',
    description: 'Oil viscosity (μo)'
  },
  
  // Production
  {
    id: 'qi',
    name: 'Initial Rate',
    value: 500,
    min: 0,
    max: 5000,
    step: 10,
    unit: 'bbl/d',
    category: 'production',
    description: 'Initial production rate'
  },
  {
    id: 'di',
    name: 'Decline Rate',
    value: 0.15,
    min: 0.01,
    max: 0.5,
    step: 0.01,
    unit: '1/mo',
    category: 'production',
    description: 'Initial decline rate (Di)'
  },
  
  // Economic
  {
    id: 'oil_price',
    name: 'Oil Price',
    value: 80,
    min: 20,
    max: 200,
    step: 1,
    unit: '$/bbl',
    category: 'economic',
    description: 'Oil selling price'
  },
  {
    id: 'opex',
    name: 'OPEX',
    value: 20,
    min: 5,
    max: 50,
    step: 1,
    unit: '$/bbl',
    category: 'economic',
    description: 'Operating expense per barrel'
  }
];
