import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface TelemetryPoint {
  timestamp: Date;
  value: number;
  unit: string;
}

interface TelemetryChannel {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  min: number;
  max: number;
  color: string;
  history: TelemetryPoint[];
}

interface TelemetryStripProps {
  wells?: string[];
  refreshInterval?: number; // milliseconds
}

const DEMO_CHANNELS: TelemetryChannel[] = [
  {
    name: 'BHP',
    value: 2450,
    unit: 'psi',
    trend: 'stable',
    min: 0,
    max: 5000,
    color: '#d44211',
    history: []
  },
  {
    name: 'WHP',
    value: 890,
    unit: 'psi',
    trend: 'up',
    min: 0,
    max: 2000,
    color: '#2d6a4f',
    history: []
  },
  {
    name: 'Flow Rate',
    value: 1250,
    unit: 'bbl/d',
    trend: 'down',
    min: 0,
    max: 3000,
    color: '#d97706',
    history: []
  },
  {
    name: 'Temperature',
    value: 156,
    unit: '°F',
    trend: 'stable',
    min: 50,
    max: 250,
    color: '#2563eb',
    history: []
  },
  {
    name: 'Choke',
    value: 48,
    unit: '%',
    trend: 'stable',
    min: 0,
    max: 100,
    color: '#7c3aed',
    history: []
  }
];

// Generate realistic variations
function generateValue(current: number, min: number, max: number): number {
  const range = max - min;
  const volatility = 0.02; // 2% volatility
  const change = (Math.random() - 0.5) * range * volatility;
  return Math.max(min, Math.min(max, current + change));
}

export function TelemetryStrip({ 
  wells = ['Well-A', 'Well-B'], 
  refreshInterval = 5000 
}: TelemetryStripProps) {
  const [channels, setChannels] = useState<TelemetryChannel[]>(() => 
    DEMO_CHANNELS.map(ch => ({
      ...ch,
      history: Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - (19 - i) * refreshInterval),
        value: ch.value + (Math.random() - 0.5) * (ch.max - ch.min) * 0.1,
        unit: ch.unit
      }))
    }))
  );
  const [selectedWell, setSelectedWell] = useState(wells[0]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isConnected] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setChannels(prev => prev.map(channel => {
        const newValue = generateValue(channel.value, channel.min, channel.max);
        
        // Determine trend
        const recentAvg = channel.history.slice(-5).reduce((a, b) => a + b.value, 0) / 5;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (newValue > recentAvg * 1.01) trend = 'up';
        else if (newValue < recentAvg * 0.99) trend = 'down';

        // Update history
        const newHistory = [
          ...channel.history.slice(-19),
          { timestamp: new Date(), value: newValue, unit: channel.unit }
        ];

        return {
          ...channel,
          value: newValue,
          trend,
          history: newHistory
        };
      }));
      
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3" />;
      case 'down': return <TrendingDown className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-log-green';
      case 'down': return 'text-log-red';
      default: return 'text-sandstone-400';
    }
  };

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-sandstone-50 border-b border-sandstone-200">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-sandstone-900">Telemetry Strip</h3>
          
          {/* Well Selector */}
          <select
            value={selectedWell}
            onChange={e => setSelectedWell(e.target.value)}
            className="ml-4 px-2 py-1 text-sm border border-sandstone-300 rounded bg-white"
          >
            {wells.map(well => (
              <option key={well} value={well}>{well}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-sandstone-500">
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-log-green animate-pulse' : 'bg-log-red'
            )} />
            {isConnected ? 'Live' : 'Disconnected'}
          </div>

          {/* Last Update */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
        {channels.map(channel => (
          <div 
            key={channel.name}
            className="bg-sandstone-50 rounded-lg p-3 border border-sandstone-100"
          >
            {/* Channel Name */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-sandstone-500 uppercase tracking-wide">
                {channel.name}
              </span>
              <span className={clsx(getTrendColor(channel.trend))}>
                {getTrendIcon(channel.trend)}
              </span>
            </div>

            {/* Current Value */}
            <div className="flex items-baseline gap-1 mb-2">
              <span 
                className="text-2xl font-bold font-mono"
                style={{ color: channel.color }}
              >
                {channel.value.toFixed(channel.unit === '%' ? 0 : 1)}
              </span>
              <span className="text-xs text-sandstone-400">{channel.unit}</span>
            </div>

            {/* Mini Sparkline */}
            <div className="h-8 relative">
              <Sparkline 
                data={channel.history.map(p => p.value)} 
                color={channel.color}
                min={channel.min}
                max={channel.max}
              />
            </div>

            {/* Range Indicator */}
            <div className="mt-2">
              <div className="h-1 bg-sandstone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${((channel.value - channel.min) / (channel.max - channel.min)) * 100}%`,
                    backgroundColor: channel.color
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-sandstone-400 font-mono">
                <span>{channel.min}</span>
                <span>{channel.max}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Banner */}
      {channels.some(ch => 
        (ch.value - ch.min) / (ch.max - ch.min) > 0.9
      ) && (
        <div className="px-4 py-2 bg-log-amber/10 border-t border-log-amber/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-log-amber" />
          <span className="text-xs text-log-amber font-medium">
            Some parameters approaching maximum values
          </span>
        </div>
      )}
    </div>
  );
}

// Simple Sparkline Component
interface SparklineProps {
  data: number[];
  color: string;
  min: number;
  max: number;
}

function Sparkline({ data, color, min, max }: SparklineProps) {
  if (data.length < 2) return null;

  const width = 100;
  const height = 32;
  const range = max - min;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = [
    `0,${height}`,
    ...points.split(' '),
    `${width},${height}`
  ].join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkline-gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
