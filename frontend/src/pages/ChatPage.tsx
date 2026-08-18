/**
 * CHEAT SHEET FOR PRESENTATION - `ChatPage.tsx`
 * ===========================================================
 * WHAT THIS FILE DOES:
 * This handles the WhatsApp-style AI Chat interface where the user can talk to their personal nutrition assistant.
 * 
 * HOW IT WORKS:
 * 1. History Fetching: On load, it fetches the previous chat history from the database so the conversation persists across sessions.
 * 2. Sending Messages (`handleSend`): When the user types a question, we add their message to the screen immediately to make it feel fast, and then we send a POST request to `/ai/chat`.
 * 3. Waiting for AI: While the backend is thinking (running the RAG logic), we show a "Typing..." indicator.
 * 4. Rendering: We use `react-markdown` so the AI's responses can be nicely formatted with bold text and bullet points.
 * ===========================================================
 */
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: "Hi there! I'm Smarteal. I can help you with personalized nutrition advice based on your goals and logged meals. What's on your mind?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchHistory = async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;
      
      try {
        const res = await api.get(`/ai/chat/history/${userId}`);
        const history = res.data;
        if (history && history.length > 0) {
          const formattedHistory = history.map((msg: { id: string, sender: string, message: string }) => ({
            id: msg.id,
            role: msg.sender === 'user' ? 'user' : 'ai',
            content: msg.message
          }));
          setMessages(formattedHistory);
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post(`/ai/chat?query=${encodeURIComponent(userMessage)}&user_id=${userId}`);
      setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', role: 'ai', content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString() + 'err', role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-surface-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-all border border-transparent hover:border-surface-200"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                  <Bot size={18} />
                </div>
                <div>
                  <h1 className="text-base font-bold text-surface-900 leading-tight">Smarteal AI</h1>
                  <p className="text-xs text-primary-600 font-medium">Online</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-full text-xs font-bold text-primary-700 transition-colors shadow-sm"
            >
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-surface-200 text-surface-600' : 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] sm:max-w-[75%] shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary-600 text-white rounded-tr-sm' 
                : 'bg-white border border-surface-200 text-surface-800 rounded-tl-sm'
            }`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-md shadow-primary-500/20">
              <Bot size={20} />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-white border border-surface-200 rounded-tl-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-surface-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-surface-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-surface-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="bg-white border-t border-surface-200 p-4 shrink-0">
        <div className="max-w-4xl mx-auto relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your diet, macros, or recipes..."
            className="w-full bg-surface-100 border border-transparent focus:border-primary-500 focus:bg-white text-surface-900 rounded-full pl-5 pr-14 py-4 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white rounded-full flex items-center justify-center transition-all"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

