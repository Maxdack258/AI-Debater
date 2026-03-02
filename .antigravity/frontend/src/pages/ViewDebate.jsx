import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, CheckCircle } from 'lucide-react';
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

export default function ViewDebate() {
    const { id } = useParams();
    const { token, logout } = useAuth();
    const [debateData, setDebateData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openRounds, setOpenRounds] = useState(new Set());

    useEffect(() => {
        fetchDebate();
    }, [id]);

    const fetchDebate = async () => {
        try {
            const res = await fetch(`/api/debate/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) { logout(); return; }
            if (!res.ok) throw new Error('Debate not found');

            const data = await res.json();
            setDebateData(data);

            // Auto-open first round
            if (data.rounds && data.rounds.length > 0) {
                setOpenRounds(new Set([1]));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    if (loading) {
        return <div className="min-h-screen pt-32 bg-[#0a0a0f] text-center text-slate-500 animate-pulse">Loading debate...</div>;
    }
    if (error) {
        return <div className="min-h-screen pt-32 bg-[#0a0a0f] text-center text-red-500">{error}</div>;
    }

    const scores = calculateScores();

    return (
        <div className="min-h-screen pt-24 bg-[#0a0a0f] text-slate-200">
            <div className="max-w-5xl mx-auto px-6 pb-20">

                {/* Header */}
                <div className="mb-10 animate-fade-in-down">
                    <Link to="/history" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to History
                    </Link>
                    <h1 className="text-3xl font-poppins font-bold text-white mb-3">{debateData.topic}</h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
                        {new Date(debateData.created_at || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>

                {/* Scoreboard */}
                <div className="grid grid-cols-3 gap-4 lg:gap-8 max-w-3xl mx-auto mb-12 animate-fade-in-up md:animate-delay-100">
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
                <div className="space-y-4">
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
                </div>

            </div>
        </div>
    );
}
