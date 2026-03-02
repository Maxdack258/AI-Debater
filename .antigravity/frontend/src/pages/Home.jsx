import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, Zap, ShieldCheck } from 'lucide-react';

export default function Home() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen pt-20 overflow-hidden relative bg-white">
            {/* Abstract bg elements */}
            <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-40 -left-10 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

            <div className="max-w-6xl mx-auto px-6 pt-24 pb-32 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-8 border border-blue-100">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        AI-Powered Debate Engine
                    </div>

                    <h1 className="text-5xl md:text-7xl font-poppins font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                        Watch AI Argue <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
                            Every Perspective
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-10 leading-relaxed">
                        Three AI agents debate any topic in real-time. Left, Right, and Neutral — evaluated by an impartial judge. You pick the topic. They do the fighting.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {isAuthenticated ? (
                            <Link to="/arena" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-blue-500/20 hover:-translate-y-1">
                                Enter the Arena
                            </Link>
                        ) : (
                            <>
                                <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-blue-500/20 hover:-translate-y-1">
                                    Start Free
                                </Link>
                                <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all hover:-translate-y-1">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className="mt-32 grid md:grid-cols-3 gap-8 text-left"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.2 } }
                    }}
                >
                    {[
                        {
                            icon: <Scale className="w-6 h-6 text-blue-600" />,
                            title: "Impartial Judging",
                            desc: "A dedicated AI judge scores arguments based on logic, evidence, and persuasiveness—not political leaning."
                        },
                        {
                            icon: <Zap className="w-6 h-6 text-purple-600" />,
                            title: "Real-time Clashes",
                            desc: "Watch 10 thrilling rounds unfold dynamically as agents respond directly to each other's points."
                        },
                        {
                            icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
                            title: "Save History",
                            desc: "Create an account to save your favorite debates and return to read them anytime."
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            variants={{
                                hidden: { opacity: 0, y: 30 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                            }}
                            className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3 font-poppins">{feature.title}</h3>
                            <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
