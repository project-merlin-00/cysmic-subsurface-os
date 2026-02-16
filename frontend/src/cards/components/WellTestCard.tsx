/**
 * CYSMIC Card System - Well Test Card
 * Log-log diagnostic plot for pressure transient analysis
 * 
 * Design: Terracotta #d44211, Space Grotesk headings, IBM Plex Mono technical data
 * Curves: Green #2d6a4f (pressure), Amber #d97706 (derivative)
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { CardComponentProps, WellTestData, WellTestPoint } from '../types';

// Generate sample well test data
function generateWellTestData(
  testType: string = 'drawdown'
): { timeData: WellTestPoint[]; derivativeData: WellTestPoint[] } {
  const timeData: WellTestPoint[] = [];
  const derivativeData: WellTestPoint[] = [];
  
  // Generate points on log scale
  const times = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  
  times.forEach((t, i) => {
    // Simulated pressure drop
    const basePressure = 5000;
    const skin = 2;
    
    // Early time - wellbore storage
    let dp: number;
    if (t < 0.1) {
      dp = 50 * Math.pow(t, 0.5);
    } else if (t < 10) {
      // Middle time - radial flow
      dp = 100 + 30 * Math.log(t);
    } else {
      // Late time - boundary effects
      dp = 180 + 10 * t / (t + 50);
    }
    
    timeData.push({ time: t, pressure: dp });
    
    // Calculate derivative (numerical)
    if (i > 0 && i < timeData.length - 1) {
      const dt = Math.log(timeData[i + 1].time) - Math.log(timeData[i - 1].time);
      const dp_derivative = (timeData[i + 1].pressure - timeData[i - 1].pressure);
      const derivative = dp_derivative / dt;
      derivativeData.push({ time: t, pressure: Math.max(0.01, derivative) });
    }
  });
  
  return { timeData, derivativeData };
}

export const WellTestCard: React.FC<CardComponentProps> = ({ 
  card, 
  data, 
  onClose,
  onMinimize,
  onSpawn 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const testData = useMemo(() => {
    if (!data || data.type !== 'wellTest') {
      return {
        wellName: 'Well A-1',
        testType: 'drawdown',
        ...generateWellTestData('drawdown'),
      };
    }
    
    const d = data as WellTestData;
    if (d.timeData && d.timeData.length > 0) {
      return d;
    }
    
    return {
      wellName: d.wellName || 'Well',
      testType: d.testType || 'drawdown',
      ...generateWellTestData(d.testType),
    };
  }, [data]);

  // Render diagnostic plot
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#f8f6f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;
    
    ctx.save();
    ctx.translate(margin.left, margin.top);
    
    // Find data ranges (log scale)
    const times = testData.timeData.map(p => p.time);
    const pressures = testData.timeData.map(p => p.pressure);
    const derivatives = testData.derivativeData.map(p => p.pressure);
    
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const pMin = 0.01;
    const pMax = Math.max(...pressures, ...derivatives) * 1.5;
    
    // Log scale functions
    const xScale = (t: number) => {
      const logTMin = Math.log10(tMin);
      const logTMax = Math.log10(tMax);
      return ((Math.log10(t) - logTMin) / (logTMax - logTMin)) * width;
    };
    
    const yScale = (p: number) => {
      const logPMin = Math.log10(pMin);
      const logPMax = Math.log10(pMax);
      return height - ((Math.log10(p) - logPMin) / (logPMax - logPMin)) * height;
    };
    
    // Grid
    ctx.strokeStyle = '#DCD7CC';
    ctx.lineWidth = 0.5;
    
    // Log cycles for x-axis
    const xCycles = Math.ceil(Math.log10(tMax) - Math.log10(tMin));
    for (let i = 0; i <= xCycles; i++) {
      const logT = Math.log10(tMin) + i;
      const x = xScale(Math.pow(10, logT));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Log cycles for y-axis
    const yCycles = Math.ceil(Math.log10(pMax) - Math.log10(pMin));
    for (let i = 0; i <= yCycles; i++) {
      const logP = Math.log10(pMin) + i;
      const y = yScale(Math.pow(10, logP));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw derivative first (behind pressure)
    if (testData.derivativeData.length > 0) {
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      testData.derivativeData.forEach((p, i) => {
        const x = xScale(p.time);
        const y = yScale(p.pressure);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
    
    // Draw pressure data
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    testData.timeData.forEach((p, i) => {
      const x = xScale(p.time);
      const y = yScale(p.pressure);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#2d6a4f';
    testData.timeData.forEach((p) => {
      const x = xScale(p.time);
      const y = yScale(p.pressure);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Derivative points
    ctx.fillStyle = '#d97706';
    testData.derivativeData.forEach((p) => {
      const x = xScale(p.time);
      const y = yScale(p.pressure);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Axes
    ctx.strokeStyle = '#454037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    
    // X-axis tick labels
    ctx.fillStyle = '#706859';
    ctx.font = '9px IBM Plex Mono';
    ctx.textAlign = 'center';
    
    const xTicks = [0.001, 0.01, 0.1, 1, 10, 100];
    xTicks.forEach(t => {
      if (t >= tMin && t <= tMax) {
        const x = xScale(t);
        ctx.fillText(t.toString(), x, height + 15);
      }
    });
    
    // Y-axis tick labels
    ctx.textAlign = 'right';
    const yTicks = [0.01, 0.1, 1, 10, 100, 1000];
    yTicks.forEach(p => {
      if (p >= pMin && p <= pMax) {
        const y = yScale(p);
        ctx.fillText(p.toString(), -5, y + 3);
      }
    });
    
    // Axis titles
    ctx.fillStyle = '#454037';
    ctx.font = '11px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText('Δt (hours)', width / 2, height + 35);
    
    ctx.save();
    ctx.translate(-50, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Δp (psi)', 0, 0);
    ctx.restore();
    
    // Flow regime annotations
    ctx.fillStyle = '#d44211';
    ctx.font = '9px IBM Plex Mono';
    ctx.textAlign = 'left';
    
    // Wellbore storage
    ctx.fillText('Wellbore Storage', xScale(0.005), yScale(50) - 10);
    // Radial flow
    ctx.fillText('Radial Flow', xScale(1), yScale(150) - 10);
    // Boundary
    ctx.fillText('Boundary', xScale(30), yScale(200) - 10);
    
    ctx.restore();
    
  }, [testData]);

  // Analysis results (simulated)
  const analysis = useMemo(() => {
    return {
      permeability: 45,
      skin: 2.5,
      reservoirPressure: 3250,
      flowRegime: 'Radial Flow',
    };
  }, []);

  return (
    <div className="well-test-card w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-space text-sm font-semibold text-[#221510]">
            {testData.wellName || 'Well Test'}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded font-ibm ${
            testData.testType === 'drawdown' 
              ? 'bg-[#2d6a4f]/20 text-[#2d6a4f]' 
              : 'bg-[#d97706]/20 text-[#d97706]'
          }`}>
            {testData.testType === 'drawdown' ? 'Drawdown' : 'Buildup'}
          </span>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#2d6a4f]" />
            <span className="text-xs font-ibm text-[#706859]">Pressure</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#d97706]" />
            <span className="text-xs font-ibm text-[#706859]">Derivative</span>
          </div>
        </div>
      </div>

      {/* Diagnostic Plot */}
      <div className="flex-1 p-2 min-h-0">
        <canvas
          ref={canvasRef}
          width={480}
          height={280}
          className="w-full h-full"
        />
      </div>

      {/* Analysis Results */}
      <div className="px-4 py-3 border-t border-[#C7C0B0] bg-[#EBE8E1]">
        <div className="text-xs text-[#706859] font-ibm uppercase mb-2">Analysis Results</div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-[#706859] font-ibm">Permeability</div>
            <div className="font-space text-base font-semibold text-[#221510]">
              {analysis.permeability} <span className="text-xs font-normal">mD</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm">Skin</div>
            <div className="font-space text-base font-semibold text-[#221510]">
              {analysis.skin}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm">Res. Pressure</div>
            <div className="font-space text-base font-semibold text-[#221510]">
              {analysis.reservoirPressure} <span className="text-xs font-normal">psia</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm">Flow Regime</div>
            <div className="font-space text-base font-semibold text-[#d44211]">
              {analysis.flowRegime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellTestCard;
