import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface MonteCarloData {
  stoiip: number;
  stoiip_p10: number;
  stoiip_p50: number;
  stoiip_p90: number;
  mean: number;
  std: number;
  samples?: number[];
}

interface MonteCarloChartProps {
  data: MonteCarloData;
  width?: number;
  height?: number;
}

export function MonteCarloChart({ data, width = 600, height = 400 }: MonteCarloChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parentWidth = svgRef.current.parentElement.clientWidth;
        setDimensions({ width: parentWidth, height: Math.min(400, parentWidth * 0.6) });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.samples) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create histogram data
    const samples = data.samples;
    const xMin = d3.min(samples) || 0;
    const xMax = d3.max(samples) || 1;
    
    const xScale = d3.scaleLinear()
      .domain([xMin * 0.8, xMax * 1.2])
      .range([0, innerWidth]);

    const histogram = d3.bin()
      .domain(xScale.domain() as [number, number])
      .thresholds(40);

    const bins = histogram(samples);
    const yMax = d3.max(bins, d => d.length) || 1;

    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0]);

    // Histogram bars
    g.selectAll('.bar')
      .data(bins)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.x0 || 0))
      .attr('y', d => yScale(d.length))
      .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
      .attr('height', d => innerHeight - yScale(d.length))
      .attr('fill', '#d44211')
      .attr('opacity', 0.7);

    // P10, P50, P90 lines
    const percentileData = [
      { value: data.stoiip_p10, label: 'P10', color: '#2d6a4f' },
      { value: data.stoiip_p50, label: 'P50', color: '#d97706' },
      { value: data.stoiip_p90, label: 'P90', color: '#dc2626' }
    ];

    percentileData.forEach(({ value, label, color }) => {
      // Vertical line
      g.append('line')
        .attr('x1', xScale(value))
        .attr('x2', xScale(value))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4');

      // Label
      g.append('text')
        .attr('x', xScale(value))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(`${label}: ${(value / 1e6).toFixed(2)} MMstb`);
    });

    // X axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${(Number(d) / 1e6).toFixed(1)}M`));

    xAxis.selectAll('text').attr('fill', '#706859');
    xAxis.selectAll('line').attr('stroke', '#C7C0B0');
    xAxis.select('.domain').attr('stroke', '#C7C0B0');

    // Y axis
    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale).ticks(5));

    yAxis.selectAll('text').attr('fill', '#706859');
    yAxis.selectAll('line').attr('stroke', '#C7C0B0');
    yAxis.select('.domain').attr('stroke', '#C7C0B0');

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#706859')
      .attr('font-size', '12px')
      .text('STOIIP (MMstb)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#706859')
      .attr('font-size', '12px')
      .text('Frequency');

  }, [data, dimensions]);

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sandstone-900">Monte Carlo Simulation - STOIIP Distribution</h3>
        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
          Uncertainty Analysis
        </span>
      </div>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="overflow-visible" />
    </div>
  );
}

// Input panel for volumetric parameters
interface VolumetricInputPanelProps {
  parameters: {
    area: number;
    area_std: number;
    thickness: number;
    thickness_std: number;
    porosity: number;
    porosity_std: number;
    water_saturation: number;
    water_saturation_std: number;
    oil_fvf: number;
    oil_fvf_std: number;
  };
  onChange: (params: any) => void;
  onRun: () => void;
  loading?: boolean;
}

export function VolumetricInputPanel({ parameters, onChange, onRun, loading }: VolumetricInputPanelProps) {
  const updateParam = (key: string, value: number) => {
    onChange({ ...parameters, [key]: value });
  };

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <h3 className="font-semibold text-sandstone-900 mb-4">Volumetric Parameters</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Area */}
        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Area (acres)</label>
          <input
            type="number"
            value={parameters.area}
            onChange={e => updateParam('area', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
          <input
            type="range"
            min={10}
            max={5000}
            value={parameters.area}
            onChange={e => updateParam('area', Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-xs text-sandstone-500">±{parameters.area_std}</span>
        </div>

        {/* Thickness */}
        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Thickness (ft)</label>
          <input
            type="number"
            value={parameters.thickness}
            onChange={e => updateParam('thickness', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
          <input
            type="range"
            min={5}
            max={500}
            value={parameters.thickness}
            onChange={e => updateParam('thickness', Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-xs text-sandstone-500">±{parameters.thickness_std}</span>
        </div>

        {/* Porosity */}
        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Porosity (fraction)</label>
          <input
            type="number"
            step={0.01}
            value={parameters.porosity}
            onChange={e => updateParam('porosity', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
          <input
            type="range"
            min={0.01}
            max={0.4}
            step={0.01}
            value={parameters.porosity}
            onChange={e => updateParam('porosity', Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-xs text-sandstone-500">±{parameters.porosity_std}</span>
        </div>

        {/* Water Saturation */}
        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Water Saturation</label>
          <input
            type="number"
            step={0.01}
            value={parameters.water_saturation}
            onChange={e => updateParam('water_saturation', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={parameters.water_saturation}
            onChange={e => updateParam('water_saturation', Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-xs text-sandstone-500">±{parameters.water_saturation_std}</span>
        </div>

        {/* Oil FVF */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Oil FVF (rbbl/stb)</label>
          <input
            type="number"
            step={0.01}
            value={parameters.oil_fvf}
            onChange={e => updateParam('oil_fvf', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
          <input
            type="range"
            min={1.0}
            max={2.0}
            step={0.01}
            value={parameters.oil_fvf}
            onChange={e => updateParam('oil_fvf', Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-xs text-sandstone-500">±{parameters.oil_fvf_std}</span>
        </div>
      </div>

      {/* Formula */}
      <div className="mt-4 p-3 bg-sandstone-50 rounded font-mono text-xs text-sandstone-600">
        STOIIP = 7758 × A × h × φ × (1-Sw) / Bo
      </div>

      <button
        onClick={onRun}
        disabled={loading}
        className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Running Simulation...' : 'Run Monte Carlo'}
      </button>
    </div>
  );
}

// Summary stats component
export function VolumetricSummary({ data }: { data: MonteCarloData }) {
  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <h3 className="font-semibold text-sandstone-900 mb-4">STOIIP Summary</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-xs text-red-600 uppercase font-medium">P10 (High)</div>
          <div className="text-lg font-bold font-mono text-red-700">{(data.stoiip_p10 / 1e6).toFixed(2)}</div>
          <div className="text-xs text-red-500">MMstb</div>
        </div>
        
        <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-xs text-amber-600 uppercase font-medium">P50 (Median)</div>
          <div className="text-lg font-bold font-mono text-amber-700">{(data.stoiip_p50 / 1e6).toFixed(2)}</div>
          <div className="text-xs text-amber-500">MMstb</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-xs text-green-600 uppercase font-medium">P90 (Low)</div>
          <div className="text-lg font-bold font-mono text-green-700">{(data.stoiip_p90 / 1e6).toFixed(2)}</div>
          <div className="text-xs text-green-500">MMstb</div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-sandstone-200">
        <div className="flex justify-between text-sm">
          <span className="text-sandstone-500">Mean:</span>
          <span className="font-mono">{(data.mean / 1e6).toFixed(2)} MMstb</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-sandstone-500">Std Dev:</span>
          <span className="font-mono">{(data.std / 1e6).toFixed(2)} MMstb</span>
        </div>
      </div>
    </div>
  );
}
