import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function History() {
    const { token, logout } = useAuth();
    const [debates, setDebates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/debates/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) { logout(); return; }

            const data = await res.json();
            setDebates(data.debates || []);
        } catch (err) {
            setError('Failed to load debates');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 bg-[#0a0a0f] text-slate-200">
            <div className="max-w-4xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-center"
                >
                    <h1 className="text-3xl font-poppins font-bold text-white mb-2">My Debates</h1>
                    <p className="text-slate-400">Review your past debate sessions</p>
                </motion.div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">Loading history...</div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400">{error}</div>
                ) : debates.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 border border-white/5 rounded-2xl bg-white/5">
                        No debates found. Go to the Arena to start your first one!
                    </div>
                ) : (
                    <motion.div
                        className="flex flex-col gap-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.1 } }
                        }}
                    >
                        {debates.map((d) => (
                            <motion.div
                                key={d.id}
                                variants={{
                                    hidden: { opacity: 0, x: -20 },
                                    visible: { opacity: 1, x: 0 }
                                }}
                            >
                                <Link
                                    to={`/debate/${d.id}`}
                                    className="flex items-center justify-between p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer group"
                                >
                                    <div className="pr-6">
                                        <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-blue-400 transition-colors">
                                            {d.topic}
                                        </h3>
                                        <div className="text-sm text-slate-500 font-mono">
                                            {new Date(d.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        {d.status === 'completed' ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold uppercase tracking-wider rounded-full border border-green-500/20">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Completed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider rounded-full border border-blue-500/20">
                                                <Clock className="w-3.5 h-3.5" />
                                                Running
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
