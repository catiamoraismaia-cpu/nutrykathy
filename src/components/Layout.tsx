import { useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Leaf, LayoutDashboard, Users, User } from 'lucide-react';

export default function Layout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!loading && !session) {
      navigate('/login');
    }
  }, [session, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-primary-dark)'
      }}>
        <div className="skeleton-pulse" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!session) return null;

  // Verificar qual link do menu lateral está ativo
  const isDashboardActive = location.pathname === '/dashboard';
  const isPacientesActive = location.pathname.startsWith('/pacientes');
  const isPerfilActive = location.pathname === '/perfil';

  return (
    <div className="dashboard-container">
      {/* Menu Lateral Fixo Compartilhado */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Leaf size={24} />
          <span className="sidebar-logo-text">Nutry Kathy</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link 
            to="/dashboard" 
            className={`sidebar-link ${isDashboardActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link 
            to="/pacientes" 
            className={`sidebar-link ${isPacientesActive ? 'active' : ''}`}
          >
            <Users size={20} />
            Pacientes
          </Link>
          <Link 
            to="/perfil" 
            className={`sidebar-link ${isPerfilActive ? 'active' : ''}`}
          >
            <User size={20} />
            Meu Perfil
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal Renderizado Dinamicamente */}
      <Outlet />
    </div>
  );
}
