import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface WellTestData {
  time: number[];
  pressure: number[];
  derivative?: number[];
  diagnosis?: {
    identified_regimes: { regime: string; description: string }[];
    diagnostics: Record<string, number | null>;
  };
}

interface WellTestChartProps {
  data: WellTestData;
  typeCurve?: {
    time: number[];
    pressure: number[];
    derivative: number[];
  };
  width?: number;
  height?: number;
}

export function WellTestChart({ data, typeCurve, width = 600, height = 400 }: WellTestChartProps) {
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
    if (!svgRef.current || data.time.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 80, bottom: 50, left: 70 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Log-log scales
    const xExtent = d3.extent(data.time) as [number, number];
    const yExtent = d3.extent(data.pressure) as [number, number];
    
    const xScale = d3.scaleLog()
      .domain([Math.max(0.1, xExtent[0]), xExtent[1] * 1.5])
      .range([0, innerWidth]);

    const yScale = d3.scaleLog()
      .domain([yExtent[0] * 0.9, yExtent[1] * 1.1])
      .range([innerHeight, 0]);

    // Grid
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(xScale.ticks(10))
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#DCD7CC')
      .attr('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(10))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#DCD7CC')
      .attr('stroke-dasharray', '2,2');

    // Type curve (if provided)
    if (typeCurve) {
      const lineTypeCurve = d3.line<number>()
        .x(d => xScale(d))
        .y((_, i) => yScale(typeCurve.pressure[i]))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(typeCurve.time)
        .attr('fill', 'none')
        .attr('stroke', '#8C8370')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('d', lineTypeCurve);
    }

    // Pressure line
    const linePressure = d3.line<number>()
      .x(d => xScale(d))
      .y((_, i) => yScale(data.pressure[i]))
      .curve(d3.curveMonotoneX);

    // Gradient for pressure
    const area = d3.area<number>()
      .x(d => xScale(d))
      .y0(innerHeight)
      .y1((_, i) => yScale(data.pressure[i]))
      .curve(d3.curveMonotoneX);

    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'pressure-gradient')
      .attr('x1', '0%').attr('x2', '0%')
      .attr('y1', '0%').attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#d44211')
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#d44211')
      .attr('stop-opacity', 0.05);

    g.append('path')
      .datum(data.time)
      .attr('fill', 'url(#pressure-gradient)')
      .attr('d', area);

    g.append('path')
      .datum(data.time)
      .attr('fill', 'none')
      .attr('stroke', '#d44211')
      .attr('stroke-width', 2)
      .attr('d', linePressure);

    // Derivative (if provided)
    if (data.derivative) {
      const lineDerivative = d3.line<number>()
        .x(d => xScale(d))
        .y((_, i) => yScale(Math.abs(data.derivative![i]) + 1))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data.time)
        .attr('fill', 'none')
        .attr('stroke', '#2d6a4f')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2')
        .attr('d', lineDerivative);
    }

    // Axes
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}`));

    xAxis.selectAll('text').attr('fill', '#706859');
    xAxis.selectAll('line').attr('stroke', '#C7C0B0');
    xAxis.select('.domain').attr('stroke', '#C7C0B0');

    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}`));

    yAxis.selectAll('text').attr('fill', '#706859');
    yAxis.selectAll('line').attr('stroke', '#C7C0B0');
    yAxis.select('.domain').attr('stroke', '#C7C0B0');

    // Labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#706859')
      .attr('font-size', '12px')
      .text('Time (hours) - Log Scale');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#706859')
      .attr('font-size', '12px')
      .text('Pressure (psia) - Log Scale');

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth + 10}, 10)`);

    legend.append('line')
      .attr('x1', 0).attr('x2', 20)
      .attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#d44211')
      .attr('stroke-width', 2);
    legend.append('text')
      .attr('x', 25).attr('y', 4)
      .attr('fill', '#706859')
      .attr('font-size', '10px')
      .text('Pressure');

    if (data.derivative) {
      legend.append('line')
        .attr('x1', 0).attr('x2', 20)
        .attr('y1', 20).attr('y2', 20)
        .attr('stroke', '#2d6a4f')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2');
      legend.append('text')
        .attr('x', 25).attr('y', 24)
        .attr('fill', '#706859')
        .attr('font-size', '10px')
        .text('Derivative');
    }

  }, [data, typeCurve, dimensions]);

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sandstone-900">Pressure Transient Analysis</h3>
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
          Well Test
        </span>
      </div>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="overflow-visible" />
    </div>
  );
}

// Well test results panel
export function WellTestResults({ 
  results 
}: { 
  results: {
    permeability?: number;
    skin?: number;
    reservoir_pressure?: number;
    flow_capacity?: number;
    model?: string;
    diagnostics?: {
      identified_regimes: { regime: string; description: string }[];
    };
  }
}) {
  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <h3 className="font-semibold text-sandstone-900 mb-4">Well Test Results</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-sandstone-50 rounded-lg">
          <div className="text-xs text-sandstone-500 uppercase">Permeability</div>
          <div className="text-lg font-bold font-mono text-sandstone-900">
            {results.permeability?.toFixed(2) || '--'} md
          </div>
        </div>
        
        <div className="p-3 bg-sandstone-50 rounded-lg">
          <div className="text-xs text-sandstone-500 uppercase">Skin Factor</div>
          <div className="text-lg font-bold font-mono text-sandstone-900">
            {results.skin?.toFixed(2) || '--'}
          </div>
        </div>
        
        <div className="p-3 bg-sandstone-50 rounded-lg">
          <div className="text-xs text-sandstone-500 uppercase">Reservoir Pressure</div>
          <div className="text-lg font-bold font-mono text-sandstone-900">
            {results.reservoir_pressure?.toFixed(0) || '--'} psia
          </div>
        </div>
        
        <div className="p-3 bg-sandstone-50 rounded-lg">
          <div className="text-xs text-sandstone-500 uppercase">Flow Capacity</div>
          <div className="text-lg font-bold font-mono text-sandstone-900">
            {results.flow_capacity?.toFixed(0) || '--'} md·ft
          </div>
        </div>
      </div>
      
      {results.diagnostics?.identified_regimes && (
        <div className="mt-4">
          <div className="text-xs text-sandstone-500 uppercase mb-2">Identified Flow Regimes</div>
          {results.diagnostics.identified_regimes.map((regime, i) => (
            <div key={i} className="text-sm text-sandstone-700">
              • {regime.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Input panel for well test
interface WellTestInputPanelProps {
  parameters: {
    well_radius: number;
    porosity: number;
    thickness: number;
    viscosity: number;
    compressibility: number;
    rate: number;
  };
  onChange: (params: any) => void;
}

export function WellTestInputPanel({ parameters, onChange }: WellTestInputPanelProps) {
  const updateParam = (key: string, value: number) => {
    onChange({ ...parameters, [key]: value });
  };

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <h3 className="font-semibold text-sandstone-900 mb-4">Well Test Parameters</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Well Radius (ft)</label>
          <input
            type="number"
            step={0.01}
            value={parameters.well_radius}
            onChange={e => updateParam('well_radius', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Rate (stb/d)</label>
          <input
            type="number"
            value={parameters.rate}
            onChange={e => updateParam('rate', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Porosity</label>
          <input
            type="number"
            step={0.01}
            value={parameters.porosity}
            onChange={e => updateParam('porosity', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Thickness (ft)</label>
          <input
            type="number"
            value={parameters.thickness}
            onChange={e => updateParam('thickness', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Viscosity (cp)</label>
          <input
            type="number"
            step={0.1}
            value={parameters.viscosity}
            onChange={e => updateParam('viscosity', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-sandstone-500 uppercase mb-1">Compressibility (1/psi)</label>
          <input
            type="number"
            step={1e-6}
            value={parameters.compressibility}
            onChange={e => updateParam('compressibility', Number(e.target.value))}
            className="w-full px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
