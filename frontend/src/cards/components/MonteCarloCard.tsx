/**
 * CYSMIC Card System - Monte Carlo Card
 * Monte Carlo simulation with histogram and percentiles
 * 
 * Design: Terracotta #d44211, Space Grotesk headings, IBM Plex Mono technical data
 * Background: Sandstone scale (#f8f6f6 light)
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { CardComponentProps, MonteCarloData, MonteCarloVariable, MonteCarloStats } from '../types';

// Run Monte Carlo simulation
function runMonteCarloSimulation(
  variables: MonteCarloVariable[],
  iterations: number = 10000
): { results: number[]; stats: MonteCarloStats } {
  const results: number[] = [];
  
  // Generate random samples
  for (let i = 0; i < iterations; i++) {
    let result = 0;
    
    for (const variable of variables) {
      let value: number;
      
      switch (variable.distribution) {
        case 'normal':
          // Box-Muller transform for normal distribution
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          value = (variable.mean ?? 0) + (variable.stdDev ?? 1) * z;
          break;
          
        case 'lognormal':
          const lu1 = Math.random();
          const lu2 = Math.random();
          const lz = Math.sqrt(-2 * Math.log(lu1)) * Math.cos(2 * Math.PI * lu2);
          const mu = Math.log((variable.mean ?? 1) ** 2 / Math.sqrt((variable.stdDev ?? 1) ** 2 + (variable.mean ?? 1) ** 2));
          const sigma = Math.sqrt(Math.log(1 + ((variable.stdDev ?? 1) / (variable.mean ?? 1)) ** 2));
          value = Math.exp(mu + sigma * lz);
          break;
          
        case 'triangular':
          const tMin = variable.min ?? 0;
          const tMax = variable.max ?? 1;
          const tMode = variable.mode ?? ((tMin + tMax) / 2);
          const tU = Math.random();
          value = tU < (tMode - tMin) / (tMax - tMin)
            ? tMin + Math.sqrt(tU * (tMax - tMin) * (tMode - tMin))
            : tMax - Math.sqrt((1 - tU) * (tMax - tMin) * (tMax - tMode));
          break;
          
        case 'uniform':
        default:
          value = (variable.min ?? 0) + Math.random() * ((variable.max ?? 1) - (variable.min ?? 0));
          break;
      }
      
      // Add contribution (simplified - assumes simple sum for demo)
      result += value;
    }
    
    results.push(result);
  }
  
  // Sort for percentile calculations
  results.sort((a, b) => a - b);
  
  // Calculate statistics
  const n = results.length;
  const sum = results.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = results[Math.floor(n / 2)];
  
  const variance = results.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const stats: MonteCarloStats = {
    mean,
    median,
    stdDev,
    min: results[0],
    max: results[n - 1],
    p5: results[Math.floor(n * 0.05)],
    p50: results[Math.floor(n * 0.5)],
    p95: results[Math.floor(n * 0.95)],
  };
  
  return { results, stats };
}

// Default STOIIP variables
const DEFAULT_VARIABLES: MonteCarloVariable[] = [
  { id: 'area', name: 'Area', distribution: 'triangular', min: 800, max: 1200, mode: 1000, mean: 1000 },
  { id: 'netPay', name: 'Net Pay', distribution: 'triangular', min: 40, max: 80, mode: 60, mean: 60 },
  { id: 'porosity', name: 'Porosity', distribution: 'triangular', min: 0.15, max: 0.28, mode: 0.22, mean: 0.22 },
  { id: 'sw', name: 'Water Saturation', distribution: 'triangular', min: 0.18, max: 0.35, mode: 0.25, mean: 0.25 },
  { id: 'bo', name: 'Formation Volume Factor', distribution: 'normal', mean: 1.25, stdDev: 0.05 },
];

// Calculate STOIIP
function calculateSTOIIP(area: number, netPay: number, porosity: number, sw: number, bo: number): number {
  // STOIIP = 7758 * A * h * φ * (1-Sw) / Bo
  return (7758 * area * netPay * porosity * (1 - sw)) / bo;
}

export const MonteCarloCard: React.FC<CardComponentProps> = ({ 
  card, 
  data, 
  onClose,
  onMinimize,
  onSpawn 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simulationData, setSimulationData] = useState<{ results: number[]; stats: MonteCarloStats } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(5000);
  
  const mcData = useMemo(() => {
    if (!data || data.type !== 'monteCarlo') {
      return {
        variables: DEFAULT_VARIABLES,
        iterations: 5000,
        percentiles: [5, 50, 95],
      } as MonteCarloData;
    }
    return data as MonteCarloData;
  }, [data]);

  // Run simulation
  const runSimulation = () => {
    setIsRunning(true);
    
    setTimeout(() => {
      // Calculate STOIIP for each iteration
      const results: number[] = [];
      const variables = mcData.variables;
      
      for (let i = 0; i < iterations; i++) {
        const values: Record<string, number> = {};
        
        for (const variable of variables) {
          let value: number;
          switch (variable.distribution) {
            case 'normal':
              const u1 = Math.random();
              const u2 = Math.random();
              const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
              value = (variable.mean ?? 0) + (variable.stdDev ?? 1) * z;
              break;
            case 'lognormal':
              const lu1 = Math.random();
              const lu2 = Math.random();
              const lz = Math.sqrt(-2 * Math.log(lu1)) * Math.cos(2 * Math.PI * lu2);
              const mu = Math.log((variable.mean ?? 1) ** 2 / Math.sqrt((variable.stdDev ?? 1) ** 2 + (variable.mean ?? 1) ** 2));
              const sigma = Math.sqrt(Math.log(1 + ((variable.stdDev ?? 1) / (variable.mean ?? 1)) ** 2));
              value = Math.exp(mu + sigma * lz);
              break;
            case 'triangular':
              const tMin = variable.min ?? 0;
              const tMax = variable.max ?? 1;
              const tMode = variable.mode ?? ((tMin + tMax) / 2);
              const tU = Math.random();
              value = tU < (tMode - tMin) / (tMax - tMin)
                ? tMin + Math.sqrt(tU * (tMax - tMin) * (tMode - tMin))
                : tMax - Math.sqrt((1 - tU) * (tMax - tMin) * (tMax - tMode));
              break;
            case 'uniform':
            default:
              value = (variable.min ?? 0) + Math.random() * ((variable.max ?? 1) - (variable.min ?? 0));
              break;
          }
          values[variable.id] = value;
        }
        
        // Calculate STOIIP
        const stoiip = calculateSTOIIP(
          values.area || 1000,
          values.netPay || 50,
          values.porosity || 0.2,
          values.sw || 0.25,
          values.bo || 1.25
        );
        results.push(stoiip);
      }
      
      results.sort((a, b) => a - b);
      
      const n = results.length;
      const sum = results.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const median = results[Math.floor(n / 2)];
      const variance = results.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      
      const stats: MonteCarloStats = {
        mean,
        median,
        stdDev,
        min: results[0],
        max: results[n - 1],
        p5: results[Math.floor(n * 0.05)],
        p50: results[Math.floor(n * 0.5)],
        p95: results[Math.floor(n * 0.95)],
      };
      
      setSimulationData({ results, stats });
      setIsRunning(false);
    }, 100);
  };

  // Run on mount or data change
  useEffect(() => {
    if (!simulationData && !isRunning) {
      runSimulation();
    }
  }, []);

  // Draw histogram
  useEffect(() => {
    if (!canvasRef.current || !simulationData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { results, stats } = simulationData;
    
    // Clear
    ctx.fillStyle = '#f8f6f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Histogram parameters
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;
    
    // Number of bins
    const numBins = 40;
    const binWidth = (stats.max - stats.min) / numBins;
    const bins = new Array(numBins).fill(0);
    
    results.forEach((val) => {
      const binIndex = Math.min(Math.floor((val - stats.min) / binWidth), numBins - 1);
      bins[binIndex]++;
    });
    
    const maxBin = Math.max(...bins);
    
    const g = ctx;
    g.save();
    g.translate(margin.left, margin.top);
    
    // Draw grid
    ctx.strokeStyle = '#DCD7CC';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw bars
    const barWidth = width / numBins;
    bins.forEach((count, i) => {
      const barHeight = (count / maxBin) * height;
      const x = i * barWidth;
      const y = height - barHeight;
      
      // Color based on percentile
      const binStart = stats.min + i * binWidth;
      let color = '#d44211'; // Default terracotta
      
      if (binStart < stats.p5) {
        color = '#dc2626'; // Red - low
      } else if (binStart > stats.p95) {
        color = '#d97706'; // Amber - high
      } else if (binStart >= stats.p50 - (stats.p95 - stats.p5) / 4 && binStart <= stats.p50 + (stats.p95 - stats.p5) / 4) {
        color = '#2d6a4f'; // Green - median
      }
      
      ctx.fillStyle = color + '80';
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    });
    
    // Draw percentile lines
    const drawPercentileLine = (p: number, color: string, label: string) => {
      const x = ((p - stats.min) / (stats.max - stats.min)) * width;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = color;
      ctx.font = '10px IBM Plex Mono';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, -5);
    };
    
    drawPercentileLine(stats.p5, '#dc2626', 'P5');
    drawPercentileLine(stats.p50, '#2d6a4f', 'P50');
    drawPercentileLine(stats.p95, '#d97706', 'P95');
    
    // Axes
    ctx.strokeStyle = '#454037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    
    // X-axis labels
    ctx.fillStyle = '#706859';
    ctx.font = '9px IBM Plex Mono';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= 5; i++) {
      const x = (width / 5) * i;
      const val = stats.min + ((stats.max - stats.min) / 5) * i;
      ctx.fillText((val / 1000000).toFixed(2) + 'M', x, height + 15);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = height - (height / 5) * i;
      const count = Math.round((maxBin / 5) * i);
      ctx.fillText(count.toString(), -5, y + 3);
    }
    
    // Axis titles
    ctx.fillStyle = '#454037';
    ctx.font = '11px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText('STOIIP (MMSTB)', width / 2, height + 32);
    
    ctx.save();
    ctx.translate(-40, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();
    
    g.restore();
    
  }, [simulationData]);

  return (
    <div className="monte-carlo-card w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-space text-sm font-semibold text-[#221510]">
            STOIIP Monte Carlo
          </span>
          <span className="text-xs text-[#706859] font-ibm">
            {iterations} iterations
          </span>
        </div>
        
        <button
          onClick={runSimulation}
          disabled={isRunning}
          className={`px-3 py-1 text-xs font-ibm rounded transition-colors ${
            isRunning 
              ? 'bg-[#C7C0B0] text-[#706859]' 
              : 'bg-[#d44211] text-white hover:bg-[#b8390f]'
          }`}
        >
          {isRunning ? 'Running...' : 'Re-run'}
        </button>
      </div>

      {/* Histogram */}
      <div className="flex-1 p-2 min-h-0">
        <canvas
          ref={canvasRef}
          width={460}
          height={260}
          className="w-full h-full"
        />
      </div>

      {/* Statistics */}
      <div className="px-4 py-3 border-t border-[#C7C0B0] bg-[#EBE8E1]">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-[#706859] font-ibm uppercase">P5 (Low)</div>
            <div className="font-space text-base font-semibold text-[#dc2626]">
              {simulationData?.stats.p5 
                ? (simulationData.stats.p5 / 1000000).toFixed(2) + 'M'
                : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#706859] font-ibm uppercase">P50 (Median)</div>
            <div className="font-space text-lg font-bold text-[#2d6a4f]">
              {simulationData?.stats.p50 
                ? (simulationData.stats.p50 / 1000000).toFixed(2) + 'M'
                : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#706859] font-ibm uppercase">P95 (High)</div>
            <div className="font-space text-base font-semibold text-[#d97706]">
              {simulationData?.stats.p95 
                ? (simulationData.stats.p95 / 1000000).toFixed(2) + 'M'
                : '—'}
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-[#C7C0B0] flex justify-between text-xs">
          <span className="text-[#706859]">
            Mean: <strong className="text-[#221510]">
              {simulationData?.stats.mean 
                ? (simulationData.stats.mean / 1000000).toFixed(2) + 'M'
                : '—'}
            </strong>
          </span>
          <span className="text-[#706859]">
            Std Dev: <strong className="text-[#221510]">
              {simulationData?.stats.stdDev 
                ? (simulationData.stats.stdDev / 1000000).toFixed(2) + 'M'
                : '—'}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloCard;
