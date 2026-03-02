import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scale } from 'lucide-react';

export default function Navbar() {
    const { isAuthenticated, username, isAdmin, logout } = useAuth();
    const location = useLocation();
    const isDarkPage = ['/arena', '/history', '/chat'].includes(location.pathname) || location.pathname.startsWith('/debate/') || location.pathname.startsWith('/chat/');

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 transition-colors duration-300 ${isDarkPage
            ? 'bg-[#0a0a0f]/85 backdrop-blur-md border-b border-white/10'
            : 'bg-white/85 backdrop-blur-md border-b border-blue-900/10'
            }`}>
            <div className="max-w-6xl mx-auto flex items-center justify-between">

                {/* Brand */}
                <Link to="/" className={`flex items-center gap-3 font-poppins font-bold text-lg ${isDarkPage ? 'text-white' : 'text-blue-900'}`}>
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Scale className="text-white w-5 h-5" />
                    </div>
                    <span>AI Debater</span>
                </Link>

                {/* Links */}
                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <>
                            <Link to="/arena" className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkPage ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}>
                                Arena
                            </Link>
                            <Link to="/history" className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkPage ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}>
                                My Debates
                            </Link>
                            <Link to="/chat" className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkPage ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}>
                                Chat
                            </Link>
                            {isAdmin && (
                                <Link to="/admin" className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors ${isDarkPage ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/20' : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                                    }`}>
                                    Admin
                                </Link>
                            )}
                            <span className={`text-sm px-2 ${isDarkPage ? 'text-slate-400' : 'text-slate-400'}`}>
                                Hi, {username}
                            </span>
                            <button
                                onClick={logout}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                Log Out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
                                Sign In
                            </Link>
                            <Link to="/signup" className="bg-gradient-to-br from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

            </div>
        </nav>
    );
}
