/**
 * CYSMIC Card System - Type Definitions
 * 
 * JSON Schema for agent-first card rendering system
 * Supports nested cards, state sync, and dynamic spawning
 */

import { ReactNode } from 'react';

// ============================================================================
// CARD SCHEMA DEFINITIONS
// ============================================================================

export type CardType = 
  | 'declineCurve'
  | 'logViewer'
  | 'monteCarlo'
  | 'wellTest'
  | 'volumetrics'
  | 'telemetry'
  | 'materialBalance'
  | 'parameterPanel'
  | 'reportBuilder'
  | 'fileIngestion'
  | 'wellInfo'
  | 'custom';

export type CardSize = 'small' | 'medium' | 'large' | 'full';

export interface CardDimensions {
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
}

export interface CardPosition {
  x?: number;
  y?: number;
  zIndex?: number;
}

// Base card interface
export interface BaseCard {
  /** Unique identifier for this card instance */
  id: string;
  /** Card type - maps to component in registry */
  type: CardType;
  /** Display title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Card dimensions */
  dimensions?: CardDimensions;
  /** Position on canvas */
  position?: CardPosition;
  /** Size category */
  size?: CardSize;
  /** Whether card is collapsed */
  collapsed?: boolean;
  /** Whether card is loading */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Timestamp when card was created */
  createdAt?: number;
  /** Parent card ID for nested cards */
  parentId?: string;
  /** Child cards spawned by this card */
  children?: Card[];
  /** Custom CSS className */
  className?: string;
  /** Whether card can be closed */
  closable?: boolean;
  /** Whether card can be minimized */
  minimizable?: boolean;
  /** Whether card can spawn child cards */
  spawnable?: boolean;
}

// Complete card type
export interface Card extends BaseCard {
  /** The actual data payload for the card */
  data?: CardData;
  /** State sync between chat and card */
  syncState?: CardSyncState;
  /** Event handlers */
  onClose?: (cardId: string) => void;
  onMinimize?: (cardId: string) => void;
  onMaximize?: (cardId: string) => void;
  onSpawn?: (childCard: Card) => void;
  onUpdate?: (cardId: string, data: Partial<Card>) => void;
}

// ============================================================================
// CARD DATA PAYLOADS - Domain-specific data structures
// ============================================================================

// Decline Curve Card Data
export interface DeclineCurveData {
  /** Well identifier */
  wellId?: string;
  wellName?: string;
  /** Time series data */
  timeData: number[];
  rateData: number[];
  /** Forecast data */
  forecastTime?: number[];
  forecastRate?: number[];
  /** Decline parameters */
  declineType: 'exponential' | 'hyperbolic' | 'harmonic';
  qi: number;        // Initial rate
  Di: number;        // Initial decline rate (1/month)
  b: number;         // b-factor (0-1 for hyperbolic)
  /** EUR calculation */
  eur?: number;
  economicLimit?: number;
  /** Units */
  rateUnit?: 'stb/d' | 'mcf/d' | 'bbl/d';
  timeUnit?: 'days' | 'months' | 'years';
}

// Log Viewer Card Data
export interface LogViewerData {
  /** Well identifier */
  wellId?: string;
  wellName?: string;
  /** Depth range */
  topDepth: number;
  bottomDepth: number;
  /** Track configurations */
  tracks: LogTrack[];
  /** Log curve data */
  curves: LogCurve[];
  /** Lithology data (optional) */
  lithology?: LithologyZone[];
  /** Depth step */
  step?: number;
}

export interface LogTrack {
  id: string;
  name: string;
  width?: number;
  curves: string[];  // Curve IDs
  scale?: 'linear' | 'log';
  minValue?: number;
  maxValue?: number;
  color?: string;
}

export interface LogCurve {
  id: string;
  name: string;
  mnemonic: string;
  unit: string;
  data: number[];    // [depth, value, value, ...]
  color: string;
  trackId: string;
}

