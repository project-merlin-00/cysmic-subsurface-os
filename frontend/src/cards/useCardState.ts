/**
 * CYSMIC Card System - State Management Hook
 * Manages card state, spawning, closing, and communication
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardData, CardEvent, CardEventType, createCard } from './types';
import { getDefaultDimensions } from './CardRegistry';

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface CardState {
  cards: Card[];
  activeCardId: string | null;
  maximizedCardId: string | null;
}

export interface UseCardStateOptions {
  /** Maximum number of cards allowed */
  maxCards?: number;
  /** Enable card animations */
  animated?: boolean;
  /** Default z-index for new cards */
  defaultZIndex?: number;
  /** Callback when a card event occurs */
  onEvent?: (event: CardEvent) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCardState(options: UseCardStateOptions = {}) {
  const { maxCards = 10, animated = true, defaultZIndex = 100, onEvent } = options;

  const [state, setState] = useState<CardState>({
    cards: [],
    activeCardId: null,
    maximizedCardId: null,
  });

  // Emit card event
  const emitEvent = useCallback((type: CardEventType, cardId: string, payload?: Record<string, unknown>) => {
    const event: CardEvent = {
      type,
      cardId,
      timestamp: Date.now(),
      payload,
    };
    onEvent?.(event);
  }, [onEvent]);

  // Spawn a new card
  const spawnCard = useCallback((
    type: string,
    title: string,
    data?: CardData,
    options?: Partial<Card>
  ): Card | null => {
    setState((prev) => {
      // Check max cards limit
      if (maxCards && prev.cards.length >= maxCards) {
        console.warn(`Maximum card limit (${maxCards}) reached`);
        return prev;
      }

      // Get default dimensions from registry
      const dims = getDefaultDimensions(type);
      const position = options?.position ?? {
        x: 50 + (prev.cards.length * 30) % 200,
        y: 50 + (prev.cards.length * 30) % 150,
        zIndex: defaultZIndex + prev.cards.length,
      };

      // Create new card
      const newCard: Card = {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: type as Card['type'],
        title,
        data,
        size: options?.size ?? 'medium',
        dimensions: options?.dimensions ?? dims,
        position,
        collapsed: false,
        loading: false,
        closable: true,
        minimizable: true,
        spawnable: true,
        createdAt: Date.now(),
        ...options,
      };

      emitEvent('card:spawn', newCard.id, { type, title });

      return {
        ...prev,
        cards: [...prev.cards, newCard],
        activeCardId: newCard.id,
      };
    });

    return null; // Card will be returned via state update
  }, [maxCards, defaultZIndex, emitEvent]);

  // Close a card
  const closeCard = useCallback((cardId: string) => {
    setState((prev) => {
      const card = prev.cards.find((c) => c.id === cardId);
      if (!card) return prev;

      emitEvent('card:close', cardId);

      const newCards = prev.cards.filter((c) => c.id !== cardId);
      const newActiveId = prev.activeCardId === cardId
        ? newCards[newCards.length - 1]?.id ?? null
        : prev.activeCardId;

      return {
        ...prev,
        cards: newCards,
        activeCardId: newActiveId,
        maximizedCardId: prev.maximizedCardId === cardId ? null : prev.maximizedCardId,
      };
    });
  }, [emitEvent]);

  // Minimize a card
  const minimizeCard = useCallback((cardId: string) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, collapsed: true } : card
      ),
    }));
    emitEvent('card:minimize', cardId);
  }, [emitEvent]);

  // Maximize a card
  const maximizeCard = useCallback((cardId: string) => {
    setState((prev) => ({
      ...prev,
      maximizedCardId: prev.maximizedCardId === cardId ? null : cardId,
    }));
    emitEvent('card:maximize', cardId);
  }, [emitEvent]);

  // Restore a minimized card
  const restoreCard = useCallback((cardId: string) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, collapsed: false } : card
      ),
    }));
  }, []);

  // Update a card's data
  const updateCardData = useCallback((cardId: string, data: Partial<CardData>) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId
          ? { ...card, data: { ...card.data, ...data } as CardData }
          : card
      ),
    }));
    emitEvent('card:update', cardId, data as Record<string, unknown>);
  }, [emitEvent]);

  // Update entire card
  const updateCard = useCallback((cardId: string, updates: Partial<Card>) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, ...updates } : card
      ),
    }));
    emitEvent('card:update', cardId, updates);
  }, [emitEvent]);

  // Set active card (bring to front)
  const setActiveCard = useCallback((cardId: string | null) => {
    setState((prev) => {
      if (!cardId) return prev;

      const maxZ = Math.max(...prev.cards.map((c) => c.position?.zIndex ?? 0));

      return {
        ...prev,
        activeCardId: cardId,
        cards: prev.cards.map((card) =>
          card.id === cardId
            ? { ...card, position: { ...card.position, zIndex: maxZ + 1 } }
            : card
        ),
      };
    });
  }, []);

  // Get a specific card
  const getCard = useCallback((cardId: string): Card | undefined => {
    return state.cards.find((c) => c.id === cardId);
  }, [state.cards]);

  // Get all cards of a specific type
  const getCardsByType = useCallback((type: string): Card[] => {
    return state.cards.filter((c) => c.type === type);
  }, [state.cards]);

  // Spawn a child card from a parent
  const spawnChildCard = useCallback((
    parentId: string,
    type: string,
    title: string,
    data?: CardData,
    options?: Partial<Card>
  ): Card | null => {
    const parent = state.cards.find((c) => c.id === parentId);
    if (!parent) return null;

    return spawnCard(type, title, data, {
      ...options,
      parentId,
      position: {
        x: (parent.position?.x ?? 0) + 50,
        y: (parent.position?.y ?? 0) + 50,
        zIndex: (parent.position?.zIndex ?? 0) + 1,
      },
    });
  }, [state.cards, spawnCard]);

  // Clear all cards
  const clearAllCards = useCallback(() => {
    setState({
      cards: [],
      activeCardId: null,
      maximizedCardId: null,
    });
  }, []);

  // Close all cards
  const closeAllCards = useCallback(() => {
    state.cards.forEach((card) => {
      emitEvent('card:close', card.id);
    });
    setState({
      cards: [],
      activeCardId: null,
      maximizedCardId: null,
    });
  }, [state.cards, emitEvent]);

  // Focus on a card (bring to front)
  const focusCard = useCallback((cardId: string) => {
    setState((prev) => {
      const card = prev.cards.find((c) => c.id === cardId);
      if (!card) return prev;

      const maxZ = Math.max(...prev.cards.map((c) => c.position?.zIndex ?? 0));

      return {
        ...prev,
        activeCardId: cardId,
        cards: prev.cards.map((c) =>
          c.id === cardId
            ? { ...c, position: { ...c.position, zIndex: maxZ + 1 } }
            : c
        ),
      };
    });
  }, []);

  // Set loading state for a card
  const setCardLoading = useCallback((cardId: string, loading: boolean) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, loading } : card
      ),
    }));
  }, []);

  // Set error state for a card
  const setCardError = useCallback((cardId: string, error: string | null) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, error: error ?? undefined } : card
      ),
    }));
    if (error) {
      emitEvent('card:error', cardId, { error });
    }
  }, [emitEvent]);

  return {
    // State
    cards: state.cards,
    activeCardId: state.activeCardId,
    maximizedCardId: state.maximizedCardId,
    
    // Actions
    spawnCard,
    closeCard,
    minimizeCard,
    maximizeCard,
    restoreCard,
    updateCardData,
    updateCard,
    setActiveCard,
    getCard,
    getCardsByType,
    spawnChildCard,
    clearAllCards,
    closeAllCards,
    focusCard,
    setCardLoading,
    setCardError,
  };
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export type { Card, CardData, CardEvent, CardEventType };
