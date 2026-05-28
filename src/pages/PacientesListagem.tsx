import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Search, Calendar, ChevronRight, Users, Dumbbell, Apple, Heart, Activity, Target } from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  objetivos: string[] | null;
  ultimaConsulta: string | null;
}

export default function PacientesListagem() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [filtro, setFiltro] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const carregarPacientes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Buscar pacientes
      const { data: pacData } = await supabase
        .from('pacientes')
        .select('id, nome, objetivos')
        .eq('nutricionista_id', user.id)
        .order('nome', { ascending: true });

      if (!pacData) { setPacientes([]); return; }

      // Buscar a consulta mais recente de cada paciente
      const hoje = new Date();
      const hojeStr = hoje.toISOString().split('T')[0];

      const { data: consultas } = await supabase
        .from('consultas')
        .select('paciente_id, data_consulta')
        .lte('data_consulta', hojeStr)
        .in('paciente_id', pacData.map(p => p.id))
        .order('data_consulta', { ascending: false });

      // Mapear última consulta por paciente
      const ultimaConsultaMap: Record<string, string> = {};
      if (consultas) {
        consultas.forEach(c => {
          if (!ultimaConsultaMap[c.paciente_id]) {
            ultimaConsultaMap[c.paciente_id] = c.data_consulta;
          }
        });
      }

      const lista: Paciente[] = pacData.map(p => ({
        id: p.id,
        nome: p.nome,
        objetivos: p.objetivos,
        ultimaConsulta: ultimaConsultaMap[p.id] ?? null,
      }));

      setPacientes(lista);
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregarPacientes();
  }, [carregarPacientes]);

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Métricas rápidas dinâmicas
  const totalPacientes = pacientes.length;
  const focoEx = pacientes.filter(p => 
    p.objetivos?.some(obj => 
      obj.toLowerCase().includes('massa') || 
      obj.toLowerCase().includes('esport') || 
      obj.toLowerCase().includes('performance') || 
      obj.toLowerCase().includes('hipertrofia')
    )
  ).length;
  const focoNutri = pacientes.filter(p => 
    p.objetivos?.some(obj => 
      obj.toLowerCase().includes('emagrecer') || 
      obj.toLowerCase().includes('alimentar') || 
      obj.toLowerCase().includes('diabetes') || 
      obj.toLowerCase().includes('saúde')
    )
  ).length;

  return (
    <main className="page-content futuristic-patients-view">
      {/* Background Cyber Grid & Glow Spots */}
      <div className="cyber-grid-overlay" />
      <div className="cyber-glow-spot-1" />
      <div className="cyber-glow-spot-2" />

      {/* Floating Particles (Nutrition & Exercise themes) */}
      <div className="floating-particles-container">
        <span className="nutrient-particle" style={{ top: '15%', left: '8%', animationDuration: '22s', fontSize: '1.25rem' }}>🍃</span>
        <span className="nutrient-particle" style={{ top: '45%', left: '92%', animationDuration: '28s', fontSize: '1.5rem' }}>💪</span>
        <span className="nutrient-particle" style={{ top: '75%', left: '5%', animationDuration: '25s', fontSize: '1.3rem' }}>🍎</span>
        <span className="nutrient-particle" style={{ top: '80%', left: '85%', animationDuration: '20s', fontSize: '1.1rem' }}>🏃</span>
        <span className="nutrient-particle" style={{ top: '30%', left: '75%', animationDuration: '32s', fontSize: '1.4rem' }}>🍋</span>
        <span className="nutrient-particle" style={{ top: '60%', left: '15%', animationDuration: '24s', fontSize: '1.6rem' }}>🏋️</span>
        <span className="nutrient-particle" style={{ top: '10%', left: '60%', animationDuration: '30s', fontSize: '1.2rem' }}>🥗</span>
      </div>

      {/* Cabeçalho Futurista */}
      <header className="futuristic-header">
        <div className="futuristic-title-area">
          <h1>Pacientes</h1>
          <p>Mapeamento Biométrico & Acompanhamento</p>
        </div>
        <Link to="/pacientes/novo" className="btn-action btn-cyber-action">
          <Plus size={18} />
          Cadastrar Paciente
        </Link>
      </header>

      {/* Hologram Stats Dashboard */}
      <section className="hologram-stats-grid">
        <div className="hologram-stat-card">
          <div className="hologram-stat-header">
            <span className="hologram-stat-title">Monitoramento Geral</span>
            <div className="hologram-stat-icon">
              <Users size={18} />
            </div>
          </div>
          <div className="hologram-stat-value">{isLoading ? '...' : totalPacientes}</div>
          <div className="hologram-stat-footer">
            <Activity size={12} />
            <span>Pacientes cadastrados</span>
          </div>
        </div>

        <div className="hologram-stat-card">
          <div className="hologram-stat-header">
            <span className="hologram-stat-title">Performance & Força</span>
            <div className="hologram-stat-icon">
              <Dumbbell size={18} />
            </div>
          </div>
          <div className="hologram-stat-value">{isLoading ? '...' : focoEx}</div>
          <div className="hologram-stat-footer">
            <Target size={12} />
            <span>Foco em exercícios e hipertrofia</span>
          </div>
        </div>

        <div className="hologram-stat-card">
          <div className="hologram-stat-header">
            <span className="hologram-stat-title">Nutrição & Saúde</span>
            <div className="hologram-stat-icon">
              <Apple size={18} />
            </div>
          </div>
          <div className="hologram-stat-value">{isLoading ? '...' : focoNutri}</div>
          <div className="hologram-stat-footer">
            <Heart size={12} />
            <span>Foco em reeducação e emagrecimento</span>
          </div>
        </div>
      </section>

      {/* Controles cibernéticos */}
      <div className="cyber-controls">
        <div className="cyber-search-bar">
          <input
            id="busca-pacientes"
            type="text"
            className="cyber-search-input"
            placeholder="Filtrar por nome de paciente..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          <Search className="cyber-search-icon" size={18} />
        </div>
        <span className="cyber-results-count">
          {isLoading ? 'Escaneando...' : `${pacientesFiltrados.length} Registro(s)`}
        </span>
      </div>

      {/* Cards ou Loader */}
      {isLoading ? (
        <div className="hologram-cards-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="cyber-skeleton-card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="cyber-skeleton-pulse" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="cyber-skeleton-pulse" style={{ height: '1.2rem', width: '70%' }} />
                  <div className="cyber-skeleton-pulse" style={{ height: '0.8rem', width: '40%' }} />
                </div>
              </div>
              <div className="cyber-skeleton-pulse" style={{ height: '1.5rem', width: '100%', marginTop: '1rem' }} />
              <div className="cyber-skeleton-pulse" style={{ height: '1rem', width: '60%', marginTop: '1rem' }} />
            </div>
          ))}
        </div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="cyber-empty-state">
          <Users size={48} className="cyber-empty-icon" />
          <h3>{filtro ? 'Sem resultados na rede' : 'Nenhum paciente integrado'}</h3>
          <p>
            {filtro
              ? `A busca por "${filtro}" não retornou nenhuma assinatura biométrica correspondente.`
              : 'Comece cadastrando seu primeiro paciente para iniciar o mapeamento metabólico.'}
          </p>
          {!filtro && (
            <Link to="/pacientes/novo" className="btn-action btn-cyber-action" style={{ marginTop: '0.5rem' }}>
              <Plus size={18} />
              Iniciar Primeiro Cadastro
            </Link>
          )}
        </div>
      ) : (
        <div className="hologram-cards-grid">
          {pacientesFiltrados.map(paciente => {
            // Iniciais do nome
            const iniciais = paciente.nome
              .split(' ')
              .filter(n => n.length > 0)
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <Link key={paciente.id} to={`/pacientes/${paciente.id}`} className="hologram-card">
                <div className="hologram-card-top">
                  <div className="hologram-patient-avatar">
                    {iniciais || '?'}
                  </div>
                  <div className="hologram-patient-details">
                    <h3 className="hologram-patient-name">{paciente.nome}</h3>
                    <div className="hologram-patient-status">
                      <span className="hologram-patient-status-dot" />
                      <span>Ativo</span>
                    </div>
                  </div>
                </div>

                <div className="hologram-card-middle">
                  <span className="hologram-card-label">Objetivos</span>
                  <div className="hologram-objectives-chips">
                    {paciente.objetivos && paciente.objetivos.length > 0 ? (
                      paciente.objetivos.map((obj, index) => {
                        let chipClass = '';
                        let icon = null;

                        const objLower = obj.toLowerCase();
                        if (objLower.includes('emagrecer') || objLower.includes('alimentar') || objLower.includes('reeducação')) {
                          chipClass = 'hologram-chip-emagrecer';
                          icon = <Apple size={12} />;
                        } else if (objLower.includes('massa') || objLower.includes('esport') || objLower.includes('performance') || objLower.includes('hipertrofia')) {
                          chipClass = 'hologram-chip-ganhar-massa';
                          icon = <Dumbbell size={12} />;
                        } else {
                          chipClass = 'hologram-chip-saude-geral';
                          icon = <Heart size={12} />;
                        }

                        return (
                          <span key={index} className={`hologram-chip ${chipClass}`}>
                            {icon}
                            {obj}
                          </span>
                        );
                      })
                    ) : (
                      <span className="hologram-chip">Sem objetivos definidos</span>
                    )}
                  </div>
                </div>

                <div className="hologram-card-bottom">
                  <div className="hologram-consultation-date">
                    <Calendar size={14} className="hologram-consultation-icon" />
                    <span>
                      {paciente.ultimaConsulta
                        ? `Último contato: ${formatarData(paciente.ultimaConsulta)}`
                        : 'Sem consultas'}
                    </span>
                  </div>
                  <ChevronRight className="hologram-card-arrow" size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