export interface LithologyZone {
  top: number;
  bottom: number;
  lithology: 'sandstone' | 'limestone' | 'shale' | 'dolomite' | 'coal' | ' anhydrite';
  description?: string;
}

// Monte Carlo Card Data
export interface MonteCarloData {
  /** Simulation parameters */
  variables: MonteCarloVariable[];
  /** Number of iterations */
  iterations: number;
  /** Results */
  results?: number[];
  /** Statistics */
  statistics?: MonteCarloStats;
  /** Percentiles to display */
  percentiles?: number[];  // e.g., [5, 50, 95]
}

export interface MonteCarloVariable {
  id: string;
  name: string;
  distribution: 'normal' | 'lognormal' | 'triangular' | 'uniform';
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
  mode?: number;
  value?: number;   // For deterministic mode
}

export interface MonteCarloStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p5?: number;
  p50?: number;
  p95?: number;
}

// Well Test Card Data (Diagnostic Plot)
export interface WellTestData {
  /** Well identifier */
  wellId?: string;
  wellName?: string;
  /** Test type */
  testType: 'drawdown' | 'buildup' | 'falloff' | 'injectivity';
  /** Pressure data */
  pressureData: WellTestPoint[];
  /** Time data */
  timeData: WellTestPoint[];
  /** Derivative data */
  derivativeData?: WellTestPoint[];
  /** Analysis results */
  analysis?: WellTestAnalysis;
}

export interface WellTestPoint {
  time: number;      // Delta time (hours)
  pressure: number;  // Pressure (psi)
  rate?: number;     // Rate (if variable)
}

export interface WellTestAnalysis {
  permeability?: number;     // mD
  skin?: number;
  reservoirPressure?: number; // psia
  flowRegime?: string;
  derivativeType?: 'horner' | 'materialBalance';
}

// Volumetrics Card Data (STOIIP)
export interface VolumetricsData {
  /** Reservoir identifier */
  reservoirId?: string;
  reservoirName?: string;
  /** Volumetric input parameters */
  parameters: VolumetricsParams;
  /** Monte Carlo simulation results */
  simulation?: MonteCarloData;
  /** Deterministic result */
  result?: VolumetricsResult;
}

export interface VolumetricsParams {
  area: number;           // acres
  netPay: number;         // feet
  porosity: number;       // fraction (0-1)
  waterSaturation: number; // fraction (0-1)
  formationVolumeFactor: number; // RB/STB
  areaUnit?: 'acres' | 'sq miles' | 'hectares';
  thicknessUnit?: 'ft' | 'm';
}

export interface VolumetricsResult {
  stoiip: number;         // STB
  goiip?: number;         // SCF (if gas)
  recoveryFactor?: number;
  recoverable?: number;
}

// Telemetry Card Data (Real-time Gauges)
export interface TelemetryData {
  /** Well identifier */
  wellId?: string;
  wellName?: string;
  /** Gauge configurations */
  gauges: GaugeConfig[];
  /** Real-time values (updated via WebSocket/polling) */
  readings?: GaugeReading[];
  /** Alert thresholds */
  alerts?: GaugeAlert[];
}

