import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface MaterialBalanceData {
  drive_mechanism: string;
  original_oil_in_place?: number;
  original_gas_in_place?: number;
  energy_index?: number;
  drive_indicators?: Record<string, number>;
  p_over_z_data?: {
    pressure: number;
    z_factor: number;
    p_over_z: number;
    cumulative_gas: number;
  }[];
}

interface MaterialBalanceChartProps {
  data: MaterialBalanceData;
  type: 'p/z' | 'campbell';
  width?: number;
  height?: number;
}

export function MaterialBalanceChart({ data, type, width = 600, height = 400 }: MaterialBalanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parentWidth = svgRef.current.parentElement.clientWidth;
        setDimensions({ width: parentWidth, height: Math.min(350, parentWidth * 0.5) });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (type === 'p/z' && data.p_over_z_data && data.p_over_z_data.length > 0) {
      // P/Z plot
      const pzData = data.p_over_z_data;
      const Gp = pzData.map(d => d.cumulative_gas);
      const pz = pzData.map(d => d.p_over_z);

      const xScale = d3.scaleLinear()
        .domain([0, d3.max(Gp)! * 1.1])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(pz)! * 1.1])
        .range([innerHeight, 0]);

      // Grid
      g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
        .selectAll('line')
        .attr('stroke', '#DCD7CC')
        .attr('stroke-dasharray', '2,2');

      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
        .selectAll('line')
        .attr('stroke', '#DCD7CC')
        .attr('stroke-dasharray', '2,2');

      // Fit line using linear regression
      const x = Gp;
      const y = pz;
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
      const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Draw fitted line
      const xMax = d3.max(Gp)!;
      g.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(xMax))
        .attr('y1', yScale(intercept))
        .attr('y2', yScale(slope * xMax + intercept))
        .attr('stroke', '#d44211')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4');

      // Data points
      g.selectAll('.point')
        .data(pzData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.cumulative_gas))
        .attr('cy', d => yScale(d.p_over_z))
        .attr('r', 5)
        .attr('fill', '#d44211')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      // Calculate OGIP from trend
      const ogip = -intercept / slope;
      if (ogip > 0) {
        // Draw OGIP marker
        g.append('line')
          .attr('x1', xScale(ogip))
          .attr('x2', xScale(ogip))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#dc2626')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2');

        g.append('text')
          .attr('x', xScale(ogip))
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#dc2626')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .text(`OGIP: ${(ogip / 1e9).toFixed(2)} Bscf`);
      }

      // Axes
      const xAxis = g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${Number(d) / 1e6}M`));

      xAxis.selectAll('text').attr('fill', '#706859');
      xAxis.selectAll('line').attr('stroke', '#C7C0B0');
      xAxis.select('.domain').attr('stroke', '#C7C0B0');

      const yAxis = g.append('g')
        .call(d3.axisLeft(yScale).ticks(5));

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
        .text('Cumulative Gas Production (Mscf)');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .attr('fill', '#706859')
        .attr('font-size', '12px')
        .text('p/z (psia)');

    } else {
      // Empty state
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8C8370')
        .text('No p/z data available');
    }

  }, [data, type, dimensions]);

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sandstone-900">
          {type === 'p/z' ? 'p/z Plot - Gas Depletion' : 'Campbell Plot'}
        </h3>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
          Material Balance
        </span>
      </div>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="overflow-visible" />
    </div>
  );
}

// Drive mechanism display
export function DriveMechanismPanel({ data }: { data: MaterialBalanceData }) {
  const driveColors: Record<string, string> = {
    solution_gas: 'bg-amber-100 border-amber-300 text-amber-800',
    gas_cap: 'bg-blue-100 border-blue-300 text-blue-800',
    water_drive: 'bg-cyan-100 border-cyan-300 text-cyan-800',
    combination: 'bg-purple-100 border-purple-300 text-purple-800'
  };

  const driveLabels: Record<string, string> = {
    solution_gas: 'Solution Gas Drive',
    gas_cap: 'Gas Cap Drive',
    water_drive: 'Water Drive',
    combination: 'Combination Drive'
  };

  const driveDescriptions: Record<string, string> = {
    solution_gas: 'Energy from expanding solution gas as pressure drops. Recovery: 5-25%',
    gas_cap: 'Energy from expanding gas cap. Higher oil recovery than solution gas.',
    water_drive: 'Strong aquifer support maintains pressure. Highest recovery: 30-60%.',
    combination: 'Multiple mechanisms working together. Good recovery potential.'
  };

  const colorClass = driveColors[data.drive_mechanism] || 'bg-gray-100 border-gray-300';
  const label = driveLabels[data.drive_mechanism] || data.drive_mechanism;
  const description = driveDescriptions[data.drive_mechanism] || '';

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold">{label}</span>
        <span className="text-xs px-2 py-0.5 bg-white/50 rounded">Energy Index: {(data.energy_index || 0).toFixed(2)}</span>
      </div>
      <p className="text-sm">{description}</p>
      
      {data.drive_indicators && (
        <div className="mt-3 pt-3 border-t border-black/10 grid grid-cols-2 gap-2 text-sm">
          <div>Pressure Decline: {data.drive_indicators.pressure_decline_rate?.toFixed(2) || '--'} psi/time</div>
          <div>GOR Trend: {data.drive_indicators.gor_trend?.toFixed(2) || '--'}</div>
          <div>Pressure Retained: {((data.drive_indicators.pressure_retained || 0) * 100).toFixed(1)}%</div>
          <div>Final GOR: {data.drive_indicators.final_gor?.toFixed(0) || '--'} scf/stb</div>
        </div>
      )}
    </div>
  );
}

// Reserves summary
export function ReservesSummary({ data }: { data: MaterialBalanceData }) {
  const ooip = data.original_oil_in_place;
  const ogip = data.original_gas_in_place;

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel p-4">
      <h3 className="font-semibold text-sandstone-900 mb-4">Original In-Place</h3>
      
      {ooip && (
        <div className="mb-3">
          <div className="text-xs text-sandstone-500 uppercase">Original Oil in Place</div>
          <div className="text-xl font-bold font-mono text-sandstone-900">
            {(ooip / 1e6).toFixed(2)} MMstb
          </div>
        </div>
      )}
      
      {ogip && (
        <div>
          <div className="text-xs text-sandstone-500 uppercase">Original Gas in Place</div>
          <div className="text-xl font-bold font-mono text-sandstone-900">
            {(ogip / 1e9).toFixed(2)} Bscf
          </div>
        </div>
      )}

      {!ooip && !ogip && (
        <div className="text-sm text-sandstone-500 italic">
          Insufficient data for OOIP/OGIP calculation
        </div>
      )}
    </div>
  );
}
