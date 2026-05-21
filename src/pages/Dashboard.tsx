import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users,
  Calendar,
  UserMinus,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';

interface PacienteSemRetorno {
  id: string;
  nome: string;
  diasSemRetorno: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  const [totalPacientes, setTotalPacientes] = useState<number | null>(null);
  const [consultasSemana, setConsultasSemana] = useState<number | null>(null);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState<PacienteSemRetorno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      if (!user) return;
      const userId = user.id;

      setIsLoading(true);
      setError(null);

      try {
        // 1. Total de pacientes
        const { count, error: countError } = await supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .eq('nutricionista_id', userId);

        if (countError) throw countError;
        setTotalPacientes(count ?? 0);

        // 2. Consultas da semana
        const hoje = new Date();
        const diaSemana = hoje.getDay();
        const difSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
        const segundaFeira = new Date(hoje);
        segundaFeira.setDate(hoje.getDate() + difSegunda);
        segundaFeira.setHours(0, 0, 0, 0);
        const domingo = new Date(segundaFeira);
        domingo.setDate(segundaFeira.getDate() + 6);

        const formatarData = (d: Date) => {
          const ano = d.getFullYear();
          const mes = String(d.getMonth() + 1).padStart(2, '0');
          const dia = String(d.getDate()).padStart(2, '0');
          return `${ano}-${mes}-${dia}`;
        };

        const { data: consultasSemanaData, error: consultasError } = await supabase
          .from('consultas')
          .select('id, data_consulta, pacientes!inner(nutricionista_id)')
          .eq('pacientes.nutricionista_id', userId)
          .gte('data_consulta', formatarData(segundaFeira))
          .lte('data_consulta', formatarData(domingo));

        if (consultasError) throw consultasError;
        setConsultasSemana(consultasSemanaData?.length ?? 0);

        // 3. Pacientes sem retorno
        const { data: pacientes, error: pacError } = await supabase
          .from('pacientes')
          .select('id, nome')
          .eq('nutricionista_id', userId);

        if (pacError) throw pacError;

        const { data: todasConsultas, error: consError } = await supabase
          .from('consultas')
          .select('id, paciente_id, data_consulta, proximo_retorno, pacientes!inner(nutricionista_id)')
          .eq('pacientes.nutricionista_id', userId);

        if (consError) throw consError;

        if (pacientes && todasConsultas) {
          const hojeSemHoras = new Date();
          hojeSemHoras.setHours(0, 0, 0, 0);
          const hojeStr = formatarData(hojeSemHoras);
          const semRetornoList: PacienteSemRetorno[] = [];

          pacientes.forEach(paciente => {
            const consultasDoPaciente = todasConsultas.filter(c => c.paciente_id === paciente.id);
            const consultasRealizadas = consultasDoPaciente.filter(c => c.data_consulta <= hojeStr);
            const consultasFuturas = consultasDoPaciente.filter(c => c.data_consulta > hojeStr);
            const temRetornoFuturo = consultasFuturas.length > 0 || consultasDoPaciente.some(c => c.proximo_retorno && c.proximo_retorno > hojeStr);

            if (temRetornoFuturo) return;

            if (consultasRealizadas.length > 0) {
              const ultimaConsulta = consultasRealizadas.reduce((recente, atual) =>
                atual.data_consulta > recente.data_consulta ? atual : recente, consultasRealizadas[0]);
              const dataUltima = new Date(ultimaConsulta.data_consulta + 'T00:00:00');
              const diffDays = Math.floor((hojeSemHoras.getTime() - dataUltima.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays > 30) {
                semRetornoList.push({ id: paciente.id, nome: paciente.nome, diasSemRetorno: diffDays });
              }
            }
          });

          semRetornoList.sort((a, b) => b.diasSemRetorno - a.diasSemRetorno);
          setPacientesSemRetorno(semRetornoList);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Ocorreu um erro ao carregar os dados em tempo real.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const obterDataFormatada = () => {
    const opcoes: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dataStr = new Date().toLocaleDateString('pt-BR', opcoes);
    return dataStr.charAt(0).toUpperCase() + dataStr.slice(1);
  };

  return (
    <main className="main-content">
      {/* Cabeçalho */}
      <header className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>Olá, {user?.user_metadata?.full_name || 'Nutricionista'}</h1>
          <p>Seja bem-vinda ao seu painel de controle de consultas.</p>
        </div>
        <div className="dashboard-date">
          <Calendar size={16} />
          {obterDataFormatada()}
        </div>
      </header>

      {error && (
        <div className="error-message" style={{ marginBottom: '2rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Cards de Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            {isLoading ? <div className="skeleton-pulse skeleton-value" /> : <span className="stat-value">{totalPacientes}</span>}
            <span className="stat-label">Pacientes Ativos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-info">
            {isLoading ? <div className="skeleton-pulse skeleton-value" /> : <span className="stat-value">{consultasSemana}</span>}
            <span className="stat-label">Consultas da Semana</span>
          </div>
        </div>
      </div>

      {/* Card: Pacientes sem retorno */}
      <div className="list-card">
        <div className="list-card-title">
          <UserMinus size={22} style={{ color: 'var(--color-primary-dark)' }} />
          <h2>Pacientes Sem Retorno</h2>
        </div>
        <p className="list-card-subtitle">
          Pacientes cuja última consulta foi há mais de 30 dias e que não possuem retorno futuro agendado.
        </p>

        {isLoading ? (
          <div className="patient-list">
            <div className="skeleton-pulse skeleton-list-item" />
            <div className="skeleton-pulse skeleton-list-item" />
            <div className="skeleton-pulse skeleton-list-item" />
          </div>
        ) : pacientesSemRetorno.length === 0 ? (
          <div className="empty-state">
            <Clock size={36} className="empty-state-icon" />
            <h3>Nenhum paciente sem retorno</h3>
            <p>Excelente! Todos os seus pacientes agendaram um retorno ou consultaram recentemente.</p>
          </div>
        ) : (
          <div className="patient-list">
            {pacientesSemRetorno.map(paciente => (
              <Link key={paciente.id} to={`/pacientes/${paciente.id}`} className="patient-item">
                <span className="patient-name">{paciente.nome}</span>
                <div className="patient-meta">
                  <span className="patient-days">
                    <Clock size={14} />
                    sem retorno há {paciente.diasSemRetorno} dias
                  </span>
                  <ChevronRight size={18} className="patient-chevron" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
