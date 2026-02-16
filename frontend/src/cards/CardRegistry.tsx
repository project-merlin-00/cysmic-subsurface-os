/**
 * CYSMIC Card Registry
 * Maps card types to their React components
 */

import { CardRegistryEntry, CardComponentProps } from './types';

// Import card components
import { DeclineCurveCard } from './components/DeclineCurveCard';
import { LogViewerCard } from './components/LogViewerCard';
import { MonteCarloCard } from './components/MonteCarloCard';
import { WellTestCard } from './components/WellTestCard';
import { VolumetricsCard } from './components/VolumetricsCard';
import { TelemetryCard } from './components/TelemetryCard';

// ============================================================================
// CARD REGISTRY
// ============================================================================

export const CardRegistry: Record<string, CardRegistryEntry> = {
  declineCurve: {
    type: 'declineCurve',
    component: DeclineCurveCard,
    defaultSize: 'medium',
    defaultDimensions: { width: 560, height: 400 },
    spawnable: true,
    description: 'Arps decline curve visualization with forecasting',
  },
  logViewer: {
    type: 'logViewer',
    component: LogViewerCard,
    defaultSize: 'large',
    defaultDimensions: { width: 800, height: 600 },
    spawnable: true,
    description: 'Multi-track log viewer with GR, RES, RHOB, NPHI',
  },
  monteCarlo: {
    type: 'monteCarlo',
    component: MonteCarloCard,
    defaultSize: 'medium',
    defaultDimensions: { width: 520, height: 420 },
    spawnable: true,
    description: 'Monte Carlo simulation with histogram and percentiles',
  },
  wellTest: {
    type: 'wellTest',
    component: WellTestCard,
    defaultSize: 'medium',
    defaultDimensions: { width: 540, height: 420 },
    spawnable: true,
    description: 'Well test diagnostic plot (log-log)',
  },
  volumetrics: {
    type: 'volumetrics',
    component: VolumetricsCard,
    defaultSize: 'medium',
    defaultDimensions: { width: 500, height: 450 },
    spawnable: true,
    description: 'STOIIP/Gas Initially In Place visualization',
  },
  telemetry: {
    type: 'telemetry',
    component: TelemetryCard,
    defaultSize: 'small',
    defaultDimensions: { width: 320, height: 280 },
    spawnable: true,
    description: 'Real-time gauge monitoring',
  },
  materialBalance: {
    type: 'materialBalance',
    component: ({ card }: CardComponentProps) => (
      <div className="p-4">
        <h3 className="font-space text-lg text-[#d44211]">{card.title}</h3>
        <p className="text-gray-500 text-sm mt-2">Material Balance Card</p>
      </div>
    ),
    defaultSize: 'medium',
    defaultDimensions: { width: 480, height: 380 },
    spawnable: true,
    description: 'Material balance analysis',
  },
  parameterPanel: {
    type: 'parameterPanel',
    component: ({ card }: CardComponentProps) => (
      <div className="p-4">
        <h3 className="font-space text-lg text-[#d44211]">{card.title}</h3>
        <p className="text-gray-500 text-sm mt-2">Parameter Panel</p>
      </div>
    ),
    defaultSize: 'small',
    defaultDimensions: { width: 300, height: 350 },
    spawnable: true,
    description: 'Parameter input panel',
  },
  reportBuilder: {
    type: 'reportBuilder',
    component: ({ card }: CardComponentProps) => (
      <div className="p-4">
        <h3 className="font-space text-lg text-[#d44211]">{card.title}</h3>
        <p className="text-gray-500 text-sm mt-2">Report Builder</p>
      </div>
    ),
    defaultSize: 'large',
    defaultDimensions: { width: 700, height: 550 },
    spawnable: true,
    description: 'Report generation interface',
  },
  fileIngestion: {
    type: 'fileIngestion',
    component: ({ card }: CardComponentProps) => (
      <div className="p-4">
        <h3 className="font-space text-lg text-[#d44211]">{card.title}</h3>
        <p className="text-gray-500 text-sm mt-2">File Ingestion Widget</p>
      </div>
    ),
    defaultSize: 'medium',
    defaultDimensions: { width: 450, height: 350 },
    spawnable: true,
    description: 'File upload for LAS, DLIS, CSV',
  },
  wellInfo: {
    type: 'wellInfo',
    component: ({ card }: CardComponentProps) => (
      <div className="p-4">
        <h3 className="font-space text-lg text-[#d44211]">{card.title}</h3>
        <p className="text-gray-500 text-sm mt-2">Well Information</p>
      </div>
    ),
    defaultSize: 'small',
    defaultDimensions: { width: 280, height: 320 },
    spawnable: true,
    description: 'Well status and key metrics',
  },
};

// ============================================================================
// REGISTRY UTILITIES
// ============================================================================

/**
 * Get registry entry by card type
 */
export function getCardRegistryEntry(type: string): CardRegistryEntry | undefined {
  return CardRegistry[type];
}

/**
 * Check if a card type exists in the registry
 */
export function isValidCardType(type: string): boolean {
  return type in CardRegistry;
}

/**
 * Get all spawnable card types
 */
export function getSpawnableCardTypes(): string[] {
  return Object.values(CardRegistry)
    .filter((entry) => entry.spawnable)
    .map((entry) => entry.type);
}

/**
 * Get default dimensions for a card type
 */
export function getDefaultDimensions(type: string): { width: number; height: number } | undefined {
  const entry = CardRegistry[type];
  if (entry?.defaultDimensions) {
    return {
      width: typeof entry.defaultDimensions.width === 'number' 
        ? entry.defaultDimensions.width 
        : 400,
      height: typeof entry.defaultDimensions.height === 'number' 
        ? entry.defaultDimensions.height 
        : 300,
    };
  }
  return undefined;
}

/**
 * Get all card types as an array
 */
export function getAllCardTypes(): Array<{ type: string; description?: string }> {
  return Object.values(CardRegistry).map((entry) => ({
    type: entry.type,
    description: entry.description,
  }));
}
