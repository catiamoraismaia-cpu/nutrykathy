import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Search, Calendar, ChevronRight, Users } from 'lucide-react';

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

  const formatarObjetivos = (objetivos: string[] | null) => {
    if (!objetivos || objetivos.length === 0) return '—';
    if (objetivos.length === 1) return objetivos[0];
    return objetivos[0] + (objetivos.length > 1 ? ` +${objetivos.length - 1}` : '');
  };

  return (
    <main className="page-content">
      {/* Cabeçalho */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">Gerencie todos os seus pacientes cadastrados</p>
        </div>
        <Link to="/pacientes/novo" className="btn-action">
          <Plus size={18} />
          Novo Paciente
        </Link>
      </header>

      {/* Controles */}
      <div className="patients-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            id="busca-pacientes"
            type="text"
            className="search-input"
            placeholder="Buscar por nome..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', fontWeight: 500 }}>
          {isLoading ? '...' : `${pacientesFiltrados.length} paciente${pacientesFiltrados.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="patients-table">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '1.15rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <div className="skeleton-pulse" style={{ height: '1.1rem', width: `${60 + i * 8}%`, borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '1rem' }}>
          <Users size={40} className="empty-state-icon" />
          <h3>{filtro ? 'Nenhum resultado encontrado' : 'Nenhum paciente cadastrado ainda'}</h3>
          <p>
            {filtro
              ? `Nenhum paciente encontrado para "${filtro}". Tente outro nome.`
              : 'Clique em "Novo Paciente" para começar a cadastrar seus pacientes.'}
          </p>
          {!filtro && (
            <Link to="/pacientes/novo" className="btn-action" style={{ marginTop: '0.5rem' }}>
              <Plus size={18} />
              Cadastrar primeiro paciente
            </Link>
          )}
        </div>
      ) : (
        <div className="patients-table">
          <div className="patients-table-header">
            <span>Nome</span>
            <span>Objetivo</span>
            <span>Última Consulta</span>
          </div>
          {pacientesFiltrados.map(paciente => (
            <Link key={paciente.id} to={`/pacientes/${paciente.id}`} className="patient-row">
              <span className="patient-row-name">{paciente.nome}</span>
              <span className="patient-row-goals">{formatarObjetivos(paciente.objetivos)}</span>
              <span className="patient-row-date">
                <Calendar size={14} />
                {paciente.ultimaConsulta ? formatarData(paciente.ultimaConsulta) : 'Sem consultas'}
              </span>
              <ChevronRight size={16} style={{ color: 'var(--color-text-light)', gridColumn: '4' }} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
