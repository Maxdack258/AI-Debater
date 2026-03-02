import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Send, Bot, User, Loader2, Trash2 } from 'lucide-react';

export default function NormalChat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [chats, setChats] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef(null);

    // Fetch sidebar chats
    const fetchChats = async () => {
        try {
            const res = await fetch('/api/chats/history', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setChats(data.chats);
            }
        } catch (e) {
            console.error("Failed to load chats");
        }
    };

    // Fetch specific chat details
    const fetchCurrentChat = async (chatId) => {
        try {
            const res = await fetch(`/api/chat/${chatId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setCurrentChat(data);

                // If the last message is from user, AI is thinking. So keep polling
                if (data.history.length > 0 && data.history[data.history.length - 1].role === 'user') {
                    setIsSending(true);
                } else {
                    setIsSending(false);
                }
            }
        } catch (e) {
            console.error("Failed to load current chat");
        }
    };

    useEffect(() => {
        fetchChats();
        if (id) {
            fetchCurrentChat(id);
        } else {
            setCurrentChat(null);
        }
    }, [id, token]);

    // Polling logic
    useEffect(() => {
        let interval;
        if (isSending && id) {
            interval = setInterval(() => {
                fetchCurrentChat(id);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isSending, id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentChat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;
        const messageText = input.trim();
        setInput('');

        try {
            if (!id) {
                // Determine topic (first 30 chars of message)
                const topic = messageText.length > 30 ? messageText.substring(0, 30) + "..." : messageText;

                // Create new chat
                const res = await fetch('/api/chat/start', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic })
                });
                if (!res.ok) throw new Error('Could not start chat');
                const data = await res.json();
                const newChatId = data.chat_id;

                // Send message to new chat
                await fetch(`/api/chat/${newChatId}/message`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messageText })
                });

                navigate(`/chat/${newChatId}`);
            } else {
                // Send message to existing chat

                // Optimistically update UI
                const optimisicChat = { ...currentChat };
                optimisicChat.history = [...(optimisicChat.history || []), { role: 'user', content: messageText }];
                setCurrentChat(optimisicChat);
                setIsSending(true);

                const res = await fetch(`/api/chat/${id}/message`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messageText })
                });
                if (!res.ok) throw new Error('Could not send message');
            }
        } catch (e) {
            alert(e.message);
            setIsSending(false);
        }
    };

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation(); // don't trigger the chat selection
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            const res = await fetch(`/api/chat/${chatId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete chat');

            // Remove from list
            setChats(prev => prev.filter(c => c.id !== chatId));

            // If we deleted the active chat, redirect away
            if (id === chatId) {
                navigate('/chat');
            }
        } catch (err) {
            alert('Error deleting chat');
        }
    };

    return (
        <div className="h-screen pt-16 flex bg-slate-900 text-slate-100 font-inter">
            {/* Sidebar */}
            <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex">
                <div className="p-4">
                    <button
                        onClick={() => navigate('/chat')}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1 mt-2">Recent Chats</div>
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors cursor-pointer group ${id === chat.id ? 'bg-slate-800 text-slate-50' : 'hover:bg-slate-800/50 text-slate-300'}`}
                            onClick={() => navigate(`/chat/${chat.id}`)}
                        >
                            <MessageSquare className={`w-5 h-5 shrink-0 mt-0.5 ${id === chat.id ? 'text-blue-500' : 'text-slate-500'}`} />
                            <div className="truncate text-sm font-medium flex-1">{chat.topic}</div>
                            <button
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ${id === chat.id ? 'opacity-100' : ''}`}
                                title="Delete Chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div className="text-slate-500 text-sm p-4 text-center">No chats yet</div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900 relative">

                {/* Header Navbar Line */}
                <div className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 z-10">
                    <h2 className="font-semibold text-slate-200 truncate">
                        {currentChat ? currentChat.topic : 'New Chat'}
                    </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {!currentChat?.history?.length ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 pt-20">
                                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-100">How can I help you today?</h3>
                                    <p className="text-slate-400 mt-2 max-w-sm">Ask me any question, start a conversation, or just say hello.</p>
                                </div>
                            </div>
                        ) : (
                            currentChat.history.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={idx}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role !== 'user' && (
                                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                    <div className={`px-5 py-3 rounded-2xl max-w-[85%] sm:max-w-xl text-[15px] leading-relaxed ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm shadow-sm'
                                        }`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600">
                                            <User className="w-5 h-5 text-slate-300" />
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}

                        {isSending && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="px-5 py-4 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-sm shadow-sm flex items-center gap-2 text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    <span className="text-sm font-medium">Assistant is thinking...</span>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-10 pb-6 px-4">
                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isSending}
                            placeholder="Type a message..."
                            className="w-full pl-6 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-70 disabled:bg-slate-800/50 text-slate-100 text-[15px] placeholder-slate-500"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isSending}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${input.trim() && !isSending ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md transform hover:scale-105' : 'bg-slate-700 text-slate-500'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                    <div className="text-center mt-3 text-xs text-slate-500">
                        AI-generated content may be inaccurate. Verify important information.
                    </div>
                </div>

            </div>
        </div>
    );
}
