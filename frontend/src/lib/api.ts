import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { 
  Token, 
  LoginRequest, 
  RegisterRequest,
  User,
  Well,
  Conversation,
  Message,
  ChatMessage,
  ChatResponse 
} from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.token = null;
          localStorage.removeItem('cysmic_token');
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('cysmic_token', token);
    } else {
      localStorage.removeItem('cysmic_token');
    }
  }

  loadToken() {
    const token = localStorage.getItem('cysmic_token');
    if (token) {
      this.token = token;
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<Token> {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await this.client.post<Token>('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    this.setToken(response.data.access_token);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<{ message: string; user_id: number }> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // Wells endpoints
  async getWells(params?: { field?: string; status?: string }): Promise<Well[]> {
    const response = await this.client.get<Well[]>('/wells/', { params });
    return response.data;
  }

  async getWell(id: number): Promise<Well> {
    const response = await this.client.get<Well>(`/wells/${id}`);
    return response.data;
  }

  async createWell(data: Partial<Well>): Promise<Well> {
    const response = await this.client.post<Well>('/wells/', data);
    return response.data;
  }

  async updateWell(id: number, data: Partial<Well>): Promise<Well> {
    const response = await this.client.patch<Well>(`/wells/${id}`, data);
    return response.data;
  }

  async deleteWell(id: number): Promise<void> {
    await this.client.delete(`/wells/${id}`);
  }

  // Conversations endpoints
  async getConversations(params?: { well_id?: number }): Promise<Conversation[]> {
    const response = await this.client.get<Conversation[]>('/conversations/', { params });
    return response.data;
  }

  async getConversation(id: number): Promise<Conversation> {
    const response = await this.client.get<Conversation>(`/conversations/${id}`);
    return response.data;
  }

  async createConversation(data: { title?: string; context?: Conversation['context'] }): Promise<Conversation> {
    const response = await this.client.post<Conversation>('/conversations/', data);
    return response.data;
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    const response = await this.client.get<Message[]>(`/conversations/${conversationId}/messages`);
    return response.data;
  }

  // Chat endpoints
  async sendMessage(conversationId: number, data: ChatMessage): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>(`/chat/${conversationId}/messages`, data);
    return response.data;
  }

  async quickChat(data: ChatMessage): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>('/chat/quick', data);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const api = new ApiClient();
export default api;
