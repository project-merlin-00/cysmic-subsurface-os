/**
 * CYSMIC Card System - Telemetry Card
 * Real-time gauge monitoring for well telemetry
 * 
 * Design: Terracotta #d44211, Space Grotesk headings, IBM Plex Mono technical data
 * Gauges: Circular with gradient, needle indicator
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CardComponentProps, TelemetryData, GaugeConfig, GaugeReading, GaugeAlert } from '../types';

// Default gauge configurations
const DEFAULT_GAUGES: GaugeConfig[] = [
  { id: 'bhp', name: 'BHP', type: 'pressure', unit: 'psi', min: 0, max: 5000, normalMin: 1500, normalMax: 3500, color: '#2d6a4f', criticalHigh: 4500 },
  { id: 'thp', name: 'THP', type: 'pressure', unit: 'psi', min: 0, max: 2000, normalMin: 500, normalMax: 1500, color: '#d97706', criticalHigh: 1800 },
  { id: 'rate', name: 'Rate', type: 'rate', unit: 'BOPD', min: 0, max: 5000, normalMin: 500, normalMax: 3000, color: '#d44211', criticalLow: 100 },
  { id: 'temp', name: 'Temp', type: 'temperature', unit: '°F', min: 50, max: 250, normalMin: 100, normalMax: 180, color: '#dc2626', criticalHigh: 220 },
];

// Generate random readings
function generateReadings(gauges: GaugeConfig[]): GaugeReading[] {
  return gauges.map((gauge) => {
    // Generate realistic values based on gauge type
    let value: number;
    
    switch (gauge.type) {
      case 'pressure':
        value = gauge.normalMin! + Math.random() * (gauge.normalMax! - gauge.normalMin!);
        break;
      case 'rate':
        value = gauge.normalMin! + Math.random() * (gauge.normalMax! - gauge.normalMin!);
        break;
      case 'temperature':
        value = gauge.normalMin! + Math.random() * (gauge.normalMax! - gauge.normalMin!);
        break;
      default:
        value = (gauge.min + gauge.max) / 2;
    }
    
    // Occasionally simulate anomalies
    if (Math.random() < 0.05) {
      value = gauge.criticalHigh! * (0.9 + Math.random() * 0.2);
    }
    
    return {
      gaugeId: gauge.id,
      value: Math.round(value * 10) / 10,
      timestamp: Date.now(),
      quality: 'good',
    };
  });
}

// Check for alerts
function checkAlerts(gauges: GaugeConfig[], readings: GaugeReading[]): GaugeAlert[] {
  const alerts: GaugeAlert[] = [];
  
  readings.forEach((reading) => {
    const gauge = gauges.find((g) => g.id === reading.gaugeId);
    if (!gauge) return;
    
    if (reading.value >= (gauge.criticalHigh ?? gauge.max)) {
      alerts.push({
        gaugeId: gauge.id,
        level: 'critical',
        message: `${gauge.name} critical high: ${reading.value.toFixed(1)} ${gauge.unit}`,
        timestamp: Date.now(),
      });
    } else if (reading.value <= (gauge.criticalLow ?? gauge.min)) {
      alerts.push({
        gaugeId: gauge.id,
        level: 'warning',
        message: `${gauge.name} low: ${reading.value.toFixed(1)} ${gauge.unit}`,
        timestamp: Date.now(),
      });
    } else if (reading.value < (gauge.normalMin ?? gauge.min) || reading.value > (gauge.normalMax ?? gauge.max)) {
      alerts.push({
        gaugeId: gauge.id,
        level: 'info',
        message: `${gauge.name} outside normal range`,
        timestamp: Date.now(),
      });
    }
  });
  
  return alerts;
}

// Circular Gauge Component
const CircularGauge: React.FC<{
  config: GaugeConfig;
  value: number;
  size?: number;
}> = ({ config, value, size = 120 }) => {
  const percentage = ((value - config.min) / (config.max - config.min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Determine color based on value
  let color = config.color;
  if (value >= (config.criticalHigh ?? config.max)) {
    color = '#dc2626'; // Red - critical
  } else if (value >= config.normalMax!) {
    color = '#d97706'; // Amber - high
  } else if (value <= config.normalMin!) {
    color = '#d97706'; // Amber - low
  } else {
    color = config.color;
  }
  
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedPercentage / 100) * (circumference * 0.75); // 270 degree arc
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-135">
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EBE8E1"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
        />
        
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
        />
        
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (tick / 100) * 270 - 135;
          const rad = (angle * Math.PI) / 180;
          const innerR = radius - strokeWidth - 5;
          const outerR = radius - strokeWidth - 10;
          
          return (
            <line
              key={tick}
              x1={size / 2 + innerR * Math.cos(rad)}
              y1={size / 2 + innerR * Math.sin(rad)}
              x2={size / 2 + outerR * Math.cos(rad)}
              y2={size / 2 + outerR * Math.sin(rad)}
              stroke="#C7C0B0"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      
      {/* Value display */}
      <div className="text-center -mt-8">
        <div 
          className="font-space text-xl font-bold"
          style={{ color }}
        >
          {value.toFixed(0)}
        </div>
        <div className="text-xs text-[#706859] font-ibm">
          {config.unit}
        </div>
      </div>
      
      {/* Label */}
      <div className="text-xs font-ibm text-[#454037] mt-1">
        {config.name}
      </div>
    </div>
  );
};

