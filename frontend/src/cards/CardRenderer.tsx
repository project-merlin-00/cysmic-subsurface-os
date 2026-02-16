/**
 * CYSMIC Card Renderer
 * Dynamic rendering engine that renders cards based on their type
 */

import React, { useMemo, useCallback } from 'react';
import { Card, CardData, CardComponentProps } from './types';
import { CardRegistry } from './CardRegistry';

// ============================================================================
// PROPS
// ============================================================================

interface CardRendererProps {
  /** Cards to render */
  cards: Card[];
  /** Currently active card ID */
  activeCardId: string | null;
  /** Maximized card ID (null if none) */
  maximizedCardId: string | null;
  /** Callback when card is closed */
  onClose: (cardId: string) => void;
  /** Callback when card is minimized */
  onMinimize: (cardId: string) => void;
  /** Callback when card is maximized */
  onMaximize: (cardId: string) => void;
  /** Callback when card is focused */
  onFocus: (cardId: string) => void;
  /** Callback when a child card is spawned */
  onSpawn?: (card: Card) => void;
  /** Callback when card data is updated */
  onUpdate: (cardId: string, data: Partial<Card>) => void;
  /** Enable drag functionality */
  draggable?: boolean;
  /** Enable animations */
  animated?: boolean;
  /** Render mode */
  mode?: 'default' | 'canvas' | 'chat';
}

// ============================================================================
// CARD CONTAINER (Individual Card Wrapper)
// ============================================================================

