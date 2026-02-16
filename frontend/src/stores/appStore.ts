import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Well, Conversation, ConversationContext } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'cysmic-auth',
    }
  )
);

interface AppState {
  // Current context
  currentWell: Well | null;
  currentConversation: Conversation | null;
  conversationContext: ConversationContext;
  
  // UI state
  sidebarOpen: boolean;
  activeComponent: string | null;
  
  // Actions
  setCurrentWell: (well: Well | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  updateContext: (context: Partial<ConversationContext>) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveComponent: (component: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWell: null,
  currentConversation: null,
  conversationContext: {
    well_id: undefined,
    well_name: undefined,
    current_depth: undefined,
    current_pressure: undefined,
    parameters: {},
  },
  sidebarOpen: true,
  activeComponent: null,
  
  setCurrentWell: (well) => set((state) => ({
    currentWell: well,
    conversationContext: {
      ...state.conversationContext,
      well_id: well?.id,
      well_name: well?.name,
      current_depth: well?.current_depth,
      current_pressure: well?.current_pressure,
    },
  })),
  
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  
  updateContext: (context) => set((state) => ({
    conversationContext: { ...state.conversationContext, ...context },
  })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  setActiveComponent: (component) => set({ activeComponent: component }),
}));

interface ChatState {
  messages: Array<{
    id: number;
    role: 'user' | 'assistant';
    content: string;
    tool_calls?: Array<{ tool: string; arguments: unknown }>;
    components?: Array<{ type: string; component_type: string; props: unknown }>;
    created_at: string;
  }>;
  isLoading: boolean;
  error: string | null;
  
  addMessage: (message: ChatState['messages'][0]) => void;
  setMessages: (messages: ChatState['messages']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  setMessages: (messages) => set({ messages }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearMessages: () => set({ messages: [], error: null }),
}));
