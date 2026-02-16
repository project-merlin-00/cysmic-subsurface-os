/**
 * CYSMIC Card System
 * Agent-first card rendering system for CYSMIC Subsurface OS
 * 
 * @description
 * This module provides a complete card rendering system where:
 * - Cards are spawned through conversation with the AI agent
 * - Each card type maps to a specific petroleum engineering visualization
 * - Cards support nested spawning, state sync, and dynamic updates
 * 
 * @example
 * ```tsx
 * import { useCardState, CardRenderer } from './cards';
 * 
 * function App() {
 *   const { cards, spawnCard, closeCard, ... } = useCardState();
 *   
 *   // Agent spawns cards through conversation
 *   const handleSpawnDeclineCurve = () => {
 *     spawnCard('declineCurve', 'Well A-1 Decline', {
 *       declineType: 'hyperbolic',
 *       qi: 2000,
 *       Di: 0.15,
 *       b: 0.5,
 *       wellName: 'Well A-1'
 *     });
 *   };
 *   
 *   return (
 *     <div className="relative h-screen">
 *       <CardRenderer
 *         cards={cards}
 *         onClose={closeCard}
 *         onMinimize={minimizeCard}
 *         ...
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// Registry
export { CardRegistry, getCardRegistryEntry, isValidCardType, getSpawnableCardTypes, getDefaultDimensions, getAllCardTypes } from './CardRegistry';

// State Management
export { useCardState, type UseCardStateOptions } from './useCardState';

// Renderer
export { CardRenderer } from './CardRenderer';

// Components
export * from './components';

// Factory functions
export { createCard, createDeclineCurveCard, createLogViewerCard, createMonteCarloCard, createWellTestCard, createVolumetricsCard, createTelemetryCard } from './types';
