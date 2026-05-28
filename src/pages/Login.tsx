import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle, Leaf } from 'lucide-react';
import FruitLoader from '../components/FruitLoader';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('E-mail ou senha incorretos.');
        } else {
          setError('Ocorreu um erro ao fazer login. Tente novamente.');
        }
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {isLoading && <FruitLoader mensagem="Entrando no consultório..." />}
      <div className="auth-card glass-panel">
        <div className="brand-header">
          <div className="brand-logo">
            <Leaf size={32} />
          </div>
          <h1 className="brand-title">Nutri Kathy</h1>
          <p className="brand-subtitle">Acesse sua conta para continuar</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">E-mail</label>
            <Mail className="input-icon" />
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Senha</label>
            <Lock className="input-icon" />
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer">
          Não tem conta? <Link to="/cadastro" className="link">Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
}
