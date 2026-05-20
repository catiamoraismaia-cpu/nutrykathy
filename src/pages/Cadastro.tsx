import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle, Leaf } from 'lucide-react';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!nome.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nome,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setError('Este e-mail já está cadastrado.');
        } else {
          setError('Erro ao criar conta. Tente novamente mais tarde.');
        }
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // 2. Salvar na tabela nutricionistas
        const { error: dbError } = await supabase
          .from('nutricionistas')
          .insert([
            {
              id: authData.user.id,
              nome: nome,
              email: email
            }
          ]);

        if (dbError) {
          console.error("Erro ao salvar nutricionista:", dbError);
          // O usuário foi criado no auth, mas falhou no db. Idealmente devíamos lidar com isso.
        }

        // Se o Supabase estiver configurado para auto-confirmar o email, o login ocorre.
        // O AuthContext irá detectar o login e o useEffect redirecionará para o dashboard.
        // Porém, caso demore, podemos forçar o navigate se a sessão for criada.
        if (authData.session) {
          navigate('/dashboard');
        } else {
          // Caso precise confirmar email, podemos mostrar uma mensagem
          setError('Conta criada! Verifique seu e-mail para confirmar (caso seja exigido pelo sistema), ou faça login.');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card glass-panel" style={{ maxWidth: '480px' }}>
        <div className="brand-header">
          <div className="brand-logo">
            <Leaf size={32} />
          </div>
          <h1 className="brand-title">Nutri Kathy</h1>
          <p className="brand-subtitle">Crie sua conta como nutricionista</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="nome">Nome Completo</label>
            <User className="input-icon" />
            <input
              id="nome"
              type="text"
              className="input-field"
              placeholder="Ex: Dra. Kathy Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="confirmPassword">Confirmar Senha</label>
            <Lock className="input-icon" />
            <input
              id="confirmPassword"
              type="password"
              className="input-field"
              placeholder="Repita sua senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            {isLoading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login" className="link">Faça login</Link>
        </div>
      </div>
    </div>
  );
}
