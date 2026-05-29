import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Award, FileSignature, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PerfilNutricionista() {
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [crm, setCrm] = useState('');
  const [especialidades, setEspecialidades] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function carregarPerfil() {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from('nutricionistas')
          .select('id, nome, email, crm, especialidades')
          .eq('id', userId)
          .single();

        if (dbError) {
          throw dbError;
        }

        if (data) {
          setNome(data.nome || '');
          setEmail(data.email || '');
          setCrm(data.crm || '');
          setEspecialidades(data.especialidades || '');
        }
      } catch (err) {
        console.error('Erro ao carregar perfil da nutricionista:', err);
        setError('Não foi possível carregar as informações do perfil.');
      } finally {
        setIsLoading(false);
      }
    }

    carregarPerfil();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccessMessage(null);

    if (!nome.trim()) {
      setError('O nome não pode estar vazio.');
      return;
    }

    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('nutricionistas')
        .update({
          nome: nome.trim(),
          crm: crm.trim() || null,
          especialidades: specialtiesFormat(especialidades)
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Atualizar também o user_metadata no Auth do Supabase para manter consistência
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { full_name: nome.trim() }
      });

      if (authUpdateError) {
        console.warn('Erro ao atualizar metadata do Auth:', authUpdateError);
      }

      setSuccessMessage('Perfil atualizado com sucesso!');
      
      // Limpa mensagem de sucesso depois de 4 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);

    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError('Erro ao salvar as informações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Trata a formatação das especialidades
  const specialtiesFormat = (value: string) => {
    return value.trim() || null;
  };

  if (isLoading) {
    return (
      <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="spin-icon" size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--color-text-light)' }}>Carregando dados do perfil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      {/* Cabeçalho da página */}
      <header className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>Meu Perfil</h1>
          <p>Gerencie suas informações profissionais e de acesso ao consultório.</p>
        </div>
      </header>

      {/* Alertas */}
      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="success-message" style={{ 
          marginBottom: '1.5rem', 
          padding: '0.85rem 1.25rem', 
          backgroundColor: 'rgba(16, 185, 129, 0.1)', 
          border: '1px solid #10b981', 
          borderRadius: 'var(--radius-md)',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Card do Perfil */}
      <div className="list-card glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-primary-light)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: 'var(--color-primary-dark)',
            fontSize: '1.75rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.15)'
          }}>
            {nome ? nome.charAt(0).toUpperCase() : 'N'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>{nome || 'Nutricionista'}</h2>
            <p style={{ color: 'var(--color-text-light)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              {crm ? `Registro: ${crm}` : 'Nenhum registro de CRM/CRN informado'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '1.5rem' }}>
          {/* Campo Nome */}
          <div className="form-group form-col-span-2">
            <label className="form-label required" htmlFor="nome">Nome Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
              <input
                id="nome"
                type="text"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Ex: Dra. Kathy Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Campo E-mail (Apenas Leitura) */}
          <div className="form-group form-col-span-2">
            <label className="form-label" htmlFor="email">E-mail de Acesso (Não alterável)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '40px', backgroundColor: 'var(--color-background)', cursor: 'not-allowed', opacity: 0.8 }}
                value={email}
                disabled
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem', display: 'block' }}>
              O e-mail é utilizado para login e não pode ser alterado no momento.
            </span>
          </div>

          {/* Campo CRM / CRN */}
          <div className="form-group form-col-span-2">
            <label className="form-label" htmlFor="crm">Registro Profissional (CRM / CRN)</label>
            <div style={{ position: 'relative' }}>
              <FileSignature size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
              <input
                id="crm"
                type="text"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Ex: CRN-4 260527"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
              />
            </div>
          </div>

          {/* Campo Especialidades */}
          <div className="form-group form-col-span-2">
            <label className="form-label" htmlFor="especialidades">Especialidades</label>
            <div style={{ position: 'relative' }}>
              <Award size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--color-text-light)' }} />
              <textarea
                id="especialidades"
                className="form-input"
                style={{ paddingLeft: '40px', minHeight: '80px', paddingTop: '10px' }}
                placeholder="Ex: Nutrição Esportiva, Emagrecimento, Reeducação Alimentar..."
                value={especialidades}
                onChange={(e) => setEspecialidades(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem', display: 'block' }}>
              Insira suas especialidades profissionais separadas por vírgula.
            </span>
          </div>

          {/* Botão de Enviar */}
          <div className="form-col-span-2" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn-action"
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="spin-icon" size={18} />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Perfil
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
