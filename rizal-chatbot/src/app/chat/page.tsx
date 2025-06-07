"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Modal from "react-modal";


import TypingSpinner from "@/src/components/TypingSpinner";
import {
  setupAxiosInterceptors,
  getAuthHeaders,
  clearTokens,
} from "@/lib/axios";
import ChatInput from "./chat_input";
import ChatHeader from "./chat_header";
import ActionButton from "@/src/components/ActionButton";
import { X, Edit2 } from "lucide-react";
import { API_CONFIG } from '@/lib/config';


// Function to format text with markdown and line breaks
const formatBotMessage = (text: string) => {
  // First, handle line breaks for numbered lists and bullet points
  const withLineBreaks = text
    .replace(/(\d+\.\s)/g, '\n$1') // Add line break before numbered lists
    .replace(/([•·-]\s)/g, '\n$1') // Add line break before bullet points
    .replace(/^\n/, '') // Remove leading line break if added
    .trim();

  // Split by line breaks first
  const lines = withLineBreaks.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Process each line for bold and italic formatting
    // Split by **bold** and *italic* patterns
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    
    const formattedLine = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        const boldText = part.slice(2, -2);
        return (
          <strong key={`${lineIndex}-${partIndex}`} className="font-bold">
            {boldText}
          </strong>
        );
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        // Italic text (single asterisk, not double)
        const italicText = part.slice(1, -1);
        return (
          <em key={`${lineIndex}-${partIndex}`} className="italic">
            {italicText}
          </em>
        );
      }
      return part;
    });

    // Return each line with proper line breaks
    return (
      <span key={lineIndex}>
        {formattedLine}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

function typeBotReply(
  fullText: string,
  onUpdate: (typedText: string) => void,
  onComplete: () => void,
) {
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
  id: string;
  sender: "user" | "rizal";
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
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [currentTypingCleanup, setCurrentTypingCleanup] = useState<
    (() => void) | null
  >(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingOriginalText, setEditingOriginalText] = useState<string>("");
  // Track loading/typing states per session
  const [sessionLoadingStates, setSessionLoadingStates] = useState<Record<number, { isTyping: boolean; isFetching: boolean; cleanup?: () => void }>>({});
  const router = useRouter();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle click outside to exit editing mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingMessageId && inputAreaRef.current && !inputAreaRef.current.contains(event.target as Node)) {
        cancelEdit();
      }
    };

    if (editingMessageId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingMessageId]);

  const fetchSessions = async () => {
    try {

      const res = await axios.get(API_CONFIG.ENDPOINTS.SESSIONS, {

        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      router.push("/");
    }
  };

  const fetchSessionMessages = async (sessionId: number) => {
    try {
      const res = await axios.get(API_CONFIG.ENDPOINTS.SESSION_DETAIL(sessionId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Only update if this is still the current session (prevent race conditions)
      setCurrentSession((prevSession) => {
        if (prevSession?.id === sessionId) {
          // Add unique IDs to existing messages if they don't have them
          const messagesWithIds = (res.data.messages || []).map((msg: any, index: number) => ({
            ...msg,
            id: msg.id || `${sessionId}-${index}-${Date.now()}`
          }));
          setMessages(messagesWithIds);
          return res.data;
        }
        return prevSession;
      });
    } catch (err) {
      console.error("Error fetching session messages:", err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const selectSession = (session: ChatSession) => {
    // Save current session's loading state if switching away from one
    if (currentSession) {
      setSessionLoadingStates(prev => ({
        ...prev,
        [currentSession.id]: {
          isTyping,
          isFetching,
          cleanup: currentTypingCleanup || undefined
        }
      }));
    }

    // Clear current state first to prevent carryover
    setIsTyping(false);
    setMessages([]);
    setIsLoadingSession(true);
    setCurrentSession(session);

    // Restore loading state for the selected session
    const sessionState = sessionLoadingStates[session.id];
    if (sessionState) {
      setIsTyping(sessionState.isTyping);
      setIsFetching(sessionState.isFetching);
      setCurrentTypingCleanup(sessionState.cleanup || null);
    }

    // Then fetch the session messages
    fetchSessionMessages(session.id);
  };

  const startNewSession = () => {
    // Save current session's loading state if switching away from one
    if (currentSession) {
      setSessionLoadingStates(prev => ({
        ...prev,
        [currentSession.id]: {
          isTyping,
          isFetching,
          cleanup: currentTypingCleanup || undefined
        }
      }));
    }

    setCurrentSession(null);
    setMessages([]);
    setIsTyping(false);
    setIsFetching(false);
    setCurrentTypingCleanup(null);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      message: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsFetching(true);
    setIsTyping(true);

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
        setSessions((prev) => [newSession, ...prev]);
      } else {
        // Update existing session in the list
        setSessions((prev) =>
          prev.map((session) =>
            session.id === currentSession.id
              ? {
                  ...session,
                  updated_at: new Date().toISOString(),
                  message_count: messages.length + 2,
                }
              : session,
          ),
        );
      }

      // Start typing animation for bot reply
      const fullReply = res.data.response;
      const sessionIdForThisResponse =
        currentSession?.id || res.data.session_id;
      setIsFetching(false);
      setIsTyping(false);

      const emptyBotMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "rizal",
        message: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, emptyBotMessage]);

      const cleanup = typeBotReply(
        fullReply,
        (typed) => {
          // Only update if we're still in the same session
          setCurrentSession((currentSessionState) => {
            if (
              currentSessionState?.id === sessionIdForThisResponse ||
              (!currentSessionState && !sessionIdForThisResponse)
            ) {
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
          setCurrentSession((currentSessionState) => {
            if (
              currentSessionState?.id === sessionIdForThisResponse ||
              (!currentSessionState && !sessionIdForThisResponse)
            ) {
              setIsTyping(false);
              setIsFetching(false);
              // Clear the session loading state
              if (sessionIdForThisResponse) {
                setSessionLoadingStates(prev => {
                  const updated = { ...prev };
                  delete updated[sessionIdForThisResponse];
                  return updated;
                });
              }
            }
            return currentSessionState;
          });
          setCurrentTypingCleanup(null);
        },
      );

      setCurrentTypingCleanup(() => cleanup);
    } catch (err) {
      setIsFetching(false);
      setIsTyping(false);
      console.error("Failed to send message:", err);
    }
  };

  const openDeleteModal = (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSessionToDelete(null);
  };

  const deleteSession = async () => {
    if (!sessionToDelete) return;

    try {

      await axios.delete(API_CONFIG.ENDPOINTS.SESSION_DETAIL(sessionToDelete), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
      
      if (currentSession?.id === sessionToDelete) {

        startNewSession();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    } finally {
      closeDeleteModal();
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/");
  };

  const startEditMessage = (messageId: string, originalText: string) => {
    setEditingMessageId(messageId);
    setEditingOriginalText(originalText);
    setInput(originalText);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingOriginalText("");
    setInput("");
  };

  const sendEditedMessage = async () => {
    if (!input.trim() || !editingMessageId || input === editingOriginalText) return;

    // Cancel any ongoing typing animation
    if (currentTypingCleanup) {
      currentTypingCleanup();
      setCurrentTypingCleanup(null);
    }

    const messageIndex = messages.findIndex(msg => msg.id === editingMessageId);
    if (messageIndex === -1) return;

    // Get the timestamp of the message being edited
    const messageToEdit = messages[messageIndex];
    
    // Remove the original user message and all subsequent messages (including Rizal's response)
    const updatedMessages = messages.slice(0, messageIndex);
    
    // Add the edited message
    const editedMessage: ChatMessage = {
      id: `user-edited-${Date.now()}`,
      sender: "user",
      message: input,
      timestamp: new Date().toISOString(),
    };

    setMessages([...updatedMessages, editedMessage]);
    
    // Clear edit state
    setEditingMessageId(null);
    setEditingOriginalText("");
    setInput("");
    
    // Set states for new response
    setIsFetching(true);
    setIsTyping(true);

    try {
      // First, truncate the session from the backend if we have a current session
      if (currentSession) {
        try {
          await axios.post(
            `http://localhost:8000/api/sessions/${currentSession.id}/truncate/`,
            { from_timestamp: messageToEdit.timestamp },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (truncateErr) {
          console.error("Error truncating session:", truncateErr);
          // Continue anyway - the frontend state is already updated
        }
      }

      const payload: any = { message: input };
      if (currentSession) {
        payload.session_id = currentSession.id;
      }

      const res = await axios.post("http://localhost:8000/api/chat/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update session info
      if (!currentSession) {
        const newSession: ChatSession = {
          id: res.data.session_id,
          title: res.data.session_title || input.slice(0, 50),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 2,
        };
        setCurrentSession(newSession);
        setSessions((prev) => [newSession, ...prev]);
      } else {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === currentSession.id
              ? {
                  ...session,
                  updated_at: new Date().toISOString(),
                  message_count: updatedMessages.length + 2,
                }
              : session,
          ),
        );
      }

      // Start typing animation for bot reply
      const fullReply = res.data.response;
      const sessionIdForThisResponse = currentSession?.id || res.data.session_id;
      setIsFetching(false);
      setIsTyping(false);

      const emptyBotMessage: ChatMessage = {
        id: `bot-edited-${Date.now()}`,
        sender: "rizal",
        message: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, emptyBotMessage]);

      const cleanup = typeBotReply(
        fullReply,
        (typed) => {
          setCurrentSession((currentSessionState) => {
            if (
              currentSessionState?.id === sessionIdForThisResponse ||
              (!currentSessionState && !sessionIdForThisResponse)
            ) {
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
           setCurrentSession((currentSessionState) => {
             if (
               currentSessionState?.id === sessionIdForThisResponse ||
               (!currentSessionState && !sessionIdForThisResponse)
             ) {
               setIsTyping(false);
               setIsFetching(false);
               // Clear the session loading state
               if (sessionIdForThisResponse) {
                 setSessionLoadingStates(prev => {
                   const updated = { ...prev };
                   delete updated[sessionIdForThisResponse];
                   return updated;
                 });
               }
             }
             return currentSessionState;
           });
           setCurrentTypingCleanup(null);
         },
      );

      setCurrentTypingCleanup(() => cleanup);
    } catch (err) {
      setIsFetching(false);
      setIsTyping(false);
      console.error("Failed to send edited message:", err);
    }
  };

  const TypingDots = () => (
    <div
      className="
        flex
        space-x-1
        items-center
      "
    >
      <div
        className="
          w-2 h-2
          bg-gray-500
          rounded-full
          animate-bounce
          [animation-delay:0s]
        "
      ></div>
      <div
        className="
          w-2 h-2
          bg-gray-500
          rounded-full
          animate-bounce
          [animation-delay:0.2s]
        "
      ></div>
      <div
        className="
          w-2 h-2
          bg-gray-500
          rounded-full
          animate-bounce
          [animation-delay:0.4s]
        "
      ></div>
    </div>
  );

  useEffect(() => {
    if (!token) {
      router.push("/");
    } else {
      fetchSessions();
    }
  }, [token]);

  // Add search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSessions(sessions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sessions.filter((session) => {
      const titleMatch = session.title?.toLowerCase().includes(query);
      const lastMessageMatch = session.last_message?.message
        .toLowerCase()
        .includes(query);
      return titleMatch || lastMessageMatch;
    });
    setFilteredSessions(filtered);
  }, [searchQuery, sessions]);

  return (
    <div
      className="
        flex flex-col overflow-hidden
        h-screen
      "
    >
      <ChatHeader
        onNewChat={startNewSession}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div
        className="
          flex flex-1 overflow-hidden
        "
      >
        {/* Sidebar */}
        <div
          className={`
            flex flex-col overflow-hidden z-10
            h-full
            whitespace-nowrap
            bg-[#FEF9EF]
            border-r-2 border-peach
            transition-all
            duration-300 ease-in-out fixed
            sm:relative
            ${isSidebarOpen ? "w-[280px] sm:w-1/4" : "w-0"}
            ${isSidebarOpen ? "p-4" : "p-0"}
          `}
        >
          <div
            className={`
              flex
              mb-4
              transition-opacity
              items-center justify-between ${!isSidebarOpen && "hidden"} duration-300
              ${isSidebarOpen ? "opacity-100" : "opacity-0"}
            `}
          >
            <h2
              className="
                text-brown font-pica text-2xl font-medium
              "
            >
              Chat Sessions
            </h2>
          </div>

          {/* Add search input */}
          <div
            className={`
              mb-4
              transition-opacity
              duration-300
              ${isSidebarOpen ? "opacity-100" : "opacity-0"}
              ${!isSidebarOpen && "hidden"}
            `}
          >
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full
                p-2
                text-brown font-pica
                bg-white
                border border-peach rounded-lg
                transition-all
                focus:outline-none focus:ring-2 focus:ring-red placeholder:text-brown placeholder:opacity-60
              "
            />
          </div>

          <div
            className={`
              overflow-y-auto flex-1
              space-y-2
              transition-opacity
              duration-300
              ${isSidebarOpen ? "opacity-100" : "opacity-0"}
              ${!isSidebarOpen && "hidden"}
            `}
          >
            {/* Current new session */}
            {!currentSession && messages.length === 0 && (
              <div
                className="
                  p-3
                  bg-peach
                  border-l-4 border-red rounded-sm
                "
              >
                <div
                  className="
                    text-xl font-pica font-medium text-brown
                  "
                >
                  New Chat
                </div>
                <div
                  className="
                    font-pica text-md text-brown
                  "
                >
                  Start a conversation with Rizal
                </div>
              </div>
            )}

            {/* Existing sessions */}
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                className={`
                  p-3
                  cursor-pointer
                  rounded group relative
                  ${
                  currentSession?.id === session.id
                  ? "bg-peach border-l-4 border-red"
                  : "bg-white hover:bg-sand"
                  }
                `}
              >
                <div
                  className="
                    flex
                    items-center justify-between
                  "
                >
                  <div
                    className="
                      flex-1
                      min-w-0
                    "
                  >
                    <div
                      className="
                        font-pica font-medium text-md text-brown
                        truncate
                      "
                    >
                      {session.title || "Untitled Chat"}
                    </div>
                    <div
                      className="
                        text-xs text-brown font-medium
                        truncate
                      "
                    >
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => openDeleteModal(session.id, e)}
                    title="Delete session"
                    className="
                      ml-2 p-1
                      text-red
                      opacity-100 cursor-pointer
                      group-hover:opacity-100 hover:text-red-700 rounded
                      sm:opacity-0
                    "
                  >
                    <X
                      className="
                        w-4 h-4
                      "
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sign Out Button */}
          <div
            className={`
              mt-auto pt-4
              transition-opacity
              duration-300
              ${isSidebarOpen ? "opacity-100" : "opacity-0"}
              ${!isSidebarOpen && "hidden"}
            `}
          >
            <ActionButton color="brown" onClick={logout} label="Sign Out" />
          </div>
        </div>

        {/* Main Chat */}
        <div
          className={`
            flex-1 flex flex-col overflow-hidden
            transition-all
            duration-300 ease-in-out
            ${isSidebarOpen ? "sm:ml-0" : "ml-0"}
          `}
        >
          {/* Chat Header */}
          {/* <div
            className="
              flex-shrink-0
              pb-4 p-4
              bg-beige
              border-b-2 border-peach
            "
          >
            <div
              className="
                flex
                items-center justify-between
              "
            >
              <div
                className="
                  "
                  >
                  <h1
                  className="
                  text-2xl font-pica font-medium text-brown
                "
                >
                  {currentSession
                    ? currentSession.title
                    : "New Chat with José Rizal"}
                </h1>
                <p
                  className="
                    font-pica text-lg text-brown
                  "
                >
                  {currentSession
                    ? `Started ${new Date(currentSession.created_at).toLocaleDateString()}`
                    : "Start a new conversation"}
                </p>
              </div>
              <button
                onClick={logout}
                className="
                  px-4 py-2
                  text-white
                  bg-red-600
                  rounded hover:bg-red-700
                "
              >
                Logout
              </button>
            </div>
          </div> */}

          {/* Messages - Takes up all available space */}
          <div
            className="
              flex-1 overflow-y-auto
              p-4 space-y-4
              bg-gradient-to-b from-[#FDF3DF] via-[#FDF3DF] to-[#F2D3B7]
            "
          >
            {isLoadingSession ? (
              <div
                className="
                  py-8
                  text-center text-gray-500
                "
              >
                <div
                  className="
                    h-8 w-8
                    mx-auto mb-4
                    rounded-full border-b-2 border-blue-600
                    animate-spin
                  "
                ></div>
                <p>Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div
                className="
                  py-8
                  text-center text-brown
                "
              >
                <h3
                  className="
                    mb-2
                    font-pica text-2xl font-semibold
                    n
                  "
                >
                  Welcome to RizalGPT
                </h3>
                <p
                  className="
                    font-pica text-lg
                  "
                >
                  Start a conversation with the Filipino national hero. Ask him
                  about his life, writings, or thoughts on reform and education.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`
                    flex
                    items-start gap-3
                    ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}
                  `}
                >
                  {msg.sender === "rizal" && (
                    <img
                      src="/images/rizal.png"
                      alt="José Rizal"
                      className="
                        w-8 h-8
                        rounded-full
                      "
                    />
                  )}
                  <div
                    className={`
                      w-fit max-w-xl
                      p-3
                      font-pica
                      rounded-lg
                      relative
                      group
                      ${
                      msg.sender === "user"
                      ? "bg-[#FAD02B] text-brown"
                      : "bg-sand text-black"
                      }
                    `}
                  >
                    <p>
                      {msg.sender === "rizal" 
                        ? formatBotMessage(msg.message) 
                        : msg.message
                      }
                    </p>
                    {msg.sender === "user" && !isTyping && !editingMessageId && (
                      <button
                        onClick={() => startEditMessage(msg.id, msg.message)}
                        className="
                          absolute
                          -bottom-6 -right-2 transform -translate-x-1/2
                          p-1
                          bg-brown text-white
                          rounded-full
                          opacity-0 group-hover:opacity-100
                          transition-all duration-200
                          hover:bg-brown/80
                          flex items-center justify-center
                        "
                        title="Edit message"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {isTyping && !isLoadingSession && (
              <div
                className="
                  flex
                  items-start gap-3
                "
              >
                <img
                  src="/images/rizal.png"
                  alt="José Rizal"
                  className="
                    w-8 h-8
                    rounded-full
                  "
                />
                <div
                  className="
                    w-fit max-w-xl
                    p-3
                    bg-sand
                    rounded-lg
                  "
                >
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input - Fixed at bottom */}
          <div
            ref={inputAreaRef}
            className="
              p-4
            "
          >
            {/* Editing indicator */}
            {editingMessageId && (
              <div
                className="
                  mb-3
                  px-3 py-2
                  bg-white
                  rounded-lg
                  border-l-4 border-[#FAD02B]
                  shadow-sm
                  flex items-center gap-2
                "
              >
                <Edit2 size={16} className="text-brown" />
                <span
                  className="
                    font-pica text-brown text-m font-medium
                  "
                >
                  Editing chat
                </span>
              </div>
            )}

            <ChatInput
              placeholder={editingMessageId ? "Edit your message..." : "Type your message to José Rizal..."}
              value={input}
              onChange={(value) => setInput(value)}
              onKeyDown={(e) => e.key === "Enter" && (editingMessageId ? sendEditedMessage() : sendMessage())}
              disabled={editingMessageId ? (!input.trim() || input === editingOriginalText || isTyping) : (!input.trim() || isTyping)}
              onClick={editingMessageId ? sendEditedMessage : sendMessage}
              isEditing={!!editingMessageId}
              onCancel={cancelEdit}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={closeDeleteModal}
        overlayClassName="
          fixed inset-0 bg-black/50 
          flex items-center justify-center
          z-50
        "
        className="
          z-50
          w-96
          p-5
          bg-white
          rounded-lg
          shadow-xl
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        "
      >
        <div
          className="
            text-center
          "
        >
          <h3
            className="
              mb-4
              text-2xl font-pica font-medium text-brown
            "
          >
            Delete Chat Session
          </h3>
          <p
            className="
              mb-6
              font-pica text-gray-600
            "
          >
            Are you sure you want to delete this chat session? This action
            cannot be undone.
          </p>
          <div
            className="
              flex
              space-x-4
              font-pica
              justify-between
            "
          >
            <button
              onClick={closeDeleteModal}
              className="
                px-4 py-2
                text-gray-700
                bg-gray-200
                transition-colors
                rounded hover:bg-gray-300
              "
            >
              Cancel
            </button>
            <button
              onClick={deleteSession}
              className="
                px-4 py-2
                text-white
                bg-red
                transition-colors
                rounded hover:bg-red-700
              "
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
