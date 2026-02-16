/**
 * CYSMIC Card System - Log Viewer Card
 * Multi-track log display with GR, RES, RHOB, NPHI curves
 * 
 * Design: Terracotta #d44211, Space Grotesk headings, IBM Plex Mono technical data
 * Log Curves: Green #2d6a4f (GR), Amber #d97706 (RES), Red #dc2626 (RHOB)
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { CardComponentProps, LogViewerData, LogCurve, LithologyZone } from '../types';

// Curve colors from design system
const CURVE_COLORS = {
  GR: '#2d6a4f',      // Green - Gamma Ray
  RES: '#d97706',     // Amber - Resistivity  
  RHOB: '#dc2626',   // Red - Density
  NPHI: '#4f46e5',   // Indigo - Neutron
  CALI: '#8b5cf6',   // Purple - Caliper
  SP: '#0891b2',     // Cyan - Spontaneous Potential
};

// Default track configurations
const DEFAULT_TRACKS = [
  { id: 'track1', name: 'Gamma Ray', width: 80, curves: ['GR'] },
  { id: 'track2', name: 'Resistivity', width: 80, curves: ['RES'], scale: 'log' },
  { id: 'track3', name: 'Density', width: 80, curves: ['RHOB'] },
  { id: 'track4', name: 'Neutron', width: 80, curves: ['NPHI'] },
];

// Generate sample log data
function generateSampleLogData(
  topDepth: number, 
  bottomDepth: number, 
  step: number = 0.5
): { depths: number[]; curves: Record<string, number[]> } {
  const depths: number[] = [];
  const curves: Record<string, number[]> = {
    GR: [],
    RES: [],
    RHOB: [],
    NPHI: [],
  };
  
  for (let d = topDepth; d <= bottomDepth; d += step) {
    depths.push(d);
    
    // Simulate log responses based on depth zones
    let gr, res, rhob, nphi;
    
    if (d < 2000) {
      // Shallow - shale
      gr = 80 + Math.random() * 20;
      res = 2 + Math.random() * 2;
      rhob = 2.4 + Math.random() * 0.2;
      nphi = 0.35 + Math.random() * 0.1;
    } else if (d < 2500) {
      // Transition zone
      gr = 60 + Math.random() * 30;
      res = 5 + Math.random() * 10;
      rhob = 2.3 + Math.random() * 0.3;
      nphi = 0.25 + Math.random() * 0.15;
    } else if (d < 3000) {
      // Sandstone - good reservoir
      gr = 20 + Math.random() * 15;
      res = 50 + Math.random() * 50;
      rhob = 2.1 + Math.random() * 0.15;
      nphi = 0.15 + Math.random() * 0.1;
    } else {
      // Deep - limestone
      gr = 15 + Math.random() * 10;
      res = 100 + Math.random() * 100;
      rhob = 2.65 + Math.random() * 0.1;
      nphi = 0.02 + Math.random() * 0.05;
    }
    
    curves.GR.push(gr);
    curves.RES.push(res);
    curves.RHOB.push(rhob);
    curves.NPHI.push(nphi);
  }
  
  return { depths, curves };
}

// Sample lithology zones
const DEFAULT_LITHOLOGY: LithologyZone[] = [
  { top: 1800, bottom: 2050, lithology: 'shale', description: 'Upper shale' },
  { top: 2050, bottom: 2500, lithology: 'sandstone', description: 'Main sand' },
  { top: 2500, bottom: 2700, lithology: 'shale', description: 'Shale interbed' },
  { top: 2700, bottom: 3200, lithology: 'limestone', description: 'Carbonate' },
];

export const LogViewerCard: React.FC<CardComponentProps> = ({ 
  card, 
  data, 
  onClose,
  onMinimize,
  onSpawn 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use provided data or generate sample
  const logData = useMemo(() => {
    if (!data || data.type !== 'logViewer') {
      // Generate sample data
      const { depths, curves } = generateSampleLogData(1500, 3500, 2);
      return {
        wellName: 'Sample Well A-1',
        topDepth: 1500,
        bottomDepth: 3500,
        depths,
        curves: [
          { id: 'GR', name: 'Gamma Ray', mnemonic: 'GR', unit: 'API', data: curves.GR, color: CURVE_COLORS.GR, trackId: 'track1' },
          { id: 'RES', name: 'Deep Resistivity', mnemonic: 'RD', unit: 'ohm-m', data: curves.RES, color: CURVE_COLORS.RES, trackId: 'track2' },
          { id: 'RHOB', name: 'Bulk Density', mnemonic: 'RHOB', unit: 'g/cc', data: curves.RHOB, color: CURVE_COLORS.RHOB, trackId: 'track3' },
          { id: 'NPHI', name: 'Neutron Porosity', mnemonic: 'NPHI', unit: 'v/v', data: curves.NPHI, color: CURVE_COLORS.NPHI, trackId: 'track4' },
        ],
        lithology: DEFAULT_LITHOLOGY,
      };
    }
    
    const d = data as LogViewerData;
    const { depths, curves } = generateSampleLogData(d.topDepth, d.bottomDepth, d.step || 2);
    
    return {
      wellName: d.wellName || 'Unknown Well',
      topDepth: d.topDepth,
      bottomDepth: d.bottomDepth,
      depths,
      curves: [
        { id: 'GR', name: 'Gamma Ray', mnemonic: 'GR', unit: 'API', data: curves.GR, color: CURVE_COLORS.GR, trackId: 'track1' },
        { id: 'RES', name: 'Deep Resistivity', mnemonic: 'RD', unit: 'ohm-m', data: curves.RES, color: CURVE_COLORS.RES, trackId: 'track2' },
        { id: 'RHOB', name: 'Bulk Density', mnemonic: 'RHOB', unit: 'g/cc', data: curves.RHOB, color: CURVE_COLORS.RHOB, trackId: 'track3' },
        { id: 'NPHI', name: 'Neutron Porosity', mnemonic: 'NPHI', unit: 'v/v', data: curves.NPHI, color: CURVE_COLORS.NPHI, trackId: 'track4' },
      ],
      lithology: d.lithology || DEFAULT_LITHOLOGY,
    };
  }, [data]);

  // Render log tracks on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { widths, totalWidth } = calculateTrackLayout(canvas.width);
    
    // Clear canvas
    ctx.fillStyle = '#f8f6f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw depth track (left)
    drawDepthTrack(ctx, logData.depths, logData.topDepth, logData.bottomDepth, 50, canvas.height);
    
    // Draw each log track
    let xOffset = 60;
    
    DEFAULT_TRACKS.forEach((track, index) => {
      const curve = logData.curves.find(c => c.trackId === track.id);
      if (curve) {
        const trackWidth = widths[index];
        drawLogTrack(ctx, curve, logData.depths, logData.topDepth, logData.bottomDepth, xOffset, trackWidth, canvas.height, track.scale as 'linear' | 'log');
        xOffset += trackWidth;
      }
    });
    
    // Draw lithology column
    drawLithologyColumn(ctx, logData.lithology, xOffset + 10, 80, canvas.height, logData.topDepth, logData.bottomDepth);
    
  }, [logData]);

  const calculateTrackLayout = (totalWidth: number) => {
    const trackCount = 4;
    const depthTrackWidth = 50;
    const lithologyWidth = 80;
    const availableWidth = totalWidth - depthTrackWidth - lithologyWidth - 40;
    const trackWidth = availableWidth / trackCount;
    const widths = Array(trackCount).fill(trackWidth);
    return { widths, totalWidth };
  };

  const drawDepthTrack = (
    ctx: CanvasRenderingContext2D,
    depths: number[],
    topDepth: number,
    bottomDepth: number,
    width: number,
    height: number
  ) => {
    const scale = height / (bottomDepth - topDepth);
    
    // Background
    ctx.fillStyle = '#EBE8E1';
    ctx.fillRect(0, 0, width, height);
    
    // Depth scale
    ctx.fillStyle = '#221510';
    ctx.font = '10px IBM Plex Mono';
    ctx.textAlign = 'right';
    
    for (let d = Math.ceil(topDepth / 100) * 100; d <= bottomDepth; d += 100) {
      const y = height - (d - topDepth) * scale;
      if (y < 0 || y > height) continue;
      
      // Tick mark
      ctx.strokeStyle = '#C7C0B0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width - 5, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Label
      ctx.fillText(d.toString(), width - 8, y + 3);
    }
    
    // Border
    ctx.strokeStyle = '#C7C0B0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  };

  const drawLogTrack = (
    ctx: CanvasRenderingContext2D,
    curve: LogCurve,
    depths: number[],
    topDepth: number,
    bottomDepth: number,
    x: number,
    width: number,
    height: number,
    scaleType: 'linear' | 'log' = 'linear'
  ) => {
    const scale = height / (bottomDepth - topDepth);
    
    // Track background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = '#DCD7CC';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid (depth)
    for (let d = Math.ceil(topDepth / 100) * 100; d <= bottomDepth; d += 100) {
      const y = height - (d - topDepth) * scale;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.stroke();
    }
    
    // Determine value range
    const values = curve.data;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1;
    
    let xScale: (v: number) => number;
    if (scaleType === 'log') {
      const logMin = Math.log10(Math.max(minVal, 0.1));
      const logMax = Math.log10(maxVal);
      const scaleWidth = width - 20;
      xScale = (v: number) => x + 10 + ((Math.log10(Math.max(v, 0.1)) - logMin) / (logMax - logMin)) * scaleWidth;
    } else {
      xScale = (v: number) => x + 10 + ((v - minVal - padding) / (maxVal - minVal + 2 * padding)) * (width - 20);
    }
    
    // Draw curve
    ctx.strokeStyle = curve.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    let started = false;
    depths.forEach((d, i) => {
      if (i >= values.length) return;
      const y = height - (d - topDepth) * scale;
      const xVal = xScale(values[i]);
      
      if (!started) {
        ctx.moveTo(xVal, y);
        started = true;
      } else {
        ctx.lineTo(xVal, y);
      }
    });
    
    ctx.stroke();
    
    // Fill under curve
    ctx.fillStyle = curve.color + '20';
    ctx.lineTo(xScale(values[values.length - 1]), height);
    ctx.lineTo(xScale(values[0]), height);
    ctx.closePath();
    ctx.fill();
    
    // Track border
    ctx.strokeStyle = '#C7C0B0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, 0, width, height);
    
    // Track label
    ctx.fillStyle = '#454037';
    ctx.font = '10px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText(curve.mnemonic, x + width / 2, 12);
    
    // Scale labels
    ctx.font = '8px IBM Plex Mono';
    ctx.fillStyle = '#706859';
    ctx.textAlign = 'left';
    ctx.fillText(maxVal.toFixed(1), x + 2, 20);
    ctx.textAlign = 'right';
    ctx.fillText(minVal.toFixed(1), x + width - 2, height - 2);
  };

  const drawLithologyColumn = (
    ctx: CanvasRenderingContext2D,
    lithology: LithologyZone[],
    x: number,
    width: number,
    height: number,
    topDepth: number,
    bottomDepth: number
  ) => {
    const scale = height / (bottomDepth - topDepth);
    
    // Background
    ctx.fillStyle = '#f8f6f6';
    ctx.fillRect(x, 0, width, height);
    
    // Draw lithology zones
    lithology.forEach((zone) => {
      const topY = height - (zone.top - topDepth) * scale;
      const bottomY = height - (zone.bottom - topDepth) * scale;
      const zoneHeight = bottomY - topY;
      
      // Different patterns for different lithologies
      const colors: Record<string, string> = {
        sandstone: '#f3e5ab',
        limestone: '#d4c4b0',
        shale: '#cfd8dc',
        dolomite: '#c9c0b5',
        coal: '#2d2d2d',
        anhydrite: '#e8e4dc',
      };
      
      ctx.fillStyle = colors[zone.lithology] || '#cccccc';
      ctx.fillRect(x, topY, width, zoneHeight);
      
      // Add pattern
      if (zone.lithology === 'sandstone') {
        ctx.strokeStyle = '#d4c59a';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 8) {
          ctx.beginPath();
          ctx.moveTo(x + i, topY);
          ctx.lineTo(x + i + 5, topY + zoneHeight);
          ctx.stroke();
        }
      } else if (zone.lithology === 'shale') {
        ctx.fillStyle = '#b0bec5';
        for (let i = 0; i < zoneHeight; i += 6) {
          for (let j = 0; j < width; j += 10) {
            ctx.fillRect(x + j, topY + i, 2, 3);
          }
        }
      }
    });
    
    // Border
    ctx.strokeStyle = '#C7C0B0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, 0, width, height);
    
    // Label
    ctx.fillStyle = '#454037';
    ctx.font = '10px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText('Lithology', x + width / 2, 12);
  };

  return (
    <div className="log-viewer-card w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-space text-sm font-semibold text-[#221510]">
            {logData.wellName}
          </span>
          <span className="text-xs text-[#706859] font-ibm">
            {logData.topDepth} - {logData.bottomDepth} ft
          </span>
        </div>
        
        {/* Track legend */}
        <div className="flex items-center gap-2">
          {logData.curves.slice(0, 4).map((curve) => (
            <div key={curve.id} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: curve.color }}
              />
              <span className="text-xs font-ibm text-[#706859]">{curve.mnemonic}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={750}
          height={500}
          className="w-full h-full"
        />
      </div>

      {/* Scale Bar */}
      <div className="px-4 py-2 border-t border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="text-xs text-[#706859] font-ibm">
          Depth Track: Linear
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#706859] font-ibm">
            GR: Gamma Ray (API)
          </span>
          <span className="text-xs text-[#706859] font-ibm">
            RES: Resistivity (ohm-m)
          </span>
        </div>
      </div>
    </div>
  );
};

export default LogViewerCard;