export interface GaugeConfig {
  id: string;
  name: string;
  type: 'pressure' | 'temperature' | 'rate' | 'level' | 'frequency';
  unit: string;
  min: number;
  max: number;
  normalMin?: number;
  normalMax?: number;
  color?: string;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface GaugeReading {
  gaugeId: string;
  value: number;
  timestamp: number;
  quality?: 'good' | 'bad' | 'uncertain';
}

export interface GaugeAlert {
  gaugeId: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp?: number;
}

// Material Balance Card Data
export interface MaterialBalanceData {
  /** Reservoir identifier */
  reservoirId?: string;
  /** Time series */
  timeData: number[];
  /** Pressure data */
  pressureData: number[];
  /** Production data */
  np?: number[];    // Cumulative oil production (STB)
  wp?: number[];    // Cumulative water production (STB)
  gp?: number[];    // Cumulative gas production (SCF)
  /** Injection data */
  wi?: number[];    // Cumulative water injection
  gi?: number[];    // Cumulative gas injection
  /** Fluid properties */
  bo?: number[];    // Oil formation volume factor
  bg?: number[];    // Gas formation volume factor
  rs?: number[];    // Solution gas-oil ratio
  /** Results */
  originalInPlace?: number;
  driveIndex?: number;
}

// Union of all card data types
export type CardData = 
  | DeclineCurveData 
  | LogViewerData 
  | MonteCarloData 
  | WellTestData 
  | VolumetricsData 
  | TelemetryData 
  | MaterialBalanceData
  | Record<string, unknown>;

// ============================================================================
// CARD STATE SYNC
// ============================================================================

export interface CardSyncState {
  /** Current sync status */
  status: 'idle' | 'syncing' | 'synced' | 'error';
  /** Last sync timestamp */
  lastSync?: number;
  /** Sync error message */
  error?: string;
  /** Whether card should auto-sync */
  autoSync?: boolean;
  /** Sync interval in ms */
  syncInterval?: number;
}

// ============================================================================
// CARD REGISTRY
// ============================================================================

export interface CardRegistryEntry {
  type: CardType;
  component: React.ComponentType<CardComponentProps>;
  defaultSize: CardSize;
  defaultDimensions: CardDimensions;
  spawnable: boolean;
  description?: string;
}

export interface CardComponentProps {
  card: Card;
  data: CardData;
  onClose?: () => void;
  onMinimize?: () => void;
  onSpawn?: (card: Card) => void;
  onUpdate?: (data: Partial<Card>) => void;
}

// ============================================================================
// CARD RENDERER CONFIG
// ============================================================================

export interface CardRendererConfig {
  /** Enable card animations */
  animated?: boolean;
  /** Enable drag and drop */
  draggable?: boolean;
  /** Enable resize */
  resizable?: boolean;
  /** Default z-index for new cards */
  defaultZIndex?: number;
  /** Maximum number of cards */
  maxCards?: number;
  /** Card spawn animation */
  spawnAnimation?: 'fade' | 'slide' | 'scale' | 'none';
  /** Card close animation */
  closeAnimation?: 'fade' | 'slide' | 'scale' | 'none';
}

// ============================================================================
// CARD EVENT TYPES
// ============================================================================

export type CardEventType = 
  | 'card:spawn'
  | 'card:close'
  | 'card:minimize'
  | 'card:maximize'
  | 'card:update'
  | 'card:sync'
  | 'card:error';

export interface CardEvent {
  type: CardEventType;
  cardId: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createCard(type: CardType, title: string, data?: CardData, options?: Partial<BaseCard>): Card {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    data,
    size: 'medium',
    collapsed: false,
    loading: false,
    closable: true,
    minimizable: true,
    spawnable: true,
    createdAt: Date.now(),
    ...options,
  };
}

export function createDeclineCurveCard(
  title: string,
  data: DeclineCurveData,
  options?: Partial<BaseCard>
): Card {
  return createCard('declineCurve', title, data, options);
}

export function createLogViewerCard(
  title: string,
  data: LogViewerData,
  options?: Partial<BaseCard>
): Card {
  return createCard('logViewer', title, data, { ...options, size: 'large' });
}

export function createMonteCarloCard(
  title: string,
  data: MonteCarloData,
  options?: Partial<BaseCard>
): Card {
  return createCard('monteCarlo', title, data, { ...options, size: 'medium' });
}

export function createWellTestCard(
  title: string,
  data: WellTestData,
  options?: Partial<BaseCard>
): Card {
  return createCard('wellTest', title, data, { ...options, size: 'medium' });
}

export function createVolumetricsCard(
  title: string,
  data: VolumetricsData,
  options?: Partial<BaseCard>
): Card {
  return createCard('volumetrics', title, data, { ...options, size: 'medium' });
}

export function createTelemetryCard(
  title: string,
  data: TelemetryData,
  options?: Partial<BaseCard>
): Card {
  return createCard('telemetry', title, data, { ...options, size: 'small' });
}
