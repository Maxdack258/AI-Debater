import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const ArgumentCard = ({ side, text }) => {
    const colors = {
        Left: 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10',
        Neutral: 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-purple-500/10',
        Right: 'bg-sky-500/10 border-sky-500/20 text-sky-400 shadow-sky-500/10'
    };

    return (
        <div className={`p-5 rounded-xl border ${colors[side]} shadow-lg transition-all hover:bg-white/5`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${colors[side].includes('rose') ? 'bg-rose-500' : colors[side].includes('purple') ? 'bg-purple-500' : 'bg-sky-500'} shadow-[0_0_8px_currentColor]`} />
                <span className="text-xs font-bold uppercase tracking-wider">{side}</span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {text || ''}
                </ReactMarkdown>
            </div>
        </div>
    );
};

const RoundNode = ({ round, isOpen, onToggle }) => {
    const winnerColors = {
        Left: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
        Neutral: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        Right: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
        Tie: 'text-slate-400 border-slate-500/30 bg-slate-500/10'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className="bg-[#111118]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mb-6"
        >
            <div
                onClick={onToggle}
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-semibold text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        R{round.round_num}
                    </span>
                    <span className="font-semibold text-white">Round {round.round_num}</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${winnerColors[round.winner]}`}>
                        {round.winner === 'Tie' ? 'Tie' : `${round.winner} Wins`}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-6 pb-6"
                    >
                        <div className="pt-2 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            <ArgumentCard side="Left" text={round.responses.Left} />
                            <ArgumentCard side="Neutral" text={round.responses.Neutral} />
                            <ArgumentCard side="Right" text={round.responses.Right} />
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex gap-4">
                            <div className="shrink-0 mt-0.5">
                                <CheckCircle className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-1">Judge's Verdict</h4>
                                <div className="text-sm text-slate-300 leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                        {round.judge_decision || ''}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function Arena() {
    const { token, logout } = useAuth();
    const [topic, setTopic] = useState('');
    const [debateId, setDebateId] = useState(null);
    const [debateData, setDebateData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openRounds, setOpenRounds] = useState(new Set());

    const pollingRef = useRef(null);

    const startDebate = async (e) => {
        e?.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setDebateId(null);
        setDebateData(null);
        setOpenRounds(new Set());

        try {
            const res = await fetch('/api/debate/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ topic: topic.trim() })
            });

            if (res.status === 401) { logout(); return; }

            const data = await res.json();
            setDebateId(data.debate_id);
            setDebateData({ status: 'running', rounds: [] });

            startPolling(data.debate_id);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const startPolling = (id) => {
        if (pollingRef.current) clearInterval(pollingRef.current);

        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/debate/${id}`);
                const data = await res.json();

                setDebateData(data);

                // Auto-open newest round if none are currently forced closed
                if (data.rounds.length > 0) {
                    setOpenRounds(prev => {
                        const newSet = new Set(prev);
                        newSet.add(data.rounds[data.rounds.length - 1].round_num);
                        return newSet;
                    });
                }

                if (data.status === 'completed') {
                    clearInterval(pollingRef.current);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const toggleRound = (num) => {
        setOpenRounds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(num)) newSet.delete(num);
            else newSet.add(num);
            return newSet;
        });
    };

    const calculateScores = () => {
        const scores = { Left: 0, Neutral: 0, Right: 0 };
        if (!debateData?.rounds) return scores;
        debateData.rounds.forEach(r => {
            if (scores[r.winner] !== undefined) scores[r.winner]++;
        });
        return scores;
    };

    const scores = calculateScores();
    const isRunning = debateData?.status === 'running';

    return (
        <div className="min-h-screen pt-24 bg-[#0a0a0f] text-slate-200">

            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <motion.div
                    animate={{ opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ opacity: [0.1, 0.15, 0.1] }}
                    transition={{ duration: 10, repeat: Infinity, delay: 2 }}
                    className="absolute bottom-[20%] right-[20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"
                />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 pb-20">

                {/* Header & Input */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-poppins font-bold text-white mb-3">Debate Arena</h1>
                    <p className="text-slate-400">Enter any topic. Watch the AI argue.</p>
                </div>

                <form onSubmit={startDebate} className="max-w-2xl mx-auto mb-12">
                    <div className="glass-dark p-2 rounded-2xl flex flex-col sm:flex-row gap-2 transition-all focus-within:border-blue-500/50 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Should AI be heavily regulated by governments?"
                            className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-slate-500 outline-none"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !topic.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white font-semibold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0"
                        >
                            {loading ? (
                                <>
                                    <Zap className="w-5 h-5 animate-pulse" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    Debate
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Debate Content */}
                {debateData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

                        {/* Status */}
                        <div className="flex justify-center">
                            <div className="glass-dark px-6 py-2.5 rounded-full inline-flex items-center gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`} />
                                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    {isRunning ? (
                                        <>Round <span className="font-mono font-bold text-white">{debateData.rounds?.length + 1}</span> of 10 propagating...</>
                                    ) : (
                                        'Debate Synthesized'
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Scoreboard */}
                        <div className="grid grid-cols-3 gap-4 lg:gap-8 max-w-3xl mx-auto">
                            {[
                                { label: 'Left', score: scores.Left, color: 'text-rose-400', border: 'border-t-rose-500' },
                                { label: 'Neutral', score: scores.Neutral, color: 'text-purple-400', border: 'border-t-purple-500' },
                                { label: 'Right', score: scores.Right, color: 'text-sky-400', border: 'border-t-sky-500' }
                            ].map((s) => (
                                <div key={s.label} className={`glass-dark p-6 rounded-2xl text-center border-t-2 ${s.border}`}>
                                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{s.label}</div>
                                    <div className={`text-4xl lg:text-5xl font-mono font-bold ${s.color}`}>{s.score}</div>
                                </div>
                            ))}
                        </div>

                        {/* Rounds List */}
                        <div className="mt-12 space-y-4">
                            <AnimatePresence>
                                {debateData.rounds?.map((round) => (
                                    <RoundNode
                                        key={round.round_num}
                                        round={round}
                                        isOpen={openRounds.has(round.round_num)}
                                        onToggle={() => toggleRound(round.round_num)}
                                    />
                                ))}
                            </AnimatePresence>

                            {isRunning && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-dark rounded-2xl p-8 flex flex-col gap-4 border-dashed border-white/10">
                                    <div className="h-4 bg-white/5 rounded-full w-3/4 animate-pulse" />
                                    <div className="h-4 bg-white/5 rounded-full w-1/2 animate-pulse animation-delay-200" />
                                    <div className="h-4 bg-white/5 rounded-full w-2/3 animate-pulse animation-delay-400" />
                                </motion.div>
                            )}
                        </div>

                    </motion.div>
                )}
            </div>
        </div>
    );
}
