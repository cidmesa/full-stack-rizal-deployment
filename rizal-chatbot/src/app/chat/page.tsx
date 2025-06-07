'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import TypingSpinner from '@/src/components/TypingSpinner';
import { setupAxiosInterceptors, getAuthHeaders, clearTokens } from '@/lib/axios';
import { API_CONFIG } from '@/lib/config';

function typeBotReply(fullText: string, onUpdate: (typedText: string) => void, onComplete: () => void) {
  let index = 0;
  const interval = setInterval(() => {
    index++;
    onUpdate(fullText.slice(0, index));
    if (index === fullText.length) {
      clearInterval(interval);
      onComplete();
    }
  }, 20); 
  return () => clearInterval(interval);
}

interface ChatMessage {
  sender: 'user' | 'rizal';
  message: string;
  timestamp: string;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: {
    sender: string;
    message: string;
    timestamp: string;
  };
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [currentTypingCleanup, setCurrentTypingCleanup] = useState<(() => void) | null>(null);
  const router = useRouter();

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(API_CONFIG.ENDPOINTS.SESSIONS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      router.push('/');
    }
  };

  const fetchSessionMessages = async (sessionId: number) => {
    try {
      const res = await axios.get(API_CONFIG.ENDPOINTS.SESSION_DETAIL(sessionId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Only update if this is still the current session (prevent race conditions)
      setCurrentSession(prevSession => {
        if (prevSession?.id === sessionId) {
          setMessages(res.data.messages || []);
          return res.data;
        }
        return prevSession;
      });
    } catch (err) {
      console.error('Error fetching session messages:', err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const selectSession = (session: ChatSession) => {
    // Cancel any ongoing typing animation
    if (currentTypingCleanup) {
      currentTypingCleanup();
      setCurrentTypingCleanup(null);
    }
    
    // Clear current state first to prevent carryover
    setIsTyping(false);
    setMessages([]);
    setIsLoadingSession(true);
    setCurrentSession(session);
    
    // Then fetch the session messages
    fetchSessionMessages(session.id);
  };

  const startNewSession = () => {
    // Cancel any ongoing typing animation
    if (currentTypingCleanup) {
      currentTypingCleanup();
      setCurrentTypingCleanup(null);
    }
    
    setCurrentSession(null);
    setMessages([]);
    setIsTyping(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = {
      sender: 'user',
      message: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsFetching(true);

    try {
      const payload: any = { message: input };
      if (currentSession) {
        payload.session_id = currentSession.id;
      }

      const res = await axios.post(
        API_CONFIG.ENDPOINTS.CHAT,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // If we didn't have a current session, this is a new one
      if (!currentSession) {
        const newSession: ChatSession = {
          id: res.data.session_id,
          title: res.data.session_title || input.slice(0, 50),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 2, // user + rizal message
        };
        setCurrentSession(newSession);
        setSessions(prev => [newSession, ...prev]);
      } else {
        // Update existing session in the list
        setSessions(prev => prev.map(session => 
          session.id === currentSession.id 
            ? { ...session, updated_at: new Date().toISOString(), message_count: messages.length + 2 }
            : session
        ));
      }

      // Start typing animation for bot reply
      const fullReply = res.data.response;
      const sessionIdForThisResponse = currentSession?.id || res.data.session_id;
      setIsFetching(false);
      setIsTyping(true);

      const emptyBotMessage: ChatMessage = {
        sender: 'rizal',
        message: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, emptyBotMessage]);

      const cleanup = typeBotReply(
        fullReply,
        (typed) => {
          // Only update if we're still in the same session
          setCurrentSession(currentSessionState => {
            if (currentSessionState?.id === sessionIdForThisResponse || (!currentSessionState && !sessionIdForThisResponse)) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  message: typed,
                };
                return updated;
              });
            }
            return currentSessionState;
          });
        },
        () => {
          // Only complete if we're still in the same session
          setCurrentSession(currentSessionState => {
            if (currentSessionState?.id === sessionIdForThisResponse || (!currentSessionState && !sessionIdForThisResponse)) {
              setIsTyping(false);
            }
            return currentSessionState;
          });
          setCurrentTypingCleanup(null);
        }
      );
      
      setCurrentTypingCleanup(() => cleanup);
      
    } catch (err) {
      setIsFetching(false);
      console.error('Failed to send message:', err);
    }
  };

  const deleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await axios.delete(API_CONFIG.ENDPOINTS.SESSION_DETAIL(sessionId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        startNewSession();
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  const TypingDots = () => (
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0s]"></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
    </div>
  );

  useEffect(() => {
    if (!token) {
      router.push('/');
    } else {
      fetchSessions();
    }
  }, [token]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 border-r p-4 bg-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chat Sessions</h2>
          <button
            onClick={startNewSession}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            New Chat
          </button>
        </div>
        
        <div className="space-y-2 overflow-y-auto flex-1">
          {/* Current new session */}
          {!currentSession && messages.length === 0 && (
            <div className="p-3 bg-blue-100 border-l-4 border-blue-500 rounded">
              <div className="font-medium text-blue-800">New Chat</div>
              <div className="text-sm text-blue-600">Start a conversation with Rizal</div>
            </div>
          )}
          
          {/* Existing sessions */}
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => selectSession(session)}
              className={`p-3 rounded cursor-pointer group relative ${
                currentSession?.id === session.id
                  ? 'bg-blue-200 border-l-4 border-blue-500'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {session.title || 'Untitled Chat'}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-2 p-1 rounded"
                  title="Delete session"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Chat Header */}
        <div className="border-b pb-4 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {currentSession ? currentSession.title : 'New Chat with José Rizal'}
              </h1>
              <p className="text-sm text-gray-600">
                {currentSession 
                  ? `Started ${new Date(currentSession.created_at).toLocaleDateString()}`
                  : 'Start a new conversation'
                }
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages - Takes up all available space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingSession ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <h3 className="text-xl font-semibold mb-2">Welcome to the José Rizal Chatbot</h3>
              <p>Start a conversation with the Filipino national hero. Ask him about his life, writings, or thoughts on reform and education.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'rizal' && (
                  <img
                    src="/avatars/jriz.jpg"
                    alt="Rizal Avatar"
                    className="m-1 w-8 h-8 rounded-full ring-2 ring-green-400 shadow-md"
                  />
                )}
                <div
                  className={`p-3 rounded-lg max-w-xl ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-black'
                  }`}
                >
                  <p>{msg.message}</p>
                </div>

              </div>
            ))
          )}

          {isTyping && !isLoadingSession && (
            <div className="p-3 rounded-lg w-fit max-w-xl bg-gray-200 text-black self-start">
              <TypingDots />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input - Fixed at bottom */}
        <div className="flex gap-2 p-4 border-t flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message to José Rizal..."
            className="flex-1 border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}