/**
 * CYSMIC Card System - Volumetrics Card
 * STOIIP/Gas Initially In Place visualization with uncertainty
 * 
 * Design: Terracotta #d44211, Space Grotesk headings, IBM Plex Mono technical data
 * Visual: Treemap/sunburst for volumetric components
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { CardComponentProps, VolumetricsData, VolumetricsResult } from '../types';

// Calculate deterministic STOIIP
function calculateSTOIIP(
  area: number,
  netPay: number,
  porosity: number,
  waterSaturation: number,
  formationVolumeFactor: number
): number {
  // STOIIP = 7758 * A * h * φ * (1-Sw) / Bo
  return (7758 * area * netPay * porosity * (1 - waterSaturation)) / formationVolumeFactor;
}

export const VolumetricsCard: React.FC<CardComponentProps> = ({ 
  card, 
  data, 
  onClose,
  onMinimize,
  onSpawn 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const volData = useMemo(() => {
    if (!data || data.type !== 'volumetrics') {
      // Default values
      const params = {
        area: 1000,        // acres
        netPay: 50,        // ft
        porosity: 0.22,    // fraction
        waterSaturation: 0.25, // fraction
        formationVolumeFactor: 1.25, // RB/STB
      };
      
      const result = calculateSTOIIP(
        params.area,
        params.netPay,
        params.porosity,
        params.waterSaturation,
        params.formationVolumeFactor
      );
      
      return {
        reservoirName: 'Reservoir A',
        parameters: params,
        result: {
          stoiip: result,
          recoveryFactor: 0.25,
          recoverable: result * 0.25,
        },
        simulation: undefined,
      };
    }
    
    return data as VolumetricsData;
  }, [data]);

  // Calculate on parameter change
  const calculatedResult = useMemo(() => {
    const p = volData.parameters;
    const stoiip = calculateSTOIIP(
      p.area,
      p.netPay,
      p.porosity,
      p.waterSaturation,
      p.formationVolumeFactor
    );
    
    return {
      stoiip,
      recoverable: stoiip * (volData.result?.recoveryFactor ?? 0.25),
    };
  }, [volData]);

  // Draw visualization
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#f8f6f6';
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const maxRadius = Math.min(width, height) / 2 - 40;
    
    // Draw concentric circles showing volumetric components
    const p = volData.parameters;
    
    // Base circle - Gross Rock Volume
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#EBE8E1';
    ctx.fill();
    ctx.strokeStyle = '#C7C0B0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Net Pay circle (area * netPay)
    const netPayFactor = (p.netPay / 100); // Normalized
    const netPayRadius = maxRadius * Math.sqrt(netPayFactor);
    ctx.beginPath();
    ctx.arc(centerX, centerY, netPayRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#DCD7CC';
    ctx.fill();
    ctx.strokeStyle = '#A9A08D';
    ctx.stroke();
    
    // Porosity circle
    const porosityFactor = p.porosity * 5; // Scale up for visibility
    const porosityRadius = netPayRadius * Math.sqrt(porosityFactor);
    ctx.beginPath();
    ctx.arc(centerX, centerY, porosityRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#d44211' + '40'; // Terracotta with opacity
    ctx.fill();
    ctx.strokeStyle = '#d44211';
    ctx.stroke();
    
    // HC Saturation (1-Sw) circle
    const hcSat = 1 - p.waterSaturation;
    const hcRadius = porosityRadius * Math.sqrt(hcSat);
    ctx.beginPath();
    ctx.arc(centerX, centerY, hcRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#2d6a4f' + '60'; // Green with opacity
    ctx.fill();
    ctx.strokeStyle = '#2d6a4f';
    ctx.stroke();
    
    // STOIIP (accounting for Bo)
    const boFactor = 1 / p.formationVolumeFactor;
    const stoiipRadius = hcRadius * Math.sqrt(boFactor);
    ctx.beginPath();
    ctx.arc(centerX, centerY, stoiipRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#d97706' + '80'; // Amber
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.stroke();
    
    // Draw arrows/labels for each factor
    const drawLabel = (radius: number, label: string, value: string, color: string) => {
      const angle = -Math.PI / 4;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      ctx.fillStyle = color;
      ctx.font = '11px Space Grotesk';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 8);
      
      ctx.fillStyle = '#221510';
      ctx.font = '10px IBM Plex Mono';
      ctx.fillText(value, x, y + 8);
    };
    
    drawLabel(maxRadius * 0.9, 'Gross Volume', `${p.area} ac`, '#706859');
    drawLabel(netPayRadius * 0.85, 'Net Pay', `${p.netPay} ft`, '#706859');
    drawLabel(porosityRadius * 0.85, 'Porosity', `${(p.porosity * 100).toFixed(0)}%`, '#d44211');
    drawLabel(hcRadius * 0.85, 'HC Saturation', `${((1 - p.waterSaturation) * 100).toFixed(0)}%`, '#2d6a4f');
    
  }, [volData]);

  return (
    <div className="volumetrics-card w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-space text-sm font-semibold text-[#221510]">
            {volData.reservoirName || 'Reservoir'} Volumetrics
          </span>
        </div>
        
        <div className="text-xs text-[#706859] font-ibm">
          STOIIP Calculation
        </div>
      </div>

      {/* Visualization */}
      <div className="flex-1 p-2 min-h-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={420}
          height={240}
          className="max-w-full"
        />
      </div>

      {/* Parameters & Results */}
      <div className="px-4 py-3 border-t border-[#C7C0B0] bg-[#EBE8E1]">
        {/* Input Parameters */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Area</div>
            <div className="font-space text-sm font-semibold text-[#221510]">
              {volData.parameters.area} <span className="text-xs font-normal">ac</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Net Pay</div>
            <div className="font-space text-sm font-semibold text-[#221510]">
              {volData.parameters.netPay} <span className="text-xs font-normal">ft</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Porosity</div>
            <div className="font-space text-sm font-semibold text-[#d44211]">
              {(volData.parameters.porosity * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Sw</div>
            <div className="font-space text-sm font-semibold text-[#221510]">
              {(volData.parameters.waterSaturation * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Bo</div>
            <div className="font-space text-sm font-semibold text-[#221510]">
              {volData.parameters.formationVolumeFactor.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Results */}
        <div className="pt-2 border-t border-[#C7C0B0] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#706859] font-ibm uppercase">Original Oil In Place</div>
            <div className="font-space text-xl font-bold text-[#d44211]">
              {(calculatedResult.stoiip / 1000000).toFixed(2)}
              <span className="text-sm font-normal text-[#706859] ml-1">MMSTB</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-[#706859] font-ibm uppercase">Recoverable (25%)</div>
            <div className="font-space text-lg font-bold text-[#2d6a4f]">
              {(calculatedResult.recoverable / 1000000).toFixed(2)}
              <span className="text-sm font-normal text-[#706859] ml-1">MMSTB</span>
            </div>
          </div>
        </div>
        
        {/* Formula */}
        <div className="mt-2 text-xs text-[#706859] font-ibm text-center">
          STOIIP = 7758 × A × h × φ × (1-Sw) / Bo
        </div>
      </div>
    </div>
  );
};

export default VolumetricsCard;
