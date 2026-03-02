import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Arena from './pages/Arena';
import History from './pages/History';
import ViewDebate from './pages/ViewDebate';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDetail from './pages/AdminUserDetail';
import NormalChat from './pages/NormalChat';

function App() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-grow">
                <Routes>
                    <Route path="/" element={isAuthenticated ? <Navigate to="/arena" /> : <Home />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/arena" /> : <Auth isLogin={true} />} />
                    <Route path="/signup" element={isAuthenticated ? <Navigate to="/arena" /> : <Auth isLogin={false} />} />

                    {/* Protected Routes */}
                    <Route path="/arena" element={isAuthenticated ? <Arena /> : <Navigate to="/login" />} />
                    <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/login" />} />
                    <Route path="/debate/:id" element={isAuthenticated ? <ViewDebate /> : <Navigate to="/login" />} />

                    <Route path="/admin" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" />} />
                    <Route path="/admin/users/:id" element={isAuthenticated ? <AdminUserDetail /> : <Navigate to="/login" />} />
                    <Route path="/chat" element={isAuthenticated ? <NormalChat /> : <Navigate to="/login" />} />
                    <Route path="/chat/:id" element={isAuthenticated ? <NormalChat /> : <Navigate to="/login" />} />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
