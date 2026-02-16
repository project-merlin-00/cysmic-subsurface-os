/**
 * CYSMIC Card System - Decline Curve Card
 * Arps decline curve visualization with forecasting
 * 
 * Design: Terracotta #d44211, Space Grotesk headings, IBM Plex Mono technical data
 * Background: Sandstone scale (#f8f6f6 light, #221510 dark)
 * Curves: Green #2d6a4f, Amber #d97706, Red #dc2626
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { CardComponentProps, DeclineCurveData } from '../types';

// Arps decline equations
const declineFunctions = {
  exponential: (t: number, qi: number, Di: number) => qi * Math.exp(-Di * t),
  hyperbolic: (t: number, qi: number, Di: number, b: number) => 
    qi / Math.pow(1 + b * Di * t, 1 / b),
  harmonic: (t: number, qi: number, Di: number) => qi / (1 + Di * t),
};

// Generate decline curve data
function generateDeclineData(
  type: 'exponential' | 'hyperbolic' | 'harmonic',
  qi: number,
  Di: number,
  b: number,
  years: number = 10
): { time: number[]; rate: number[] } {
  const time: number[] = [];
  const rate: number[] = [];
  
  const months = years * 12;
  const func = declineFunctions[type];
  
  for (let t = 0; t <= months; t += 1) {
    time.push(t);
    const r = type === 'hyperbolic' 
      ? func(t, qi, Di, b) 
      : func(t, qi, Di);
    rate.push(Math.max(0, r));
  }
  
  return { time, rate };
}

// Calculate EUR
function calculateEUR(
  type: 'exponential' | 'hyperbolic' | 'harmonic',
  qi: number,
  Di: number,
  b: number,
  economicLimit: number
): number {
  if (type === 'exponential') {
    return qi / Di;
  } else if (type === 'hyperbolic') {
    // EUR = qi / ((1-b) * Di) when b < 1
    return qi / ((1 - b) * Di);
  } else {
    // Harmonic: integrate qi/(1+Di*t) from 0 to infinity
    return (qi / Di) * Math.log(1 + qi / economicLimit);
  }
}

export const DeclineCurveCard: React.FC<CardComponentProps> = ({ 
  card, 
  data, 
  onClose,
  onMinimize,
  onSpawn 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const declineData = useMemo(() => {
    if (!data || data.type !== 'declineCurve') return null;
    const d = data as DeclineCurveData;
    
    const { time, rate } = generateDeclineData(
      d.declineType,
      d.qi,
      d.Di,
      d.b,
      15
    );
    
    // Add forecast portion (dotted line)
    let forecastTime: number[] = [];
    let forecastRate: number[] = [];
    
    if (d.economicLimit) {
      const func = declineFunctions[d.declineType];
      for (let t = 0; t <= 120; t++) {
        const r = d.declineType === 'hyperbolic'
          ? func(t, d.qi, d.Di, d.b)
          : func(t, d.qi, d.Di);
        if (r >= d.economicLimit) {
          forecastTime.push(t);
          forecastRate.push(Math.max(0, r));
        }
      }
    }
    
    // Calculate EUR
    const eur = d.economicLimit 
      ? calculateEUR(d.declineType, d.qi, d.Di, d.b, d.economicLimit)
      : undefined;
    
    return { time, rate, forecastTime, forecastRate, eur };
  }, [data]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || !declineData) return;
    
    const svg = svgRef.current;
    const { time, rate, forecastTime, forecastRate } = declineData;
    
    // Clear previous content
    svg.innerHTML = '';
    
    // Dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = svg.clientWidth - margin.left - margin.right;
    const height = svg.clientHeight - margin.top - margin.bottom;
    
    if (width <= 0 || height <= 0) return;
    
    // Create group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);
    
    // Scales
    const xMax = Math.max(...time, ...forecastTime);
    const yMax = Math.max(...rate, ...forecastRate);
    
    const xScale = (t: number) => (t / xMax) * width;
    const yScale = (r: number) => height - (r / yMax) * height;
    
    // Grid lines
    const gridColor = '#DCD7CC';
    
    // Horizontal grid
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', String(y));
      line.setAttribute('x2', String(width));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', gridColor);
      line.setAttribute('stroke-width', '0.5');
      g.appendChild(line);
    }
    
    // Vertical grid
    for (let i = 0; i <= 5; i++) {
      const x = (width / 5) * i;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('y1', '0');
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(height));
      line.setAttribute('stroke', gridColor);
      line.setAttribute('stroke-width', '0.5');
      g.appendChild(line);
    }
    
    // Area fill
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let areaD = `M 0 ${height}`;
    rate.forEach((r, i) => {
      areaD += ` L ${xScale(time[i])} ${yScale(r)}`;
    });
    areaD += ` L ${xScale(time[time.length - 1])} ${height} Z`;
    area.setAttribute('d', areaD);
    area.setAttribute('fill', 'rgba(212, 65, 17, 0.1)');
    g.appendChild(area);
    
    // Historical line (solid)
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = `M ${xScale(time[0])} ${yScale(rate[0])}`;
    rate.slice(1).forEach((r, i) => {
      d += ` L ${xScale(time[i + 1])} ${yScale(r)}`;
    });
    linePath.setAttribute('d', d);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#d44211');
    linePath.setAttribute('stroke-width', '2');
    g.appendChild(linePath);
    
    // Forecast line (dashed)
    if (forecastTime.length > 0) {
      const forecastPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let fd = `M ${xScale(forecastTime[0])} ${yScale(forecastRate[0])}`;
      forecastRate.slice(1).forEach((r, i) => {
        fd += ` L ${xScale(forecastTime[i + 1])} ${yScale(r)}`;
      });
      forecastPath.setAttribute('d', fd);
      forecastPath.setAttribute('fill', 'none');
      forecastPath.setAttribute('stroke', '#d97706');
      forecastPath.setAttribute('stroke-width', '2');
      forecastPath.setAttribute('stroke-dasharray', '6,4');
      g.appendChild(forecastPath);
    }
    
    // Economic limit line
    const dData = data as DeclineCurveData;
    if (dData.economicLimit) {
      const limitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      limitLine.setAttribute('x1', '0');
      limitLine.setAttribute('y1', String(yScale(dData.economicLimit)));
      limitLine.setAttribute('x2', String(width));
      limitLine.setAttribute('y2', String(yScale(dData.economicLimit)));
      limitLine.setAttribute('stroke', '#dc2626');
      limitLine.setAttribute('stroke-width', '1');
      limitLine.setAttribute('stroke-dasharray', '4,4');
      g.appendChild(limitLine);
      
      const limitLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      limitLabel.setAttribute('x', String(width - 5));
      limitLabel.setAttribute('y', String(yScale(dData.economicLimit) - 5));
      limitLabel.setAttribute('text-anchor', 'end');
      limitLabel.setAttribute('fill', '#dc2626');
      limitLabel.setAttribute('font-size', '10');
      limitLabel.setAttribute('font-family', 'IBM Plex Mono');
      limitLabel.textContent = `Limit: ${dData.economicLimit}`;
      g.appendChild(limitLabel);
    }
    
    // Axes
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '0');
    xAxis.setAttribute('y1', String(height));
    xAxis.setAttribute('x2', String(width));
    xAxis.setAttribute('y2', String(height));
    xAxis.setAttribute('stroke', '#454037');
    xAxis.setAttribute('stroke-width', '1');
    g.appendChild(xAxis);
    
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '0');
    yAxis.setAttribute('y1', '0');
    yAxis.setAttribute('x2', '0');
    yAxis.setAttribute('y2', String(height));
    yAxis.setAttribute('stroke', '#454037');
    yAxis.setAttribute('stroke-width', '1');
    g.appendChild(yAxis);
    
    // X-axis labels
    for (let i = 0; i <= 5; i++) {
      const x = (width / 5) * i;
      const t = Math.round((xMax / 5) * i);
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(x));
      label.setAttribute('y', String(height + 20));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#706859');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'IBM Plex Mono');
      label.textContent = `${t} mo`;
      g.appendChild(label);
    }
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const y = height - (height / 5) * i;
      const r = Math.round((yMax / 5) * i);
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '-10');
      label.setAttribute('y', String(y + 4));
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', '#706859');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'IBM Plex Mono');
      label.textContent = r.toString();
      g.appendChild(label);
    }
    
    // Axis titles
    const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xTitle.setAttribute('x', String(width / 2));
    xTitle.setAttribute('y', String(height + 35));
    xTitle.setAttribute('text-anchor', 'middle');
    xTitle.setAttribute('fill', '#454037');
    xTitle.setAttribute('font-size', '11');
    xTitle.setAttribute('font-family', 'Space Grotesk');
    xTitle.textContent = 'Time (months)';
    g.appendChild(xTitle);
    
    const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yTitle.setAttribute('x', '-40');
    yTitle.setAttribute('y', String(height / 2));
    yTitle.setAttribute('text-anchor', 'middle');
    yTitle.setAttribute('fill', '#454037');
    yTitle.setAttribute('font-size', '11');
    yTitle.setAttribute('font-family', 'Space Grotesk');
    yTitle.setAttribute('transform', `rotate(-90, -40, ${height / 2})`);
    yTitle.textContent = 'Rate (BOPD)';
    g.appendChild(yTitle);
    
  }, [declineData, data]);

  const dData = (data as DeclineCurveData);

  return (
    <div className="decline-curve-card w-full h-full flex flex-col">
      {/* Card Header Info */}
      <div className="px-4 py-3 border-b border-[#C7C0B0] bg-[#EBE8E1]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#706859] font-ibm uppercase tracking-wide">
              {dData.wellName || 'Well'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 text-xs rounded font-ibm ${
              dData.declineType === 'hyperbolic' ? 'bg-[#d97706]/20 text-[#d97706]' :
              dData.declineType === 'exponential' ? 'bg-[#2d6a4f]/20 text-[#2d6a4f]' :
              'bg-[#d44211]/20 text-[#d44211]'
            }`}>
              {dData.declineType.charAt(0).toUpperCase() + dData.declineType.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-4 min-h-0">
        <svg 
          ref={svgRef} 
          className="w-full h-full"
          style={{ minHeight: '200px' }}
        />
      </div>

      {/* Stats Footer */}
      <div className="px-4 py-3 border-t border-[#C7C0B0] bg-[#EBE8E1]">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Initial Rate</div>
            <div className="font-space text-lg font-semibold text-[#221510]">
              {dData.qi?.toLocaleString() || '—'}
              <span className="text-xs font-normal text-[#706859] ml-1">BOPD</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Decline</div>
            <div className="font-space text-lg font-semibold text-[#221510]">
              {dData.Di ? (dData.Di * 100).toFixed(1) : '—'}%
              <span className="text-xs font-normal text-[#706859] ml-1">/mo</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">EUR</div>
            <div className="font-space text-lg font-semibold text-[#d44211]">
              {declineData?.eur ? Math.round(declineData.eur).toLocaleString() : '—'}
              <span className="text-xs font-normal text-[#706859] ml-1">STB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeclineCurveCard;