export const TelemetryCard: React.FC<CardComponentProps> = ({ 
  card, 
  data, 
  onClose,
  onMinimize,
  onSpawn 
}) => {
  const [readings, setReadings] = useState<GaugeReading[]>([]);
  const [alerts, setAlerts] = useState<GaugeAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const telemetryData = useMemo(() => {
    if (!data || data.type !== 'telemetry') {
      return {
        wellName: 'Well A-1',
        gauges: DEFAULT_GAUGES,
      };
    }
    
    return data as TelemetryData;
  }, [data]);
  
  // Initialize and update readings
  useEffect(() => {
    // Initial reading
    setReadings(generateReadings(telemetryData.gauges));
    
    // Update every 3 seconds
    const interval = setInterval(() => {
      const newReadings = generateReadings(telemetryData.gauges);
      setReadings(newReadings);
      setAlerts(checkAlerts(telemetryData.gauges, newReadings));
      setLastUpdate(new Date());
    }, 3000);
    
    return () => clearInterval(interval);
  }, [telemetryData.gauges]);
  
  // Get current reading for a gauge
  const getReading = (gaugeId: string): number => {
    const reading = readings.find((r) => r.gaugeId === gaugeId);
    return reading?.value ?? 0;
  };

  return (
    <div className="telemetry-card w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2d6a4f] animate-pulse" />
          <span className="font-space text-sm font-semibold text-[#221510]">
            {telemetryData.wellName || 'Well'} Live
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#706859] font-ibm">
            {lastUpdate.toLocaleTimeString()}
          </span>
          {/* Alert indicator */}
          {alerts.length > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded font-ibm ${
              alerts.some(a => a.level === 'critical') 
                ? 'bg-[#dc2626]/20 text-[#dc2626]'
                : 'bg-[#d97706]/20 text-[#d97706]'
            }`}>
              {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          )}
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="flex-1 p-3 min-h-0 overflow-auto">
        <div className="grid grid-cols-2 gap-4 justify-items-center">
          {telemetryData.gauges.map((gauge) => (
            <CircularGauge
              key={gauge.id}
              config={gauge}
              value={getReading(gauge.id)}
              size={100}
            />
          ))}
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="px-3 py-2 border-t border-[#C7C0B0] bg-[#fef2f2]">
          <div className="text-xs text-[#dc2626] font-ibm uppercase mb-1">Active Alerts</div>
          {alerts.slice(0, 2).map((alert, index) => (
            <div key={index} className="text-xs text-[#dc2626] font-ibm truncate">
              • {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Status Footer */}
      <div className="px-4 py-2 border-t border-[#C7C0B0] bg-[#EBE8E1] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
          <span className="text-xs text-[#706859] font-ibm">All systems nominal</span>
        </div>
        <span className="text-xs text-[#706859] font-ibm">3s refresh</span>
      </div>
    </div>
  );
};

export default TelemetryCard;
