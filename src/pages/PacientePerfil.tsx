import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { gerarPlanoAlimentar } from '../lib/gemini';
import type { PlanoGerado } from '../lib/gemini';
import { 
  ArrowLeft, 
  User, 
  Stethoscope, 
  Smile, 
  Calendar, 
  Mail, 
  Clock, 
  Plus, 
  FileText, 
  Sparkles, 
  CheckCircle,
  X,
  TrendingUp,
  Loader2,
  Lightbulb,
  Printer
} from 'lucide-react';

interface Paciente {
  id: string;
  nutricionista_id: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  peso_inicial: number | null;
  altura: number | null;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  nivel_atividade: string | null;
  patologias: string[] | null;
  restricoes_alimentares: string[] | null;
  alergias: string[] | null;
  medicamentos: string | null;
  suplementos: string | null;
  refeicoes_por_dia: number | null;
  horario_acorda: string | null;
  horario_dorme: string | null;
  litros_agua: number | null;
  atividade_fisica: boolean | null;
  atividade_fisica_descricao: string | null;
  observacoes: string | null;
  created_at: string | null;
}

interface Consulta {
  id: string;
  paciente_id: string;
  data_consulta: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
  proximo_retorno: string | null;
  created_at: string | null;
}

interface PlanoAlimentar {
  id: string;
  paciente_id: string;
  conteudo: any;
  created_at: string;
}

// --- Opções de múltipla escolha para edição ---
const OPCOES_OBJETIVOS = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const OPCOES_ATIVIDADE = ['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'];
const OPCOES_PATOLOGIAS = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const OPCOES_RESTRICOES = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const OPCOES_ALERGIAS = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

