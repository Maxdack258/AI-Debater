import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ChevronLeft, User, MessageSquare, Activity, Calendar, FileText } from 'lucide-react';

export default function AdminUserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'debates'
    const [selectedItem, setSelectedItem] = useState(null); // Full JSON of selected chat/debate

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const res = await fetch(`/api/admin/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to load user details');
                const data = await res.json();
                setUser(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUserDetails();
    }, [id, token]);

    if (loading) return <div className="min-h-screen pt-24 text-center text-slate-500">Loading user details...</div>;
    if (error) return <div className="min-h-screen pt-24 text-center text-red-500">{error}</div>;
    if (!user) return <div className="min-h-screen pt-24 text-center text-slate-500">User not found</div>;

    const items = activeTab === 'chats' ? user.chats : user.debates;

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 font-poppins flex items-center gap-3">
                            <User className="w-8 h-8 text-blue-600" />
                            {user.username} <span className="text-lg text-slate-400 font-normal">#{user.id}</span>
                        </h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-4">
                            <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                            {user.is_admin ? (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Admin</span>
                            ) : user.is_limited ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">Limited</span>
                            ) : null}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<MessageSquare />} title="Debates" value={user.debates.length} />
                    <StatCard icon={<Activity />} title="Chats" value={user.chats.length} />
                    <StatCard icon={<FileText />} title="Requests" value={user.requests_sent} />
                    <StatCard icon={<Calendar />} title="Tokens Used" value={user.tokens_used.toLocaleString()} />
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[600px]">

                    {/* Sidebar / List */}
                    <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
                        <div className="flex border-b border-slate-200">
                            <button
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'chats' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                onClick={() => { setActiveTab('chats'); setSelectedItem(null); }}
                            >
                                Chats ({user.chats.length})
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'debates' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                onClick={() => { setActiveTab('debates'); setSelectedItem(null); }}
                            >
                                Debates ({user.debates.length})
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`p-3 rounded-xl cursor-pointer transition-colors border ${selectedItem?.id === item.id ? 'bg-white border-blue-200 shadow-sm' : 'border-transparent hover:bg-slate-100'}`}
                                >
                                    <div className="font-medium text-slate-800 truncate text-sm">{item.topic}</div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</div>
                                        <div className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.status}</div>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="text-center p-6 text-sm text-slate-400">No {activeTab} found.</div>
                            )}
                        </div>
                    </div>

                    {/* Detail View */}
                    <div className="flex-1 bg-white p-6 overflow-y-auto">
                        {!selectedItem ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <FileText className="w-12 h-12 mb-3 opacity-20" />
                                <p>Select an item to view details</p>
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{selectedItem.topic}</h3>
                                    <div className="text-sm text-slate-500 font-mono mt-1 w-full bg-slate-50 p-2 rounded border border-slate-100 break-all">ID: {selectedItem.id}</div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Fetch Status & Raw Data</h4>
                                    <p className="text-xs text-slate-500 mb-4">
                                        For detailed payload analysis, you can view the raw JSON below. Note: history content is currently stored within the individual item fetch routes, so the summary lists here only show metadata.
                                    </p>
                                    <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                                        {JSON.stringify(selectedItem, null, 2)}
                                    </pre>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon, title, value }) {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                {icon}
            </div>
            <div>
                <div className="text-xl font-bold text-slate-800">{value}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{title}</div>
            </div>
        </div>
    );
}
