/**
 * Phase 4: Collaboration Components
 * Multi-user Chat with Annotations
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface Annotation {
  id: number;
  message_id: number;
  user_id: number;
  user_name: string;
  content: string;
  annotation_type: 'highlight' | 'comment' | 'reply' | 'resolved';
  parent_annotation_id: number | null;
  is_resolved: boolean;
  created_at: string;
}

interface Notification {
  id: number;
  message_id: number;
  mentioned_user_id: number;
  mentioned_by_user_id: number;
  is_read: boolean;
  created_at: string;
}

// API functions
const api = {
  getAnnotations: async (messageId: number): Promise<Annotation[]> => {
    const response = await fetch(`/api/v1/collaboration/messages/${messageId}/annotations`);
    return response.json();
  },
  
  createAnnotation: async (data: {
    message_id: number;
    content: string;
    annotation_type?: string;
    parent_annotation_id?: number;
  }): Promise<Annotation> => {
    const response = await fetch('/api/v1/collaboration/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  resolveAnnotation: async (annotationId: number): Promise<Annotation> => {
    const response = await fetch(`/api/v1/collaboration/annotations/${annotationId}/resolve`, {
      method: 'POST',
    });
    return response.json();
  },
  
  getNotifications: async (unreadOnly = false): Promise<Notification[]> => {
    const response = await fetch(`/api/v1/collaboration/notifications?unread_only=${unreadOnly}`);
    return response.json();
  },
  
  markNotificationRead: async (notificationId: number): Promise<Notification> => {
    const response = await fetch(`/api/v1/collaboration/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    return response.json();
  },
  
  searchMessages: async (query: string): Promise<any[]> => {
    const response = await fetch('/api/v1/collaboration/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 50 }),
    });
    return response.json();
  },
};

// Annotation Panel Component
interface AnnotationPanelProps {
  messageId: number;
  onClose?: () => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ messageId, onClose }) => {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  
  const { data: annotations, isLoading } = useQuery({
    queryKey: ['annotations', messageId],
    queryFn: () => api.getAnnotations(messageId),
  });
  
  const createMutation = useMutation({
    mutationFn: api.createAnnotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', messageId] });
      setNewComment('');
    },
  });
  
  const resolveMutation = useMutation({
    mutationFn: api.resolveAnnotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', messageId] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    createMutation.mutate({
      message_id: messageId,
      content: newComment,
      annotation_type: 'comment',
    });
  };
  
  return (
    <div className="panel-border bg-[#F7F5F2] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold" style={{ color: '#d44211' }}>Comments & Annotations</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>
      
      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-2 border border-[#C7C0B0] rounded resize-none"
          rows={2}
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newComment.trim()}
          className="mt-2 px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
        >
          {createMutation.isPending ? 'Adding...' : 'Add Comment'}
        </button>
      </form>
      
      {/* Annotations list */}
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : annotations?.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No annotations yet</div>
      ) : (
        <div className="space-y-3">
          {annotations?.map((annotation) => (
            <div
              key={annotation.id}
              className={`p-3 rounded border ${
                annotation.is_resolved
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-[#C7C0B0]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-sm">{annotation.user_name}</span>
                  <span className="text-gray-500 text-xs ml-2">
                    {new Date(annotation.created_at).toLocaleString()}
                  </span>
                </div>
                {!annotation.is_resolved && (
                  <button
                    onClick={() => resolveMutation.mutate(annotation.id)}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    Resolve
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm">{annotation.content}</p>
              {annotation.is_resolved && (
                <span className="inline-block mt-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  ✓ Resolved
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Notifications Bell Component
interface NotificationBellProps {
  onClick?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const { data: notifications } = useQuery({
    queryKey: ['notifications', true],
    queryFn: () => api.getNotifications(true),
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  const unreadCount = notifications?.length || 0;
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded hover:bg-[#EBE8E1] transition-colors"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Chat Search Component
interface ChatSearchProps {
  onSelectMessage?: (messageId: number, conversationId: number) => void;
}

export const ChatSearch: React.FC<ChatSearchProps> = ({ onSelectMessage }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const data = await api.searchMessages(query);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div className="panel-border bg-[#F7F5F2] p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#d44211' }}>Search Chat History</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search messages..."
          className="flex-1 p-2 border border-[#C7C0B0] rounded"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-[#d44211] text-white rounded hover:bg-[#b8380e] disabled:opacity-50"
        >
          {isSearching ? '...' : 'Search'}
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.message_id}
              onClick={() => onSelectMessage?.(result.message_id, result.conversation_id)}
              className="w-full text-left p-3 bg-white border border-[#C7C0B0] rounded hover:bg-[#EBE8E1] transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{result.conversation_title}</span>
                <span className="text-xs text-gray-500">
                  {new Date(result.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{result.user_name}</p>
              {result.matched_highlight && (
                <p
                  className="text-sm mt-2 p-2 bg-yellow-50 rounded"
                  dangerouslySetInnerHTML={{
                    __html: result.matched_highlight.replace(
                      query,
                      `<mark class="bg-yellow-200">${query}</mark>`
                    ),
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default {
  AnnotationPanel,
  NotificationBell,
  ChatSearch,
};