// --- Utilitários ---
function calcularIdade(dataNascimento: string): string {
  if (!dataNascimento) return '';
  const nascimento = new Date(dataNascimento + 'T00:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return `${idade} anos`;
}

function calcularIMC(peso: number | string | null, altura: number | string | null): { valor: number; classe: string; label: string } | null {
  const p = typeof peso === 'string' ? parseFloat(peso) : peso;
  const a = typeof altura === 'string' ? parseFloat(altura) : altura;
  if (!p || !a) return null;
  const altMetros = a / 100;
  const imc = p / (altMetros * altMetros);
  let classe = '';
  let label = '';
  if (imc < 18.5) { classe = 'baixo'; label = 'Baixo Peso'; }
  else if (imc < 25) { classe = 'saudavel'; label = 'Saudável'; }
  else if (imc < 30) { classe = 'sobrepeso'; label = 'Sobrepeso'; }
  else { classe = 'obesidade'; label = 'Obesidade'; }
  return { valor: parseFloat(imc.toFixed(1)), classe, label };
}

function formatarData(dataStr: string): string {
  if (!dataStr) return '';
  const parts = dataStr.split('-');
  if (parts.length !== 3) return dataStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatarDataSimplificada(dataStr: string): string {
  if (!dataStr) return '';
  const parts = dataStr.split('-');
  if (parts.length !== 3) return dataStr;
  return `${parts[2]}/${parts[1]}`;
}

function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return nums.length ? `(${nums}` : '';
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  return valor;
}

function converterHorario(input: string): string {
  const numeros = input.replace(/\D/g, '');
  if (!numeros) return '';
  if (numeros.length <= 2) {
    const h = parseInt(numeros, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
  } else if (numeros.length === 3) {
    const h = parseInt(numeros.slice(0, 1), 10);
    const m = parseInt(numeros.slice(1), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } else {
    const h = parseInt(numeros.slice(0, 2), 10);
    const m = parseInt(numeros.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return input;
}

// --- Componente de Chip Clicável ---
function ChipGroup({
  opcoes,
  selecionados,
  onChange,
  comNenhum = false,
}: {
  opcoes: string[];
  selecionados: string[];
  onChange: (val: string[]) => void;
  comNenhum?: boolean;
}) {
  const toggle = (item: string) => {
    if (item === 'Nenhum') {
      onChange(selecionados.includes('Nenhum') ? [] : ['Nenhum']);
      return;
    }
    const semNenhum = selecionados.filter(s => s !== 'Nenhum');
    if (semNenhum.includes(item)) {
      onChange(semNenhum.filter(s => s !== item));
    } else {
      onChange([...semNenhum, item]);
    }
  };

  return (
    <div className="chips-group">
      {comNenhum && (
        <button type="button" className={`chip chip-none ${selecionados.includes('Nenhum') ? 'selected' : ''}`} onClick={() => toggle('Nenhum')}>
          Nenhum
        </button>
      )}
      {opcoes.map(op => (
        <button
          key={op}
          type="button"
          className={`chip ${selecionados.includes(op) ? 'selected' : ''}`}
          onClick={() => toggle(op)}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

export default function PacientePerfil() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // --- Estados do Paciente ---
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');
  const [salvandoPaciente, setSalvandoPaciente] = useState(false);
  const [toast, setToast] = useState<{ mostrar: boolean; mensagem: string } | null>(null);

  // --- Estados de Abas Editáveis ---
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  const [patologias, setPatologias] = useState<string[]>([]);
  const [patologiaExtra, setPatologiaExtra] = useState('');
  const [restricoes, setRestricoes] = useState<string[]>([]);
  const [restricaoExtra, setRestricaoExtra] = useState('');
  const [alergias, setAlergias] = useState<string[]>([]);
  const [alergiasExtra, setAlergiasExtra] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');

  const [refeicoesDia, setRefeicoesDia] = useState('');
  const [horarioAcordaInput, setHorarioAcordaInput] = useState('');
  const [horarioDormeInput, setHorarioDormeInput] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [praticaAtividade, setPraticaAtividade] = useState<boolean | null>(null);
  const [atividadeDescricao, setAtividadeDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // --- Estados de Consultas ---
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [modalNovaConsulta, setModalNovaConsulta] = useState(false);
  const [salvandoConsulta, setSalvandoConsulta] = useState(false);

  // --- Campos do Formulário de Consulta ---
  const [consultaData, setConsultaData] = useState('');
  const [consultaPeso, setConsultaPeso] = useState('');
  const [consultaCintura, setConsultaCintura] = useState('');
  const [consultaQuadril, setConsultaQuadril] = useState('');
  const [consultaPercentualGordura, setConsultaPercentualGordura] = useState('');
  const [consultaObservacoes, setConsultaObservacoes] = useState('');
  const [consultaProximoRetorno, setConsultaProximoRetorno] = useState('');

  // --- Estados de Planos Alimentares ---
  const [planosAlimentares, setPlanosAlimentares] = useState<PlanoAlimentar[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAlimentar | null>(null);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [stepGeracao, setStepGeracao] = useState(0);
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);

  // --- Mostrar Toast ---
  const showToast = (mensagem: string) => {
    setToast({ mostrar: true, mensagem });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // --- Carregar Dados do Paciente e Relacionados ---
  const carregarDados = useCallback(async () => {
    if (!id || !user) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Carregar Paciente
      const { data: dataPac, error: errPac } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .eq('nutricionista_id', user.id)
        .single();

      if (errPac) throw errPac;
      if (!dataPac) {
        setError('Paciente não encontrado.');
        return;
      }

      setPaciente(dataPac);

      // Preencher inputs do paciente
      setNome(dataPac.nome || '');
      setDataNascimento(dataPac.data_nascimento || '');
      setSexo(dataPac.sexo || '');
      setTelefone(dataPac.telefone || '');
      setWhatsapp(dataPac.whatsapp || '');
      setEmail(dataPac.email || '');

      setPeso(dataPac.peso_inicial ? String(dataPac.peso_inicial) : '');
      setAltura(dataPac.altura ? String(dataPac.altura) : '');
      setObjetivoTexto(dataPac.objective_texto || dataPac.objetivo_texto || '');
      setNivelAtividade(dataPac.nivel_atividade || '');
      setMedicamentos(dataPac.medicamentos || '');
      setSuplementos(dataPac.suplementos || '');

      setRefeicoesDia(dataPac.refeicoes_por_dia ? String(dataPac.refeicoes_por_dia) : '');
      setHorarioAcordaInput(dataPac.horario_acorda || '');
      setHorarioDormeInput(dataPac.horario_dorme || '');
      setLitrosAgua(dataPac.litros_agua ? String(dataPac.litros_agua) : '');
      setPraticaAtividade(dataPac.atividade_fisica);
      setAtividadeDescricao(dataPac.atividade_fisica_descricao || '');
      setObservacoes(dataPac.observacoes || '');

      // Tratar arrays de chips
      setObjetivos(dataPac.objetivos || []);

      // Patologias
      const pats = dataPac.patologias || [];
      const patPadrao = pats.filter((p: string) => OPCOES_PATOLOGIAS.includes(p));
      const patExt = pats.filter((p: string) => !OPCOES_PATOLOGIAS.includes(p));
      setPatologias(patPadrao.length === 0 && pats.includes('Nenhum') ? ['Nenhum'] : patPadrao);
      setPatologiaExtra(patExt.join(', '));

      // Restrições
      const rests = dataPac.restricoes_alimentares || [];
      const restPadrao = rests.filter((r: string) => OPCOES_RESTRICOES.includes(r));
      const restExt = rests.filter((r: string) => !OPCOES_RESTRICOES.includes(r));
      setRestricoes(restPadrao.length === 0 && rests.includes('Nenhum') ? ['Nenhum'] : restPadrao);
      setRestricaoExtra(restExt.join(', '));

      // Alergias
      const als = dataPac.alergias || [];
      const alPadrao = als.filter((a: string) => OPCOES_ALERGIAS.includes(a));
      const alExt = als.filter((a: string) => !OPCOES_ALERGIAS.includes(a));
      setAlergias(alPadrao.length === 0 && als.includes('Nenhum') ? ['Nenhum'] : alPadrao);
      setAlergiasExtra(alExt.join(', '));

      // 2. Carregar Consultas
      const { data: dataCons, error: errCons } = await supabase
        .from('consultas')
        .select('*')
        .eq('paciente_id', id)
        .order('data_consulta', { ascending: false });

      if (errCons) throw errCons;
      setConsultas(dataCons || []);

      // 3. Carregar Planos Alimentares
      const { data: dataPlanos, error: errPlanos } = await supabase
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });

      if (errPlanos) throw errPlanos;
      setPlanosAlimentares(dataPlanos || []);

    } catch (err) {
      console.error('Erro ao carregar dados do perfil:', err);
      setError('Ocorreu um erro ao carregar as informações.');
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // --- Função para re-buscar apenas Consultas ---
  const carregarConsultas = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('paciente_id', id)
      .order('data_consulta', { ascending: false });
    if (!error && data) {
      setConsultas(data);
    }
  };

  // --- Função para re-buscar apenas Planos ---
  const carregarPlanos = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('planos_alimentares')
      .select('*')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setPlanosAlimentares(data);
    }
  };

  // --- Gerar Plano Alimentar com IA ---
  const handleGerarPlano = async () => {
    if (!id || !paciente) return;
    setGerandoPlano(true);
    setStepGeracao(0);
    setErroGeracao(null);

    // Pegar o peso atual (última consulta ou peso inicial)
    const pesoAtual = consultas.length > 0 && consultas[0].peso
      ? consultas[0].peso
      : paciente.peso_inicial;

    try {
      const planoGerado: PlanoGerado = await gerarPlanoAlimentar(
        paciente,
        pesoAtual,
        (step) => setStepGeracao(step)
      );

      // Salvar no Supabase
      const { error: insErr } = await supabase
        .from('planos_alimentares')
        .insert([{ paciente_id: id, conteudo: planoGerado }]);

      if (insErr) throw insErr;

      // Atualizar lista
      await carregarPlanos();
      setGerandoPlano(false);
      showToast('Plano alimentar gerado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao gerar plano:', err);
      setErroGeracao(err?.message || 'Ocorreu um erro ao gerar o plano. Tente novamente.');
      // Não fecha o modal em caso de erro — mostra a mensagem
    }
  };

  // --- Salvar Dados do Paciente ---
  const handleSalvarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setSalvandoPaciente(true);

    const combinarArray = (selecionados: string[], extra: string): string[] => {
      const resultado = selecionados.filter(s => s !== 'Nenhum');
      if (extra.trim()) {
        extra.split(',').forEach(e => {
          const val = e.trim();
          if (val) resultado.push(val);
        });
      }
      return resultado;
    };

    try {
      const horarioAcorda = converterHorario(horarioAcordaInput) || null;
      const horarioDorme = converterHorario(horarioDormeInput) || null;

      const patologiasFinal = combinarArray(patologias, patologiaExtra);
      const restricoesFinal = combinarArray(restricoes, restricaoExtra);
      const alergiasFinal = combinarArray(alergias, alergiasExtra);
      const objetivosFinal = combinarArray(objetivos, '');

      const payload = {
        nome: nome.trim(),
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        peso_inicial: peso ? parseFloat(peso) : null,
        altura: altura ? parseFloat(altura) : null,
        objetivos: objetivosFinal.length > 0 ? objetivosFinal : null,
        objetivo_texto: objetivoTexto || null,
        nivel_atividade: nivelAtividade || null,
        patologias: patologiasFinal.length > 0 ? patologiasFinal : null,
        restricoes_alimentares: restricoesFinal.length > 0 ? restricoesFinal : null,
        alergias: alergiasFinal.length > 0 ? alergiasFinal : null,
        medicamentos: medicamentos || null,
        suplementos: suplementos || null,
        refeicoes_por_dia: refeicoesDia ? parseInt(refeicoesDia, 10) : null,
        horario_acorda: horarioAcorda,
        horario_dorme: horarioDorme,
        litros_agua: litrosAgua ? parseFloat(litrosAgua) : null,
        atividade_fisica: praticaAtividade,
        atividade_fisica_descricao: praticaAtividade ? atividadeDescricao || null : null,
        observacoes: observacoes || null,
      };

      const { error: updateErr } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', id)
        .eq('nutricionista_id', user.id);

      if (updateErr) throw updateErr;

      // Atualizar objeto paciente local
      setPaciente(prev => prev ? { ...prev, ...payload } : null);
      showToast('Alterações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar paciente:', err);
      alert('Ocorreu um erro ao salvar as alterações do paciente.');
    } finally {
      setSalvandoPaciente(false);
    }
  };

  // --- Abrir Modal de Nova Consulta ---
  const handleNovaConsultaClick = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    setConsultaData(`${ano}-${mes}-${dia}`);

    // Pegar o último peso registrado
    const ultimoPeso = consultas.length > 0 && consultas[0].peso ? String(consultas[0].peso) : (paciente?.peso_inicial ? String(paciente.peso_inicial) : '');
    setConsultaPeso(ultimoPeso);
    setConsultaCintura('');
    setConsultaQuadril('');
    setConsultaPercentualGordura('');
    setConsultaObservacoes('');
    setConsultaProximoRetorno('');
    setModalNovaConsulta(true);
  };

  // --- Salvar Nova Consulta ---
  const handleSalvarConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !consultaData) return;
    setSalvandoConsulta(true);

    try {
      const payload = {
        paciente_id: id,
        data_consulta: consultaData,
        peso: consultaPeso ? parseFloat(consultaPeso) : null,
        cintura: consultaCintura ? parseFloat(consultaCintura) : null,
        quadril: consultaQuadril ? parseFloat(consultaQuadril) : null,
        percentual_gordura: consultaPercentualGordura ? parseFloat(consultaPercentualGordura) : null,
        observacoes: consultaObservacoes || null,
        proximo_retorno: consultaProximoRetorno || null,
      };

      const { error: insErr } = await supabase
        .from('consultas')
        .insert([payload]);

      if (insErr) throw insErr;

      setModalNovaConsulta(false);
      showToast('Consulta salva com sucesso!');
      await carregarConsultas();
    } catch (err) {
      console.error('Erro ao inserir consulta:', err);
      alert('Ocorreu um erro ao salvar a consulta.');
    } finally {
      setSalvandoConsulta(false);
    }
  };

  // --- Renderização do Gráfico SVG de Peso ---
  const renderGraficoPeso = () => {
    // Pegar todas as consultas com peso preenchido e ordenar de forma CRESCENTE (passado para o presente)
    const consultasComPeso = [...consultas]
      .filter(c => c.peso !== null && c.peso !== undefined && c.peso > 0)
      .reverse(); // Como consultas está ordenada por decrescente, reverse ordena por crescente

    if (consultasComPeso.length === 0) {
      return (
        <div className="chart-empty-state">
          <span>Nenhuma consulta registrada ainda</span>
        </div>
      );
    }

    const svgWidth = 460;
    const svgHeight = 180;
    const paddingTop = 25;
    const paddingBottom = 25;
    const paddingLeft = 35;
    const paddingRight = 20;

    const pesos = consultasComPeso.map(c => c.peso as number);
    const pesoMin = Math.min(...pesos);
    const pesoMax = Math.max(...pesos);
    const diff = pesoMax - pesoMin;
    const verticalPadding = diff * 0.3 || 4; // garante espaço acima/abaixo

    const yMax = pesoMax + verticalPadding;
    const yMin = Math.max(0, pesoMin - verticalPadding);

    const N = consultasComPeso.length;
    const pontos: { x: number; y: number; peso: number; data: string }[] = [];

    // Calcular as coordenadas de cada ponto
    consultasComPeso.forEach((c, i) => {
      const x = N === 1 
        ? paddingLeft + (svgWidth - paddingLeft - paddingRight) / 2 
        : paddingLeft + (i * (svgWidth - paddingLeft - paddingRight)) / (N - 1);
      
      const pesoVal = c.peso as number;
      const y = svgHeight - paddingBottom - ((pesoVal - yMin) * (svgHeight - paddingTop - paddingBottom)) / (yMax - yMin);
      
      pontos.push({ x, y, peso: pesoVal, data: c.data_consulta });
    });

    // Construir o path da linha
    let linePath = '';
    let areaPath = '';

    if (N > 0) {
      linePath = `M ${pontos[0].x} ${pontos[0].y}`;
      for (let i = 1; i < N; i++) {
        linePath += ` L ${pontos[i].x} ${pontos[i].y}`;
      }

      // Path da área sombreada abaixo do gráfico
      areaPath = `M ${pontos[0].x} ${svgHeight - paddingBottom}`;
      for (let i = 0; i < N; i++) {
        areaPath += ` L ${pontos[i].x} ${pontos[i].y}`;
      }
      areaPath += ` L ${pontos[N - 1].x} ${svgHeight - paddingBottom} Z`;
    }

    return (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height={svgHeight} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradientPeso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Linhas de Grade de Fundo (Horizontal) */}
        {[0, 0.5, 1].map((val, idx) => {
          const yPos = paddingTop + val * (svgHeight - paddingTop - paddingBottom);
          const pesoMedio = yMax - val * (yMax - yMin);
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={yPos} 
                x2={svgWidth - paddingRight} 
                y2={yPos} 
                stroke="var(--color-border)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 8} 
                y={yPos + 4} 
                textAnchor="end" 
                fontSize="9" 
                fill="var(--color-text-light)"
                fontWeight="500"
              >
                {pesoMedio.toFixed(0)}kg
              </text>
            </g>
          );
        })}

        {/* Área Sombreada */}
        {N > 1 && <path d={areaPath} fill="url(#gradientPeso)" />}

        {/* Linha do Gráfico */}
        {N > 1 && (
          <path 
            d={linePath} 
            fill="none" 
            stroke="var(--color-primary)" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* Círculos dos Pontos e Rótulos */}
        {pontos.map((p, idx) => (
          <g key={idx}>
            {/* Linha vertical tracejada ao ponto */}
            <line 
              x1={p.x} 
              y1={p.y} 
              x2={p.x} 
              y2={svgHeight - paddingBottom} 
              stroke="var(--color-border)" 
              strokeWidth="1" 
              strokeDasharray="2 2" 
            />
            {/* Círculo do ponto */}
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="5.5" 
              fill="var(--color-primary)" 
              stroke="#ffffff" 
              strokeWidth="2" 
              style={{ filter: 'drop-shadow(0px 2px 4px rgba(225, 29, 72, 0.2))' }}
            />
            {/* Peso acima do ponto */}
            <text 
              x={p.x} 
              y={p.y - 10} 
              textAnchor="middle" 
              fontSize="10" 
              fontWeight="700" 
              fill="var(--color-primary-dark)"
            >
              {p.peso} kg
            </text>
            {/* Data abaixo do ponto */}
            <text 
              x={p.x} 
              y={svgHeight - 10} 
              textAnchor="middle" 
              fontSize="9" 
              fontWeight="600" 
              fill="var(--color-text-light)"
            >
              {formatarDataSimplificada(p.data)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  if (isLoading) {
    return (
      <main className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ height: '140px', width: '100%', borderRadius: '1rem' }} />
          <div className="profile-grid">
            <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '1rem' }} />
            <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '1rem' }} />
          </div>
        </div>
      </main>
    );
  }

  if (error || !paciente) {
    return (
      <main className="page-content">
        <header className="page-header" style={{ marginBottom: '1rem' }}>
          <Link to="/pacientes" className="btn-secondary">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </header>
        <div className="empty-state">
          <h3>Erro</h3>
          <p>{error || 'Não foi possível encontrar o paciente solicitado.'}</p>
          <Link to="/pacientes" className="btn-action" style={{ marginTop: '0.5rem' }}>
            Ir para Listagem
          </Link>
        </div>
      </main>
    );
  }

  const imc = calcularIMC(peso || paciente.peso_inicial, altura || paciente.altura);
  const idade = paciente.data_nascimento ? calcularIdade(paciente.data_nascimento) : '';
  const iniciais = paciente.nome
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="page-content">
      {/* Toast de Sucesso */}
      {toast?.mostrar && (
        <div className="toast">
          <CheckCircle size={20} />
          {toast.mensagem}
        </div>
      )}

      {/* Cabeçalho de Navegação */}
      <header className="page-header" style={{ marginBottom: '1.5rem' }}>
        <Link to="/pacientes" className="btn-secondary">
          <ArrowLeft size={16} />
          Voltar para Pacientes
        </Link>
      </header>

      {/* Header do Perfil */}
      <div className="profile-header">
        <div className="profile-avatar">{iniciais}</div>
        <div className="profile-info">
          <h1 className="profile-name">{paciente.nome}</h1>
          <div className="profile-meta">
            {idade && (
              <span>
                <Calendar size={15} />
                {idade} ({formatarData(paciente.data_nascimento!)})
              </span>
            )}
            {paciente.sexo && (
              <span>
                <User size={15} />
                {paciente.sexo}
              </span>
            )}
            {paciente.email && (
              <span>
                <Mail size={15} />
                {paciente.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Geral do Perfil */}
      <div className="profile-details-grid">
        
        {/* COLUNA ESQUERDA: Dados do Paciente (Abas Editáveis) */}
        <section className="form-card" style={{ animationDelay: '0.1s' }}>
          <div className="tabs-header">
            <button 
              type="button" 
              className={`tab-btn ${abaAtiva === 'pessoal' ? 'active' : ''}`} 
              onClick={() => setAbaAtiva('pessoal')}
            >
              <User size={16} />
              Pessoal
            </button>
            <button 
              type="button" 
              className={`tab-btn ${abaAtiva === 'clinico' ? 'active' : ''}`} 
              onClick={() => setAbaAtiva('clinico')}
            >
              <Stethoscope size={16} />
              Clínico
            </button>
            <button 
              type="button" 
              className={`tab-btn ${abaAtiva === 'habitos' ? 'active' : ''}`} 
              onClick={() => setAbaAtiva('habitos')}
            >
              <Smile size={16} />
              Hábitos
            </button>
          </div>

          <form onSubmit={handleSalvarPaciente}>
            {/* ABA 1: PESSOAL */}
            <div className={`tab-content ${abaAtiva === 'pessoal' ? 'visible' : ''}`}>
              <div className="form-grid">
                <div className="form-group form-col-span-2">
                  <label className="form-label required" htmlFor="nome">Nome completo</label>
                  <input 
                    id="nome" 
                    type="text" 
                    className="form-input" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="data-nascimento">Data de nascimento</label>
                  <input 
                    id="data-nascimento" 
                    type="date" 
                    className="form-input" 
                    value={dataNascimento} 
                    onChange={e => setDataNascimento(e.target.value)} 
                  />
                  {idade && (
                    <span style={{ fontSize: '0.825rem', color: 'var(--color-primary-dark)', fontWeight: 600, marginTop: '0.2rem' }}>
                      🎂 {idade}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="sexo">Sexo</label>
                  <select 
                    id="sexo" 
                    className="form-input form-select" 
                    value={sexo} 
                    onChange={e => setSexo(e.target.value)}
                  >
                    <option value="">Selecionar</option>
                    <option>Feminino</option>
                    <option>Masculino</option>
                    <option>Outro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="telefone">Telefone</label>
                  <input
                    id="telefone"
                    type="tel"
                    className="form-input"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={e => setTelefone(formatarTelefone(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp">WhatsApp</label>
                  <input
                    id="whatsapp"
                    type="tel"
                    className="form-input"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={e => setWhatsapp(formatarTelefone(e.target.value))}
                  />
                </div>

                <div className="form-group form-col-span-2">
                  <label className="form-label" htmlFor="email">E-mail</label>
                  <input 
                    id="email" 
                    type="email" 
                    className="form-input" 
                    placeholder="paciente@email.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* ABA 2: CLÍNICO */}
            <div className={`tab-content ${abaAtiva === 'clinico' ? 'visible' : ''}`}>
              <p className="form-section-title">Dados Biométricos</p>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label" htmlFor="peso">Peso inicial</label>
                  <div className="input-suffix-wrapper">
                    <input 
                      id="peso" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      className="form-input" 
                      placeholder="0,0" 
                      value={peso} 
                      onChange={e => setPeso(e.target.value)} 
                    />
                    <span className="input-suffix">kg</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="altura">Altura</label>
                  <div className="input-suffix-wrapper">
                    <input 
                      id="altura" 
                      type="number" 
                      step="1" 
                      min="0" 
                      className="form-input" 
                      placeholder="0" 
                      value={altura} 
                      onChange={e => setAltura(e.target.value)} 
                    />
                    <span className="input-suffix">cm</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">IMC (calculado)</label>
                  <div className="imc-row">
                    {imc ? (
                      <>
                        <span className="imc-value">{imc.valor}</span>
                        <span className={`imc-badge ${imc.classe}`}>{imc.label}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Informe peso e altura</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="form-section-title">Objetivos</p>
              <ChipGroup opcoes={OPCOES_OBJETIVOS} selecionados={objetivos} onChange={setObjetivos} />
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Outros objetivos (texto livre)..." 
                  value={objetivoTexto} 
                  onChange={e => setObjetivoTexto(e.target.value)} 
                />
              </div>

              <p className="form-section-title">Nível de Atividade Física</p>
              <div className="activity-cards">
                {OPCOES_ATIVIDADE.map(op => (
                  <button
                    key={op}
                    type="button"
                    className={`activity-card ${nivelAtividade === op ? 'selected' : ''}`}
                    onClick={() => setNivelAtividade(nivelAtividade === op ? '' : op)}
                  >
                    {op}
                  </button>
                ))}
              </div>

              <p className="form-section-title">Patologias / Condições de Saúde</p>
              <ChipGroup opcoes={OPCOES_PATOLOGIAS} selecionados={patologias} onChange={setPatologias} comNenhum />
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Adicionar outras (separar por vírgula)..." 
                  value={patologiaExtra} 
                  onChange={e => setPatologiaExtra(e.target.value)} 
                />
              </div>

              <p className="form-section-title">Restrições Alimentares</p>
              <ChipGroup opcoes={OPCOES_RESTRICOES} selecionados={restricoes} onChange={setRestricoes} comNenhum />
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Adicionar outras (separar por vírgula)..." 
                  value={restricaoExtra} 
                  onChange={e => setRestricaoExtra(e.target.value)} 
                />
              </div>

              <p className="form-section-title">Alergias Alimentares</p>
              <ChipGroup opcoes={OPCOES_ALERGIAS} selecionados={alergias} onChange={setAlergias} comNenhum />
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Adicionar outras (separar por vírgula)..." 
                  value={alergiasExtra} 
                  onChange={e => setAlergiasExtra(e.target.value)} 
                />
              </div>

              <p className="form-section-title">Medicamentos e Suplementos</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="medicamentos">Medicamentos contínuos</label>
                  <textarea 
                    id="medicamentos" 
                    className="form-input form-textarea" 
                    placeholder="Liste os medicamentos em uso..." 
                    value={medicamentos} 
                    onChange={e => setMedicamentos(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="suplementos">Suplementos em uso</label>
                  <textarea 
                    id="suplementos" 
                    className="form-input form-textarea" 
                    placeholder="Liste os suplementos em uso..." 
                    value={suplementos} 
                    onChange={e => setSuplementos(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* ABA 3: HÁBITOS */}
            <div className={`tab-content ${abaAtiva === 'habitos' ? 'visible' : ''}`}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="refeicoes">Refeições por dia</label>
                  <input 
                    id="refeicoes" 
                    type="number" 
                    min="1" 
                    max="12" 
                    className="form-input" 
                    placeholder="Ex: 5" 
                    value={refeicoesDia} 
                    onChange={e => setRefeicoesDia(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="agua">Quantidade de água por dia</label>
                  <div className="input-suffix-wrapper">
                    <input 
                      id="agua" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      className="form-input" 
                      placeholder="Ex: 2" 
                      value={litrosAgua} 
                      onChange={e => setLitrosAgua(e.target.value)} 
                    />
                    <span className="input-suffix">litros</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="horario-acorda">Horário que acorda</label>
                  <input
                    id="horario-acorda"
                    type="text"
                    className="form-input"
                    placeholder="Ex: 06:30"
                    value={horarioAcordaInput}
                    onChange={e => setHorarioAcordaInput(e.target.value)}
                    onBlur={e => setHorarioAcordaInput(converterHorario(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="horario-dorme">Horário que dorme</label>
                  <input
                    id="horario-dorme"
                    type="text"
                    className="form-input"
                    placeholder="Ex: 22:30"
                    value={horarioDormeInput}
                    onChange={e => setHorarioDormeInput(e.target.value)}
                    onBlur={e => setHorarioDormeInput(converterHorario(e.target.value))}
                  />
                </div>

                <div className="form-group form-col-span-2">
                  <label className="form-label">Pratica atividade física?</label>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={`toggle-btn ${praticaAtividade === true ? 'selected-yes' : ''}`}
                      onClick={() => setPraticaAtividade(praticaAtividade === true ? null : true)}
                    >
                      ✓ Sim
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${praticaAtividade === false ? 'selected-no' : ''}`}
                      onClick={() => setPraticaAtividade(praticaAtividade === false ? null : false)}
                    >
                      ✗ Não
                    </button>
                  </div>
                  {praticaAtividade === true && (
                    <div className="expanded-section">
                      <div className="form-group">
                        <label className="form-label" htmlFor="atividade-desc">Qual atividade e frequência semanal?</label>
                        <textarea
                          id="atividade-desc"
                          className="form-input form-textarea"
                          placeholder="Ex: Musculação 3x por semana..."
                          value={atividadeDescricao}
                          onChange={e => setAtividadeDescricao(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group form-col-span-2">
                  <label className="form-label" htmlFor="observacoes">Observações gerais</label>
                  <textarea
                    id="observacoes"
                    className="form-input form-textarea"
                    style={{ minHeight: '100px' }}
                    placeholder="Informações adicionais relevantes..."
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Rodapé da Edição */}
            <div className="form-footer">
              <button 
                type="submit" 
                className="btn-action" 
                disabled={salvandoPaciente}
              >
                {salvandoPaciente ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </section>

        {/* COLUNA DIREITA: Consultas (Gráfico + Lista) & Planos Alimentares */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SEÇÃO 2: CONSULTAS */}
          <section className="section-card" style={{ animationDelay: '0.2s' }}>
            <div className="section-header">
              <h2 className="section-title">
                <TrendingUp size={20} />
                Evolução de Peso
              </h2>
              <button 
                type="button" 
                className="btn-action" 
                onClick={handleNovaConsultaClick}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              >
                <Plus size={15} />
                Nova Consulta
              </button>
            </div>

            {/* Gráfico sempre visível */}
            <div className="weight-chart-card" style={{ border: 'none', padding: 0, boxShadow: 'none' }}>
              <div className="chart-svg-wrapper">
                {renderGraficoPeso()}
              </div>
            </div>

            {/* Lista de Consultas */}
            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: '1.5rem' }}>
              Histórico de Consultas
            </h3>
            
            {consultas.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Clock size={28} className="empty-state-icon" />
                <h3>Nenhuma consulta registrada</h3>
                <p>Agende uma nova consulta com o paciente para iniciar o acompanhamento.</p>
              </div>
            ) : (
              <div className="consultas-list">
                {consultas.map(c => (
                  <div key={c.id} className="consulta-item">
                    <div className="consulta-item-header">
                      <span className="consulta-date">
                        <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                        {formatarData(c.data_consulta)}
                      </span>
                      {c.proximo_retorno && (
                        <span className="consulta-return">
                          <Clock size={12} />
                          Retorno: {formatarData(c.proximo_retorno)}
                        </span>
                      )}
                    </div>

                    <div className="consulta-grid">
                      <div className="consulta-metric">
                        <span className="consulta-metric-lbl">Peso</span>
                        <span className="consulta-metric-val">{c.peso ? `${c.peso} kg` : '—'}</span>
                      </div>
                      <div className="consulta-metric">
                        <span className="consulta-metric-lbl">Cintura</span>
                        <span className="consulta-metric-val">{c.cintura ? `${c.cintura} cm` : '—'}</span>
                      </div>
                      <div className="consulta-metric">
                        <span className="consulta-metric-lbl">Quadril</span>
                        <span className="consulta-metric-val">{c.quadril ? `${c.quadril} cm` : '—'}</span>
                      </div>
                      <div className="consulta-metric">
                        <span className="consulta-metric-lbl">% Gord.</span>
                        <span className="consulta-metric-val">{c.percentual_gordura ? `${c.percentual_gordura}%` : '—'}</span>
                      </div>
                    </div>

                    {c.observacoes && (
                      <div className="consulta-obs">
                        <strong>Obs:</strong> {c.observacoes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SEÇÃO 3: PLANOS ALIMENTARES */}
          <section className="section-card" style={{ animationDelay: '0.3s' }}>
            <div className="section-header">
              <h2 className="section-title">
                <FileText size={20} />
                Planos Alimentares
              </h2>
              <button 
                type="button" 
                className="btn-action" 
                onClick={handleGerarPlano}
                disabled={gerandoPlano}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              >
                {gerandoPlano
                  ? <Loader2 size={14} className="spin-icon" />
                  : <Sparkles size={14} />
                }
                {gerandoPlano ? 'Gerando...' : 'Gerar Plano'}
              </button>
            </div>

            {planosAlimentares.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <FileText size={28} className="empty-state-icon" />
                <h3>Nenhum plano alimentar gerado ainda</h3>
                <p>Os planos alimentares salvos do paciente aparecerão listados aqui.</p>
              </div>
            ) : (
              <div className="planos-list">
                {planosAlimentares.map(p => (
                  <div key={p.id} className="plano-item">
                    <div className="plano-info">
                      <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                      <span className="plano-date">Plano de {formatarData(p.created_at.split('T')[0])}</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setPlanoSelecionado(p)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* MODAL: NOVA CONSULTA */}
      {modalNovaConsulta && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Registrar Nova Consulta</h3>
              <button type="button" className="btn-close" onClick={() => setModalNovaConsulta(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarConsulta}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label required" htmlFor="consulta-data">Data da Consulta</label>
                    <input 
                      id="consulta-data" 
                      type="date" 
                      className="form-input" 
                      value={consultaData} 
                      onChange={e => setConsultaData(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required" htmlFor="consulta-peso">Peso Atual (kg)</label>
                    <div className="input-suffix-wrapper">
                      <input 
                        id="consulta-peso" 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        className="form-input" 
                        placeholder="0,0" 
                        value={consultaPeso} 
                        onChange={e => setConsultaPeso(e.target.value)} 
                        required 
                      />
                      <span className="input-suffix">kg</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-cintura">Cintura (cm) - Opcional</label>
                    <div className="input-suffix-wrapper">
                      <input 
                        id="consulta-cintura" 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        className="form-input" 
                        placeholder="Opcional" 
                        value={consultaCintura} 
                        onChange={e => setConsultaCintura(e.target.value)} 
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-quadril">Quadril (cm) - Opcional</label>
                    <div className="input-suffix-wrapper">
                      <input 
                        id="consulta-quadril" 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        className="form-input" 
                        placeholder="Opcional" 
                        value={consultaQuadril} 
                        onChange={e => setConsultaQuadril(e.target.value)} 
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-gordura">% de Gordura - Opcional</label>
                    <div className="input-suffix-wrapper">
                      <input 
                        id="consulta-gordura" 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="100" 
                        className="form-input" 
                        placeholder="Opcional" 
                        value={consultaPercentualGordura} 
                        onChange={e => setConsultaPercentualGordura(e.target.value)} 
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-retorno">Próximo Retorno - Opcional</label>
                    <input 
                      id="consulta-retorno" 
                      type="date" 
                      className="form-input" 
                      value={consultaProximoRetorno} 
                      onChange={e => setConsultaProximoRetorno(e.target.value)} 
                    />
                  </div>

                  <div className="form-group form-col-span-2">
                    <label className="form-label" htmlFor="consulta-obs">Observações / Conduta Clínica</label>
                    <textarea 
                      id="consulta-obs" 
                      className="form-input form-textarea" 
                      placeholder="Anotações sobre a evolução do paciente, queixas, metas, etc..." 
                      value={consultaObservacoes} 
                      onChange={e => setConsultaObservacoes(e.target.value)} 
                      style={{ minHeight: '80px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalNovaConsulta(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-action" disabled={salvandoConsulta}>
                  {salvandoConsulta ? 'Salvando...' : 'Salvar Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERAÇÃO DE PLANO COM IA */}
      {gerandoPlano && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                Gerando Plano Alimentar
              </h3>
              {erroGeracao && (
                <button type="button" className="btn-close" onClick={() => { setGerandoPlano(false); setErroGeracao(null); }}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="modal-body">
              {erroGeracao ? (
                <div className="geracao-erro">
                  <div className="geracao-erro-icon">⚠️</div>
                  <p className="geracao-erro-msg">{erroGeracao}</p>
                  <button
                    type="button"
                    className="btn-action"
                    style={{ marginTop: '1rem' }}
                    onClick={() => { setErroGeracao(null); handleGerarPlano(); }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className="geracao-steps">
                  <div className="geracao-ai-icon">
                    <Loader2 size={40} className="spin-icon" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="geracao-subtitle">A IA está analisando o perfil de <strong>{paciente?.nome.split(' ')[0]}</strong> e criando um plano personalizado...</p>
                  <div className="steps-list">
                    {[
                      { label: 'Analisando dados do paciente', done: stepGeracao >= 1 },
                      { label: 'Consultando IA especialista em nutrição', done: stepGeracao >= 2 },
                      { label: 'Estruturando o plano alimentar', done: stepGeracao >= 3 },
                    ].map((step, i) => (
                      <div key={i} className={`step-item ${step.done ? 'done' : stepGeracao === i ? 'active' : ''}`}>
                        <div className="step-dot">
                          {step.done ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
                        </div>
                        <span className="step-label">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR PLANO ALIMENTAR */}
      {planoSelecionado && (
        <div className="modal-backdrop">
          <div className="modal-content plano-modal" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                Plano Alimentar — {formatarData(planoSelecionado.created_at.split('T')[0])}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => window.print()}
                  title="Imprimir plano"
                >
                  <Printer size={14} />
                  Imprimir
                </button>
                <button type="button" className="btn-close" onClick={() => setPlanoSelecionado(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '1.75rem 2rem' }}>
              {planoSelecionado.conteudo && typeof planoSelecionado.conteudo === 'object' && planoSelecionado.conteudo.refeicoes ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Cabeçalho do plano */}
                  {(planoSelecionado.conteudo.objetivo_geral || planoSelecionado.conteudo.calorias_estimadas) && (
                    <div className="plano-resumo">
                      {planoSelecionado.conteudo.objetivo_geral && (
                        <div className="plano-resumo-item">
                          <span className="plano-resumo-lbl">Objetivo</span>
                          <span className="plano-resumo-val">{planoSelecionado.conteudo.objetivo_geral}</span>
                        </div>
                      )}
                      {planoSelecionado.conteudo.calorias_estimadas && (
                        <div className="plano-resumo-item">
                          <span className="plano-resumo-lbl">Calorias estimadas</span>
                          <span className="plano-resumo-val calorias">{planoSelecionado.conteudo.calorias_estimadas}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Refeições */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {planoSelecionado.conteudo.refeicoes.map((ref: any, idx: number) => (
                      <div key={idx} className="plano-refeicao">
                        <div className="plano-refeicao-header">
                          <span className="plano-refeicao-nome">{ref.nome}</span>
                          {ref.horario && (
                            <span className="plano-refeicao-hora">
                              <Clock size={12} /> {ref.horario}
                            </span>
                          )}
                        </div>
                        <ul className="plano-alimentos">
                          {ref.alimentos && ref.alimentos.map((al: string, i: number) => (
                            <li key={i}>{al}</li>
                          ))}
                        </ul>
                        {ref.observacoes && (
                          <div className="plano-refeicao-obs">
                            <strong>Obs:</strong> {ref.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Dicas gerais */}
                  {planoSelecionado.conteudo.dicas_gerais && planoSelecionado.conteudo.dicas_gerais.length > 0 && (
                    <div className="plano-dicas">
                      <div className="plano-dicas-header">
                        <Lightbulb size={16} style={{ color: 'var(--color-primary)' }} />
                        <span>Dicas Nutricionais</span>
                      </div>
                      <ul className="plano-dicas-lista">
                        {planoSelecionado.conteudo.dicas_gerais.map((dica: string, i: number) => (
                          <li key={i}>{dica}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Observações finais */}
                  {planoSelecionado.conteudo.observacoes_nutricionais && (
                    <div className="plano-obs-final">
                      <strong>Observações clínicas:</strong> {planoSelecionado.conteudo.observacoes_nutricionais}
                    </div>
                  )}
                </div>
              ) : (
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'inherit', 
                  fontSize: '0.95rem', 
                  lineHeight: '1.6', 
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-background)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {planoSelecionado.conteudo?.texto || 
                   planoSelecionado.conteudo?.plano || 
                   (typeof planoSelecionado.conteudo === 'string' ? planoSelecionado.conteudo : JSON.stringify(planoSelecionado.conteudo, null, 2))}
                </pre>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setPlanoSelecionado(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
