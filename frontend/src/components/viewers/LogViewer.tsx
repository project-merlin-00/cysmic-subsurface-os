import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface LogPoint {
  depth: number;
  value: number;
}

interface LogCurve {
  name: string;
  data: LogPoint[];
  unit?: string;
  color: string;
  min?: number;
  max?: number;
  curveType: 'linear' | 'inverse' | 'special';  // NPHI is inverse (low value = high fill)
}

interface LogViewerProps {
  curves: LogCurve[];
  depthRange?: [number, number];
  width?: number;
  height?: number;
  showGrid?: boolean;
}

// Color scheme from UI skill
const CURVE_COLORS = {
  GR: '#2d6a4f',   // Green
  RES: '#d97706',  // Amber
  RHOB: '#dc2626', // Red
  NPHI: '#2563eb', // Blue (for crossplot)
  DT: '#7c3aed',   // Purple
  SP: '#059669',   // Emerald
};

export function LogViewer({
  curves,
  depthRange,
  width = 800,
  height = 600,
  showGrid = true
}: LogViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [hoveredDepth, setHoveredDepth] = useState<number | null>(null);
  const [hoveredValues, setHoveredValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parentWidth = svgRef.current.parentElement.clientWidth;
        setDimensions({
          width: parentWidth,
          height: Math.min(600, parentWidth * 0.75)
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || curves.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const trackWidth = 80;
    const depthScaleWidth = 50;
    const margin = { top: 20, right: 20, bottom: 20, left: depthScaleWidth };
    const totalTracks = curves.length + 1;  // +1 for depth track
    const trackAreaWidth = dimensions.width - margin.left - margin.right;
    const calculatedTrackWidth = Math.min(trackWidth, trackAreaWidth / totalTracks);

    // Determine depth range
    const allDepths = curves.flatMap(c => c.data.map(d => d.depth));
    const minDepth = depthRange ? depthRange[0] : Math.min(...allDepths);
    const maxDepth = depthRange ? depthRange[1] : Math.max(...allDepths);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Depth scale (on the left)
    const depthScale = d3.scaleLinear()
      .domain([minDepth, maxDepth])
      .range([0, dimensions.height - margin.top - margin.bottom]);

    // Depth axis
    const depthAxis = d3.axisLeft(depthScale)
      .ticks(10)
      .tickFormat(d => `${d}`);

    const depthAxisG = g.append('g')
      .attr('class', 'depth-axis')
      .call(depthAxis);

    depthAxisG.selectAll('text').attr('fill', '#706859').attr('font-size', '10px');
    depthAxisG.selectAll('line').attr('stroke', '#C7C0B0');
    depthAxisG.select('.domain').attr('stroke', '#C7C0B0');

    // Draw each curve track
    curves.forEach((curve, trackIndex) => {
      const xOffset = (trackIndex + 1) * calculatedTrackWidth;
      
      // Determine value range
      const values = curve.data.map(d => d.value);
      const vMin = curve.min ?? Math.min(...values.filter(v => !isNaN(v) && isFinite(v)));
      const vMax = curve.max ?? Math.max(...values.filter(v => !isNaN(v) && isFinite(v)));

      // Create scale - handle inverse curves like NPHI
      let xScale: d3.ScaleLinear<number, number>;
      if (curve.curveType === 'inverse') {
        xScale = d3.scaleLinear()
          .domain([vMax, vMin])  // Reversed for inverse
          .range([0, calculatedTrackWidth - 10]);
      } else {
        xScale = d3.scaleLinear()
          .domain([vMin, vMax])
          .range([0, calculatedTrackWidth - 10]);
      }

      const trackG = g.append('g')
        .attr('transform', `translate(${xOffset}, 0)`);

      // Track background
      trackG.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', calculatedTrackWidth)
        .attr('height', dimensions.height - margin.top - margin.bottom)
        .attr('fill', '#FAFAFA')
        .attr('stroke', '#E5E5E5');

      // Grid lines
      if (showGrid) {
        const xTicks = xScale.ticks(5);
        xTicks.forEach(tick => {
          trackG.append('line')
            .attr('x1', xScale(tick))
            .attr('x2', xScale(tick))
            .attr('y1', 0)
            .attr('y2', dimensions.height - margin.top - margin.bottom)
            .attr('stroke', '#E5E5E5')
            .attr('stroke-dasharray', '2,2');
        });
      }

      // Create line generator
      const line = d3.line<LogPoint>()
        .defined(d => !isNaN(d.value) && isFinite(d.value))
        .x(d => xScale(d.value))
        .y(d => depthScale(d.depth))
        .curve(d3.curveLinear);  // Linear for log data

      // Draw the curve
      const validData = curve.data.filter(d => !isNaN(d.value) && isFinite(d.value));
      
      // Fill area for certain curves (like GR)
      if (curve.name === 'GR') {
        const area = d3.area<LogPoint>()
          .defined(d => !isNaN(d.value) && isFinite(d.value))
          .x0(0)
          .x1(d => xScale(d.value))
          .y0(d => depthScale(d.depth) - 1)
          .y1(d => depthScale(d.depth) + 1);

        trackG.append('path')
          .datum(validData)
          .attr('fill', curve.color)
          .attr('fill-opacity', 0.3)
          .attr('d', area);
      }

      trackG.append('path')
        .datum(validData)
        .attr('fill', 'none')
        .attr('stroke', curve.color)
        .attr('stroke-width', 1)
        .attr('d', line);

      // Track label
      trackG.append('text')
        .attr('x', calculatedTrackWidth / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('fill', curve.color)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(curve.name);

      // Unit label
      if (curve.unit) {
        trackG.append('text')
          .attr('x', calculatedTrackWidth / 2)
          .attr('y', dimensions.height - margin.top - margin.bottom + 15)
          .attr('text-anchor', 'middle')
          .attr('fill', '#8C8370')
          .attr('font-size', '9px')
          .text(curve.unit);
      }

      // Store scales for hover interaction
      (trackG as any).curveScale = xScale;
      (trackG as any).curveData = curve;
    });

    // Hover crosshair
    if (hoveredDepth !== null && hoveredDepth >= minDepth && hoveredDepth <= maxDepth) {
      const yPos = depthScale(hoveredDepth);
      
      // Horizontal line at hover depth
      g.append('line')
        .attr('x1', 0)
        .attr('x2', dimensions.width - margin.left - margin.right)
        .attr('y1', yPos)
        .attr('y2', yPos)
        .attr('stroke', '#d44211')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,2');

      // Depth label
      g.append('rect')
        .attr('x', -depthScaleWidth + 5)
        .attr('y', yPos - 8)
        .attr('width', depthScaleWidth - 10)
        .attr('height', 16)
        .attr('fill', '#d44211')
        .attr('rx', 2);

      g.append('text')
        .attr('x', 5)
        .attr('y', yPos + 4)
        .attr('fill', 'white')
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(hoveredDepth.toFixed(1));
    }

  }, [curves, dimensions, hoveredDepth, depthRange, showGrid]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    
    const margin = { top: 20, right: 20, bottom: 20, left: 50 };
    const allDepths = curves.flatMap(c => c.data.map(d => d.depth));
    const minDepth = Math.min(...allDepths);
    const maxDepth = Math.max(...allDepths);
    
    const depthScale = d3.scaleLinear()
      .domain([minDepth, maxDepth])
      .range([0, dimensions.height - margin.top - margin.bottom]);

    const mouseY = e.clientY - svgRef.current.getBoundingClientRect().top - margin.top;
    const depth = depthScale.invert(mouseY);
    
    if (!isNaN(depth) && isFinite(depth)) {
      setHoveredDepth(depth);
      
      // Find values at this depth
      const values: Record<string, number> = {};
      curves.forEach(curve => {
        // Find closest point
        const closest = curve.data.reduce((prev, curr) => 
          Math.abs(curr.depth - depth) < Math.abs(prev.depth - depth) ? curr : prev
        );
        values[curve.name] = closest.value;
      });
      setHoveredValues(values);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDepth(null);
    setHoveredValues({});
  };

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-sandstone-50 border-b border-sandstone-200">
        <h3 className="font-semibold text-sandstone-900">Log Viewer</h3>
        <div className="flex gap-2">
          {curves.map((curve) => (
            <span 
              key={curve.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded"
              style={{ backgroundColor: `${curve.color}20`, color: curve.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: curve.color }} />
              {curve.name}
            </span>
          ))}
        </div>
      </div>
      
      <div className="relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />
        
        {/* Hover tooltip */}
        {hoveredDepth !== null && Object.keys(hoveredValues).length > 0 && (
          <div className="absolute top-2 right-2 bg-white border border-sandstone-200 rounded shadow-lg p-2 text-xs">
            <div className="font-mono text-sandstone-500 mb-1">
              Depth: {hoveredDepth.toFixed(1)} m
            </div>
            {Object.entries(hoveredValues).map(([name, value]) => (
              <div key={name} className="font-mono">
                <span style={{ color: curves.find(c => c.name === name)?.color }}>
                  {name}:
                </span>{' '}
                {value?.toFixed(2) ?? '--'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Demo data generator
export function generateDemoLogData(): LogCurve[] {
  const depths = Array.from({ length: 500 }, (_, i) => 2000 + i * 2); // 2000-3000m
  
  return [
    {
      name: 'GR',
      unit: 'gAPI',
      color: CURVE_COLORS.GR,
      curveType: 'linear',
      data: depths.map(d => ({
        depth: d,
        value: 30 + 40 * Math.sin(d / 100) + 10 * Math.random()
      }))
    },
    {
      name: 'RES',
      unit: 'ohm-m',
      color: CURVE_COLORS.RES,
      curveType: 'linear',
      data: depths.map(d => ({
        depth: d,
        value: 10 + 50 * Math.sin(d / 150) + 5 * Math.random()
      }))
    },
    {
      name: 'RHOB',
      unit: 'g/cm3',
      color: CURVE_COLORS.RHOB,
      curveType: 'linear',
      data: depths.map(d => ({
        depth: d,
        value: 2.3 + 0.4 * Math.sin(d / 80) + 0.05 * Math.random()
      }))
    },
    {
      name: 'NPHI',
      unit: 'v/v',
      color: CURVE_COLORS.NPHI,
      curveType: 'inverse',
      data: depths.map(d => ({
        depth: d,
        value: 0.25 + 0.15 * Math.sin(d / 80) + 0.02 * Math.random()
      }))
    }
  ];
}
