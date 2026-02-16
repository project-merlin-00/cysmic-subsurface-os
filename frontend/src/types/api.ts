// API Types

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export type WellStatus = 'drilling' | 'producing' | 'injecting' | 'shut_in' | 'abandoned';

export interface Well {
  id: number;
  name: string;
  field?: string;
  uwi?: string;
  country?: string;
  basin?: string;
  latitude?: number;
  longitude?: number;
  status: WellStatus;
  well_type?: string;
  total_depth_md?: number;
  total_depth_tvd?: number;
  current_depth?: number;
  current_pressure?: number;
  bottom_hole_pressure?: number;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationContext {
  well_id?: number;
  current_depth?: number;
  current_pressure?: number;
  [key: string]: unknown;
}

export interface Conversation {
  id: number;
  title?: string;
  user_id: number;
  well_id?: number;
  is_active: boolean;
  context: ConversationContext;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens_used?: number;
  message_metadata?: Record<string, unknown>;
  attachments?: unknown[];
  created_at: string;
}

export interface ChatMessage {
  content: string;
  context?: ConversationContext;
}

export interface ChatResponse {
  message: Message;
  conversation_id: number;
}
