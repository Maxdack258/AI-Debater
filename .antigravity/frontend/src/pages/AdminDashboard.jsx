import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Activity, MessageSquare, Shield, Trash2, Key, AlertTriangle, Eye } from 'lucide-react';

export default function AdminDashboard() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!usersRes.ok || !statsRes.ok) throw new Error('Failed to fetch admin data');

            const usersData = await usersRes.json();
            const statsData = await statsRes.json();

            setUsers(usersData.users);
            setStats(statsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleLimit = async (userId) => {
        if (!confirm('Toggle limit status for this user?')) return;
        try {
            await fetch(`/api/admin/users/${userId}/limit`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (e) {
            alert('Failed to limit user');
        }
    };

    const handleDelete = async (userId) => {
        if (!confirm('Are you sure you want to permanently delete this account?')) return;
        try {
            await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (e) {
            alert('Failed to delete user');
        }
    };

    const handleChangePassword = async (userId) => {
        const newPassword = prompt('Enter new password for the user (min 6 characters):');
        if (!newPassword || newPassword.length < 6) {
            if (newPassword !== null) alert('Password must be at least 6 characters.');
            return;
        }
        try {
            await fetch(`/api/admin/users/${userId}/password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_password: newPassword })
            });
            alert('Password changed successfully.');
        } catch (e) {
            alert('Failed to change password');
        }
    };

    if (loading) return <div className="min-h-screen pt-24 text-center text-slate-500">Loading admin panel...</div>;
    if (error) return <div className="min-h-screen pt-24 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 font-poppins flex items-center gap-3">
                            <Shield className="w-8 h-8 text-purple-600" />
                            Admin Dashboard
                        </h1>
                        <p className="text-slate-500 mt-1">Platform overview and user management</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={<Users />} title="Total Users" value={stats.total_users || 0} color="blue" />
                    <StatCard icon={<MessageSquare />} title="Total Debates" value={stats.total_debates || 0} color="indigo" />
                    <StatCard icon={<Activity />} title="Total Chats" value={stats.total_chats || 0} color="green" />
                    <StatCard icon={<AlertTriangle />} title="Tokens Used" value={(stats.total_tokens || 0).toLocaleString()} color="orange" />
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">ID / Username</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Activity</th>
                                    <th className="px-6 py-4">Usage Tracker</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{u.username}</div>
                                            <div className="text-xs text-slate-400">ID: {u.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.is_admin ? (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">Admin</span>
                                            ) : u.is_limited ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-semibold">Limited</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">Active</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                <div>Debates: {u.total_debates}</div>
                                                <div>Chats: {u.total_chats}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium">
                                            <div>Tokens: {u.tokens_used.toLocaleString()}</div>
                                            <div>Requests: {u.requests_sent}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => navigate(`/admin/users/${u.id}`)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {!u.is_admin && (
                                                <>
                                                    <button onClick={() => handleLimit(u.id)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Toggle Limit">
                                                        <AlertTriangle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleChangePassword(u.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Change Password">
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Account">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon, title, value, color }) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-100',
        indigo: 'text-indigo-600 bg-indigo-100',
        green: 'text-green-600 bg-green-100',
        orange: 'text-orange-600 bg-orange-100',
    };
    return (
        <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-800">{value}</div>
                <div className="text-sm text-slate-500 font-medium">{title}</div>
            </div>
        </motion.div>
    );
}
