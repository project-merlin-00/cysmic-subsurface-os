import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  time: number;
  rate: number;
  cumulative?: number;
}

interface DeclineCurveChartProps {
  data: DataPoint[];
  historicalData?: DataPoint[];
  model: 'hyperbolic' | 'exponential' | 'harmonic';
  parameters?: {
    qi: number;
    Di: number;
    b: number;
  };
  width?: number;
  height?: number;
}

export function DeclineCurveChart({
  data,
  historicalData,
  model,
  parameters,
  width = 600,
  height = 400
}: DeclineCurveChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parentWidth = svgRef.current.parentElement.clientWidth;
        setDimensions({
          width: parentWidth,
          height: Math.min(400, parentWidth * 0.6)
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 80, bottom: 40, left: 60 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.time) || 60])
      .range([0, innerWidth]);

    const yMax = d3.max(data, d => d.rate) || 100;
    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#DCD7CC')
      .attr('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#DCD7CC')
      .attr('stroke-dasharray', '2,2');

    // Remove domain lines from grid
    g.selectAll('.grid .domain').remove();

    // Historical data (if provided)
    if (historicalData && historicalData.length > 0) {
      const lineHistorical = d3.line<DataPoint>()
        .x(d => xScale(d.time))
        .y(d => yScale(d.rate))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(historicalData)
        .attr('fill', 'none')
        .attr('stroke', '#d44211')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('d', lineHistorical);

      // Historical points
      g.selectAll('.historical-point')
        .data(historicalData)
        .enter()
        .append('circle')
        .attr('class', 'historical-point')
        .attr('cx', d => xScale(d.time))
        .attr('cy', d => yScale(d.rate))
        .attr('r', 4)
        .attr('fill', '#d44211');
    }

    // Forecast line
    const line = d3.line<DataPoint>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Gradient fill under curve
    const area = d3.area<DataPoint>()
      .x(d => xScale(d.time))
      .y0(innerHeight)
      .y1(d => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#d44211')
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#d44211')
      .attr('stop-opacity', 0.05);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#d44211')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Axes
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d} mo`));

    xAxis.selectAll('text').attr('fill', '#706859');
    xAxis.selectAll('line').attr('stroke', '#C7C0B0');
    xAxis.select('.domain').attr('stroke', '#C7C0B0');

    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}`));

    yAxis.selectAll('text').attr('fill', '#706859');
    yAxis.selectAll('line').attr('stroke', '#C7C0B0');
    yAxis.select('.domain').attr('stroke', '#C7C0B0');

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#706859')
      .attr('font-size', '12px')
      .text('Time');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#706859')
      .attr('font-size', '12px')
      .text('Rate (bbl/d)');

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth + 10}, 10)`);

    if (historicalData && historicalData.length > 0) {
      legend.append('line')
        .attr('x1', 0).attr('x2', 20)
        .attr('y1', 0).attr('y2', 0)
        .attr('stroke', '#d44211')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4');
      
      legend.append('text')
        .attr('x', 25).attr('y', 4)
        .attr('fill', '#706859')
        .attr('font-size', '10px')
        .text('Historical');
    }

    legend.append('line')
      .attr('x1', 0).attr('x2', 20)
      .attr('y1', historicalData ? 20 : 0)
      .attr('y2', historicalData ? 20 : 0)
      .attr('stroke', '#d44211')
      .attr('stroke-width', 2);

    legend.append('text')
      .attr('x', 25)
      .attr('y', historicalData ? 24 : 4)
      .attr('fill', '#706859')
      .attr('font-size', '10px')
      .text('Forecast');

    // Model info
    if (parameters) {
      const modelLabel = model.charAt(0).toUpperCase() + model.slice(1);
      const info = `${modelLabel}\nqi=${parameters.qi.toFixed(0)}\nDi=${(parameters.Di * 100).toFixed(1)}%\nb=${parameters.b.toFixed(2)}`;
      
      g.append('text')
        .attr('x', innerWidth - 5)
        .attr('y', innerHeight - 10)
        .attr('text-anchor', 'end')
        .attr('fill', '#8C8370')
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(info.split('\n').join(', '));
    }

  }, [data, historicalData, dimensions, model, parameters]);

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sandstone-900">Decline Curve Analysis</h3>
        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
          {model.charAt(0).toUpperCase() + model.slice(1)}
        </span>
      </div>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      />
    </div>
  );
}

// Parameter adjustment panel for decline curves
interface DeclineParameterPanelProps {
  parameters: {
    qi: number;
    Di: number;
    b: number;
  };
  onChange: (params: { qi: number; Di: number; b: number }) => void;
  model: 'hyperbolic' | 'exponential' | 'harmonic';
  onModelChange: (model: 'hyperbolic' | 'exponential' | 'harmonic') => void;
}

export function DeclineParameterPanel({
  parameters,
  onChange,
  model,
  onModelChange
}: DeclineParameterPanelProps) {
  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <h3 className="font-semibold text-sandstone-900 mb-4">Parameters</h3>
      
      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-sandstone-500 uppercase tracking-wide mb-2">
          Decline Model
        </label>
        <div className="flex gap-2">
          {(['hyperbolic', 'exponential', 'harmonic'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModelChange(m)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                model === m
                  ? 'bg-primary-600 text-white'
                  : 'bg-sandstone-100 text-sandstone-600 hover:bg-sandstone-200'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Qi */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-sandstone-500 uppercase tracking-wide mb-2">
          Initial Rate (qi)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={parameters.qi}
            onChange={e => onChange({ ...parameters, qi: Number(e.target.value) })}
            className="flex-1 px-3 py-2 border border-sandstone-300 rounded font-mono text-sm"
            min={0}
          />
          <span className="text-sm text-sandstone-500">bbl/d</span>
        </div>
      </div>

      {/* Di */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-sandstone-500 uppercase tracking-wide mb-2">
          Decline Rate (Di)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.001}
            max={0.5}
            step={0.001}
            value={parameters.Di}
            onChange={e => onChange({ ...parameters, Di: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm font-mono text-sandstone-700 w-16 text-right">
            {(parameters.Di * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* b factor - only for hyperbolic */}
      {model === 'hyperbolic' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-sandstone-500 uppercase tracking-wide mb-2">
            Decline Exponent (b)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={parameters.b}
              onChange={e => onChange({ ...parameters, b: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-mono text-sandstone-700 w-16 text-right">
              {parameters.b.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Equation display */}
      <div className="mt-4 p-3 bg-sandstone-50 rounded font-mono text-xs text-sandstone-600">
        {model === 'hyperbolic' && 'q = qi / (1 + b·Di·t)^(1/b)'}
        {model === 'exponential' && 'q = qi · e^(-Di·t)'}
        {model === 'harmonic' && 'q = qi / (1 + Di·t)'}
      </div>
    </div>
  );
}