const CardContainer: React.FC<{
  card: Card;
  isActive: boolean;
  isMaximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  draggable?: boolean;
  animated?: boolean;
  children: React.ReactNode;
}> = ({
  card,
  isActive,
  isMaximized,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  draggable = true,
  animated = true,
  children,
}) => {
  // Get card dimensions
  const width = card.dimensions?.width ?? 400;
  const height = card.dimensions?.height ?? 300;
  
  const style: React.CSSProperties = {
    width: isMaximized ? '100%' : width,
    height: isMaximized ? '100%' : height,
    position: isMaximized ? 'fixed' : 'absolute',
    left: isMaximized ? 0 : card.position?.x ?? 0,
    top: isMaximized ? 0 : card.position?.y ?? 0,
    zIndex: isMaximized ? 9999 : card.position?.zIndex ?? 100,
  };

  const animationClass = animated ? 'card-spawn' : '';

  return (
    <div
      className={`
        card-container
        ${isActive ? 'ring-2 ring-[#d44211]' : ''}
        ${isMaximized ? 'card-maximized' : ''}
        ${card.collapsed ? 'card-collapsed' : ''}
        ${animationClass}
        bg-[#f8f6f6]
        border border-[#C7C0B0]
        shadow-[2px_2px_0px_rgba(199,192,176,0.4)]
        rounded-sm
        overflow-hidden
        flex flex-col
        select-none
        font-ibm
      `}
      style={style}
      onMouseDown={onFocus}
    >
      {/* Card Header */}
      <div
        className={`
          card-header
          flex items-center justify-between
          px-3 py-2
          bg-[#EBE8E1]
          border-b border-[#C7C0B0]
          ${draggable ? 'cursor-move' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          {/* Card type indicator */}
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#d44211' }}
          />
          <h3 className="font-space text-sm font-semibold text-[#221510] truncate max-w-[180px]">
            {card.title}
          </h3>
          {card.subtitle && (
            <span className="text-xs text-[#706859] truncate">
              {card.subtitle}
            </span>
          )}
        </div>

        {/* Card controls */}
        <div className="flex items-center gap-1">
          {/* Loading indicator */}
          {card.loading && (
            <div className="w-3 h-3 border-2 border-[#d44211] border-t-transparent rounded-full animate-spin" />
          )}
          
          {/* Minimize button */}
          {card.minimizable && !isMaximized && (
            <button
              onClick={(e) => { e.stopPropagation(); onMinimize(); }}
              className="w-6 h-6 flex items-center justify-center text-[#706859] hover:text-[#d44211] hover:bg-[#DCD7CC] rounded transition-colors"
              title="Minimize"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          )}
          
          {/* Maximize button */}
          {card.minimizable && (
            <button
              onClick={(e) => { e.stopPropagation(); onMaximize(); }}
              className="w-6 h-6 flex items-center justify-center text-[#706859] hover:text-[#d44211] hover:bg-[#DCD7CC] rounded transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMaximized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 8v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
          )}
          
          {/* Close button */}
          {card.closable && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-6 h-6 flex items-center justify-center text-[#706859] hover:text-white hover:bg-[#dc2626] rounded transition-colors"
              title="Close"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card Content */}
      {!card.collapsed && (
        <div className="card-content flex-1 overflow-auto bg-[#f8f6f6]">
          {children}
        </div>
      )}

      {/* Collapsed state */}
      {card.collapsed && (
        <div className="card-collapsed-indicator h-6 bg-[#EBE8E1] text-xs text-[#706859] flex items-center px-3">
          <span className="truncate">{card.title}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="ml-auto text-[#706859] hover:text-[#d44211]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      )}

      {/* Error indicator */}
      {card.error && (
        <div className="card-error bg-[#fef2f2] border-t border-[#dc2626] px-3 py-2 text-xs text-[#dc2626]">
          {card.error}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN RENDERER
// ============================================================================

export const CardRenderer: React.FC<CardRendererProps> = ({
  cards,
  activeCardId,
  maximizedCardId,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onSpawn,
  onUpdate,
  draggable = true,
  animated = true,
  mode = 'default',
}) => {
  // Get card component from registry
  const getCardComponent = useCallback((card: Card): React.ReactNode => {
    const registryEntry = CardRegistry[card.type];
    
    if (!registryEntry) {
      return (
        <div className="flex items-center justify-center h-full text-[#706859]">
          <div className="text-center">
            <p className="font-space text-sm">Unknown card type: {card.type}</p>
            <button
              onClick={() => onClose(card.id)}
              className="mt-2 text-xs text-[#d44211] hover:underline"
            >
              Close card
            </button>
          </div>
        </div>
      );
    }

    const CardComponent = registryEntry.component;

    const props: CardComponentProps = {
      card,
      data: card.data as CardData,
      onClose: () => onClose(card.id),
      onMinimize: () => onMinimize(card.id),
      onSpawn: onSpawn,
      onUpdate: (updates) => onUpdate(card.id, updates),
    };

    return <CardComponent {...props} />;
  }, [onClose, onMinimize, onSpawn, onUpdate]);

  // Filter cards based on mode
  const visibleCards = useMemo(() => {
    if (mode === 'chat') {
      // In chat mode, show only the most recent card or cards in expanded state
      return cards.filter((card) => !card.collapsed);
    }
    return cards;
  }, [cards, mode]);

  // If there's a maximized card, only render that one
  if (maximizedCardId) {
    const maximizedCard = cards.find((c) => c.id === maximizedCardId);
    if (maximizedCard) {
      return (
        <CardContainer
          card={maximizedCard}
          isActive={true}
          isMaximized={true}
          onClose={() => onClose(maximizedCard.id)}
          onMinimize={() => onMinimize(maximizedCard.id)}
          onMaximize={() => onMaximize(maximizedCard.id)}
          onFocus={() => onFocus(maximizedCard.id)}
          draggable={draggable}
          animated={animated}
        >
          {getCardComponent(maximizedCard)}
        </CardContainer>
      );
    }
  }

  // Render all visible cards
  return (
    <div className="card-renderer-container relative w-full h-full">
      {visibleCards.map((card) => (
        <CardContainer
          key={card.id}
          card={card}
          isActive={card.id === activeCardId}
          isMaximized={false}
          onClose={() => onClose(card.id)}
          onMinimize={() => onMinimize(card.id)}
          onMaximize={() => onMaximize(card.id)}
          onFocus={() => onFocus(card.id)}
          draggable={draggable}
          animated={animated}
        >
          {getCardComponent(card)}
        </CardContainer>
      ))}
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default CardRenderer;
