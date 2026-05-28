import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { gerarPlanoAlimentar } from '../lib/gemini';
import FruitLoader from '../components/FruitLoader';
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
  massa_muscular: number | null;
  imc: number | null;
  grau_obesidade: string | null;
  analise_corpo: string | null;
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

interface RefeicoesDia {
  cafe_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

interface PlanoAlimentarConteudo {
  dias: {
    segunda: RefeicoesDia;
    terca: RefeicoesDia;
    quarta: RefeicoesDia;
    quinta: RefeicoesDia;
    sexta: RefeicoesDia;
    sabado: RefeicoesDia;
    domingo: RefeicoesDia;
  };
}

const DIAS_MAPA = [
  { chave: 'segunda', label: 'Segunda-feira' },
  { chave: 'terca', label: 'Terça-feira' },
  { chave: 'quarta', label: 'Quarta-feira' },
  { chave: 'quinta', label: 'Quinta-feira' },
  { chave: 'sexta', label: 'Sexta-feira' },
  { chave: 'sabado', label: 'Sábado' },
  { chave: 'domingo', label: 'Domingo' }
] as const;

const REFEICOES_MAPA = [
  { chave: 'cafe_manha', label: '☕ Café da Manhã' },
  { chave: 'lanche_manha', label: '🍏 Lanche da Manhã' },
  { chave: 'almoco', label: '🍲 Almoço' },
  { chave: 'lanche_tarde', label: '🥪 Lanche da Tarde' },
  { chave: 'jantar', label: '🥗 Jantar' }
] as const;

const ESTRUTURA_LIMPA_PLANO: PlanoAlimentarConteudo = {
  dias: {
    segunda: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] },
    terca: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] },
    quarta: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] },
    quinta: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] },
    sexta: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] },
    sabado: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] },
    domingo: { cafe_manha: ["", "", "", "", ""], lanche_manha: ["", "", "", "", ""], almoco: ["", "", "", "", ""], lanche_tarde: ["", "", "", "", ""], jantar: ["", "", "", "", ""] }
  }
};


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

function formatarDataHora(isoString: string): string {
  if (!isoString) return '';
  try {
    const data = new Date(isoString);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
  } catch (e) {
    return isoString;
  }
}

function converterParaFormatoManual(conteudo: any): PlanoAlimentarConteudo {
  const novo = JSON.parse(JSON.stringify(ESTRUTURA_LIMPA_PLANO));
  if (!conteudo) return novo;

  // 1. Caso o conteúdo já esteja no formato com abas/manual ("dias": { "segunda": ... })
  if (conteudo.dias && typeof conteudo.dias === 'object') {
    const chavesDias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;
    const chavesRefeicoes = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'] as const;
    
    chavesDias.forEach(dia => {
      const diaObj = conteudo.dias[dia];
      if (diaObj && typeof diaObj === 'object') {
        chavesRefeicoes.forEach(ref => {
          const arr = diaObj[ref];
          if (Array.isArray(arr)) {
            for (let i = 0; i < 5; i++) {
              novo.dias[dia][ref][i] = typeof arr[i] === 'string' ? arr[i] : '';
            }
          }
        });
      }
    });
    return novo;
  }

  // 2. Caso seja o formato gerado pela IA anteriormente ("plano_semanal": [...])
  if (Array.isArray(conteudo.plano_semanal)) {
    const mapaDias: Record<string, 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'> = {
      'Segunda-feira': 'segunda',
      'Terça-feira': 'terca',
      'Quarta-feira': 'quarta',
      'Quinta-feira': 'quinta',
      'Sexta-feira': 'sexta',
      'Sábado': 'sabado',
      'Domingo': 'domingo',
      'segunda': 'segunda',
      'terca': 'terca',
      'quarta': 'quarta',
      'quinta': 'quinta',
      'sexta': 'sexta',
      'sabado': 'sabado',
      'domingo': 'domingo'
    };

    conteudo.plano_semanal.forEach((diaObj: any) => {
      if (diaObj && diaObj.dia) {
        const diaChave = mapaDias[diaObj.dia];
        if (diaChave && diaObj.refeicoes && typeof diaObj.refeicoes === 'object') {
          const cafe = diaObj.refeicoes.cafe_da_manha || diaObj.refeicoes.cafe_manha || [];
          const lancheM = diaObj.refeicoes.lanche_manha || [];
          const almoco = diaObj.refeicoes.almoco || [];
          const lancheT = diaObj.refeicoes.lanche_tarde || [];
          const jantar = diaObj.refeicoes.jantar || [];

          const mapearRefeicao = (src: any[], dest: string[]) => {
            for (let i = 0; i < 5; i++) {
              dest[i] = typeof src[i] === 'string' ? src[i] : '';
            }
          };

          mapearRefeicao(cafe, novo.dias[diaChave].cafe_manha);
          mapearRefeicao(lancheM, novo.dias[diaChave].lanche_manha);
          mapearRefeicao(almoco, novo.dias[diaChave].almoco);
          mapearRefeicao(lancheT, novo.dias[diaChave].lanche_tarde);
          mapearRefeicao(jantar, novo.dias[diaChave].jantar);
        }
      }
    });
    return novo;
  }

  // 3. Outros formatos legados (refeicoes como array no topo)
  if (Array.isArray(conteudo.refeicoes)) {
    const chavesDias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;
    const mapaRefeicoes: Record<string, 'cafe_manha' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar'> = {
      'Café da Manhã': 'cafe_manha',
      'Lanche da Manhã': 'lanche_manha',
      'Almoço': 'almoco',
      'Lanche da Tarde': 'lanche_tarde',
      'Jantar': 'jantar'
    };

    conteudo.refeicoes.forEach((ref: any) => {
      if (ref && ref.nome) {
        const refChave = mapaRefeicoes[ref.nome];
        if (refChave && Array.isArray(ref.alimentos)) {
          chavesDias.forEach(dia => {
            for (let i = 0; i < 5; i++) {
              novo.dias[dia][refChave][i] = typeof ref.alimentos[i] === 'string' ? ref.alimentos[i] : '';
            }
          });
        }
      }
    });
    return novo;
  }

  return novo;
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

function obterStatusPaciente(consultas: Consulta[]) {
  if (!consultas || consultas.length === 0) {
    return { label: 'Sem Consultas', classe: 'status-sem-consultas' };
  }
  
  const ultima = consultas[0];
  const dataUltima = new Date(ultima.data_consulta + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const temRetornoFuturo = consultas.some(c => {
    if (!c.proximo_retorno) return false;
    const dataRetorno = new Date(c.proximo_retorno + 'T00:00:00');
    return dataRetorno >= hoje;
  });

  if (temRetornoFuturo) {
    return { label: 'Ativo', classe: 'status-ativo' };
  }
  
  const diffTime = hoje.getTime() - dataUltima.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 90) {
    return { label: 'Ativo', classe: 'status-ativo' };
  } else if (diffDays <= 120) {
    return { label: 'Requer atenção (sem retorno)', classe: 'status-alerta' };
  } else {
    return { label: 'Inativo', classe: 'status-inativo' };
  }
}

function obterProximaConsulta(consultas: Consulta[]) {
  if (!consultas || consultas.length === 0) return 'Não agendada';
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const retornosFuturos = consultas
    .filter(c => c.proximo_retorno && new Date(c.proximo_retorno + 'T00:00:00') >= hoje)
    .map(c => c.proximo_retorno as string);
  
  if (retornosFuturos.length > 0) {
    retornosFuturos.sort((a, b) => new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime());
    return formatarData(retornosFuturos[0]);
  }
  
  return 'Não agendada';
}

export default function PacientePerfil() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // --- Estados do Paciente ---
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [consultaMassaMuscular, setConsultaMassaMuscular] = useState('');
  const [consultaImc, setConsultaImc] = useState('');
  const [consultaGrauObesidade, setConsultaGrauObesidade] = useState('');
  const [consultaAnaliseCorpo, setConsultaAnaliseCorpo] = useState('');
  const [consultaObservacoes, setConsultaObservacoes] = useState('');
  const [consultaProximoRetorno, setConsultaProximoRetorno] = useState('');

  // --- Estados de Planos Alimentares ---
  const [planosAlimentares, setPlanosAlimentares] = useState<PlanoAlimentar[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAlimentar | null>(null);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [stepGeracao, setStepGeracao] = useState(0);
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const [modoEdicaoPlano, setModoEdicaoPlano] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<PlanoAlimentarConteudo | null>(null);
  const [idPlanoEditando, setIdPlanoEditando] = useState<string | null>(null);
  const [salvandoPlano, setSalvandoPlano] = useState(false);
  const [diaEdicaoAtivo, setDiaEdicaoAtivo] = useState<'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'>('segunda');
  const [diaVisualizacaoAtivo, setDiaVisualizacaoAtivo] = useState<'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'>('segunda');

  // --- Estados do Calendário e Nutricionista ---
  const [dataCalendario, setDataCalendario] = useState(new Date());
  const [modalNutricionista, setModalNutricionista] = useState(false);

  // --- Estados do WhatsApp / Lembrete ---
  const TEMPLATE_PADRAO_LEMBRETE = `Olá {{nome_paciente}} 😊

Sua próxima consulta na Nutry Kathy será em:

📅 {{data_consulta}}
⏰ {{hora_consulta}}

Para confirmar sua presença clique aqui:
{{link_confirmacao}}

Obrigado 💚`;

  const [modalLembrete, setModalLembrete] = useState(false);
  const [modoEdicaoTemplate, setModoEdicaoTemplate] = useState(false);
  const [lembreteHora, setLembreteHora] = useState('');
  const [lembreteLink, setLembreteLink] = useState('');
  const [templateLembrete, setTemplateLembrete] = useState(() => {
    return localStorage.getItem('nutry_kathy_template_lembrete') || TEMPLATE_PADRAO_LEMBRETE;
  });

  const handleDispararWhatsapp = () => {
    if (!paciente) return;
    
    const proximaConsultaData = obterProximaConsulta(consultas);
    
    let mensagem = templateLembrete
      .replace(/\{\{nome_paciente\}\}/g, paciente.nome)
      .replace(/\{\{data_consulta\}\}/g, proximaConsultaData)
      .replace(/\{\{hora_consulta\}\}/g, lembreteHora || '—')
      .replace(/\{\{link_confirmacao\}\}/g, lembreteLink || '—');
      
    const tel = paciente.whatsapp || paciente.telefone || '';
    // Remove tudo que não for dígito. Se o telefone já incluir DDI não duplica, mas no Brasil por padrão telLimpo não tem 55.
    let telLimpo = tel.replace(/\D/g, '');
    if (telLimpo.length > 0 && !telLimpo.startsWith('55')) {
      telLimpo = '55' + telLimpo;
    }
    
    const url = `https://api.whatsapp.com/send?phone=${telLimpo}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    setModalLembrete(false);
  };

  const handleSalvarTemplateLembrete = (novoTemplate: string) => {
    setTemplateLembrete(novoTemplate);
    localStorage.setItem('nutry_kathy_template_lembrete', novoTemplate);
    setModoEdicaoTemplate(false);
    showToast('Template de lembrete salvo com sucesso!');
  };

  // --- Meses em Português ---
  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Obter data em string local YYYY-MM-DD
  const obterDataLocalStr = (dateObj: Date) => {
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const diasDoMes = () => {
    const ano = dataCalendario.getFullYear();
    const mes = dataCalendario.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    
    let diaSemanaInicial = primeiroDia.getDay(); // 0: Domingo, 1: Segunda...
    diaSemanaInicial = diaSemanaInicial === 0 ? 6 : diaSemanaInicial - 1; // Ajusta para Segunda=0, Domingo=6
    
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const dias: (Date | null)[] = [];
    
    for (let i = 0; i < diaSemanaInicial; i++) {
      dias.push(null);
    }
    for (let i = 1; i <= totalDias; i++) {
      dias.push(new Date(ano, mes, i));
    }
    return dias;
  };

  const mudarMes = (offset: number) => {
    setDataCalendario(prev => {
      const novaData = new Date(prev);
      novaData.setMonth(prev.getMonth() + offset);
      return novaData;
    });
  };

  const consultasNoDia = (dateObj: Date) => {
    const dStr = obterDataLocalStr(dateObj);
    return consultas.filter(c => c.data_consulta === dStr);
  };

  const retornosNoDia = (dateObj: Date) => {
    const dStr = obterDataLocalStr(dateObj);
    return consultas.filter(c => c.proximo_retorno === dStr);
  };

  const handleDiaClick = (dateObj: Date) => {
    const dStr = obterDataLocalStr(dateObj);
    setConsultaData(dStr);
    setConsultaPeso('');
    setConsultaCintura('');
    setConsultaQuadril('');
    setConsultaPercentualGordura('');
    setConsultaMassaMuscular('');
    setConsultaImc('');
    setConsultaGrauObesidade('');
    setConsultaAnaliseCorpo('');
    setConsultaObservacoes('');
    setConsultaProximoRetorno('');
    setModalNovaConsulta(true);
  };

  // --- Mostrar Toast ---
  const showToast = (mensagem: string) => {
    setToast({ mostrar: true, mensagem });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // --- Imprimir Plano Alimentar Completo ---
  const handleImprimirPlanoCompleto = (plano: PlanoAlimentar) => {
    const planoVisualizar = converterParaFormatoManual(plano.conteudo);
    const win = window.open('', '_blank');
    if (!win) {
      alert('Por favor, permita popups para imprimir o plano alimentar.');
      return;
    }

    let htmlDias = '';
    DIAS_MAPA.forEach(({ chave, label }) => {
      let htmlRefeicoes = '';
      let temRefeicao = false;

      REFEICOES_MAPA.forEach(({ chave: refChave, label: refLabel }) => {
        const opcoes = planoVisualizar.dias[chave]?.[refChave] || [];
        const opcoesPreenchidas = opcoes.filter((o: string) => o.trim() !== '');

        if (opcoesPreenchidas.length > 0) {
          temRefeicao = true;
          htmlRefeicoes += `
            <div class="meal-block">
              <div class="meal-header-title">${refLabel}</div>
              <ul class="meal-items">
                ${opcoesPreenchidas.map(op => `<li>${op}</li>`).join('')}
              </ul>
            </div>
          `;
        }
      });

      if (temRefeicao) {
        htmlDias += `
          <div class="day-card">
            <h2 class="day-title">${label}</h2>
            <div class="meals-container">
              ${htmlRefeicoes}
            </div>
          </div>
        `;
      }
    });

    const dataFormatada = new Date(plano.created_at).toLocaleDateString('pt-BR');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Plano Alimentar - ${paciente?.nome || 'Paciente'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 30px;
            background-color: #fff;
          }

          .header {
            border-bottom: 2px solid #e11d48;
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .header-left h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            font-weight: 700;
            color: #be123c;
          }

          .header-left p {
            margin: 0;
            font-size: 14px;
            color: #64748b;
          }

          .header-right {
            text-align: right;
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
          }

          .day-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 15px 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }

          .day-title {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 700;
            color: #be123c;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .meals-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }

          .meal-block {
            background-color: #fff8f8;
            border: 1px solid rgba(225, 29, 72, 0.08);
            border-radius: 6px;
            padding: 10px 12px;
            page-break-inside: avoid;
          }

          .meal-header-title {
            font-weight: 600;
            font-size: 13px;
            color: #be123c;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
          }

          .meal-items {
            margin: 0;
            padding-left: 18px;
            font-size: 12px;
            color: #334155;
            line-height: 1.5;
          }

          .meal-items li {
            margin-bottom: 3px;
          }

          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }

          @media print {
            body {
              padding: 0;
            }
            .day-card {
              box-shadow: none;
              border: 1px solid #e2e8f0;
            }
            .meal-block {
              background-color: #fff;
              border: 1px solid #e2e8f0;
            }
            .meals-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Plano Alimentar Personalizado</h1>
            <p>Paciente: <strong>${paciente?.nome || ''}</strong></p>
          </div>
          <div class="header-right">
            <div>Data de Criação: <strong>${dataFormatada}</strong></div>
            <div>Nutricionista: <strong>Kathy</strong></div>
          </div>
        </div>

        <div class="content">
          ${htmlDias || '<p style="text-align: center; color: #64748b; font-style: italic; padding: 20px;">Nenhum alimento cadastrado neste plano alimentar.</p>'}
        </div>

        <div class="footer">
          Nutry Kathy &copy; 2026 - Todos os direitos reservados.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
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
      const planoGerado = await gerarPlanoAlimentar(
        paciente,
        pesoAtual,
        (step) => setStepGeracao(step)
      );

      // Converte o plano gerado para o formato com abas/manual
      const planoConvertido = converterParaFormatoManual(planoGerado);
      setPlanoEditando(planoConvertido);
      setIdPlanoEditando(null);
      setDiaEdicaoAtivo('segunda');
      setModoEdicaoPlano(true);
      setGerandoPlano(false);
      showToast('Plano alimentar gerado com sucesso! Revise e ajuste as opções abaixo.');
    } catch (err: any) {
      console.error('Erro ao gerar plano:', err);
      setErroGeracao(err?.message || 'Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?');
    }
  };

  // --- Criar Plano Manual do Zero ---
  const handleCriarPlanoManual = () => {
    setPlanoEditando(JSON.parse(JSON.stringify(ESTRUTURA_LIMPA_PLANO)));
    setIdPlanoEditando(null);
    setDiaEdicaoAtivo('segunda');
    setModoEdicaoPlano(true);
    setGerandoPlano(false);
    setErroGeracao(null);
    showToast('Formulário manual de plano alimentar criado.');
  };

  // --- Carregar Plano Existente para Edição ---
  const handleEditarPlano = (plano: PlanoAlimentar) => {
    const planoConvertido = converterParaFormatoManual(plano.conteudo);
    setPlanoEditando(planoConvertido);
    setIdPlanoEditando(plano.id);
    setDiaEdicaoAtivo('segunda');
    setModoEdicaoPlano(true);
    setErroGeracao(null);
    showToast('Plano alimentar carregado para edição.');
  };

  // --- Alterar uma Opção de Refeição no Plano Editando ---
  const handleAlterarOpcao = (
    dia: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo',
    refeicao: keyof RefeicoesDia,
    opcaoIdx: number,
    valor: string
  ) => {
    if (!planoEditando) return;
    
    const novoPlano = JSON.parse(JSON.stringify(planoEditando)) as PlanoAlimentarConteudo;
    if (novoPlano.dias[dia] && Array.isArray(novoPlano.dias[dia][refeicao])) {
      novoPlano.dias[dia][refeicao][opcaoIdx] = valor;
    }
    setPlanoEditando(novoPlano);
  };

  // --- Salvar / Atualizar Plano Alimentar ---
  const handleSalvarPlanoAlimentar = async () => {
    if (!id || !planoEditando) return;
    setSalvandoPlano(true);

    try {
      if (idPlanoEditando) {
        // UPDATE
        const { error: updErr } = await supabase
          .from('planos_alimentares')
          .update({ conteudo: planoEditando })
          .eq('id', idPlanoEditando)
          .eq('paciente_id', id);

        if (updErr) throw updErr;
        showToast('Plano alimentar atualizado com sucesso!');
      } else {
        // INSERT
        const { error: insErr } = await supabase
          .from('planos_alimentares')
          .insert([{ paciente_id: id, conteudo: planoEditando }]);

        if (insErr) throw insErr;
        showToast('Plano alimentar salvo com sucesso!');
      }

      await carregarPlanos();
      setModoEdicaoPlano(false);
      setPlanoEditando(null);
      setIdPlanoEditando(null);
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      alert('Erro ao salvar o plano alimentar. Tente novamente.');
    } finally {
      setSalvandoPlano(false);
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
    setConsultaMassaMuscular('');
    setConsultaImc('');
    setConsultaGrauObesidade('');
    setConsultaAnaliseCorpo('');
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
        massa_muscular: consultaMassaMuscular ? parseFloat(consultaMassaMuscular) : null,
        imc: consultaImc ? parseFloat(consultaImc) : null,
        grau_obesidade: consultaGrauObesidade || null,
        analise_corpo: consultaAnaliseCorpo || null,
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

  if (modoEdicaoPlano && planoEditando) {
    return (
      <main className="page-content edit-plano-layout">
        {salvandoPlano && <FruitLoader mensagem="Salvando plano alimentar..." />}
        {/* Toast local de sucesso */}
        {toast?.mostrar && (
          <div className="toast">
            <CheckCircle size={20} />
            {toast.mensagem}
          </div>
        )}

        <header className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} style={{ color: 'var(--color-primary)' }} />
              {idPlanoEditando ? 'Editando Plano Alimentar' : 'Elaborando Novo Plano Alimentar'}
            </h1>
            <p className="page-subtitle">Revise, edite e personalize o plano alimentar para <strong>{paciente.nome}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => {
                setModoEdicaoPlano(false);
                setPlanoEditando(null);
                setIdPlanoEditando(null);
              }}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn-action" 
              onClick={handleSalvarPlanoAlimentar}
            >
              <CheckCircle size={16} />
              {idPlanoEditando ? 'Atualizar Plano' : 'Salvar Plano Alimentar'}
            </button>
          </div>
        </header>

        {/* Tabs de Dias da Semana */}
        <div className="plano-tabs-container">
          {DIAS_MAPA.map(({ chave, label }) => (
            <button
              key={chave}
              type="button"
              className={`plano-tab-btn ${diaEdicaoAtivo === chave ? 'active' : ''}`}
              onClick={() => setDiaEdicaoAtivo(chave)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid de Refeições */}
        <div className="refeicoes-edit-grid">
          {REFEICOES_MAPA.map(({ chave, label }) => {
            const opcoes = planoEditando.dias[diaEdicaoAtivo]?.[chave] || ['', '', '', '', ''];
            return (
              <div key={chave} className="refeicao-edit-card">
                <div className="refeicao-edit-header">
                  <h3>{label}</h3>
                </div>
                <div className="refeicao-inputs-list">
                  {opcoes.map((opcao, oIdx) => (
                    <div key={oIdx} className="refeicao-input-row">
                      <span className="opcao-badge">{oIdx + 1}</span>
                      <input
                        type="text"
                        className="form-input refeicao-op-input"
                        placeholder={`Opção de alimento ${oIdx + 1}...`}
                        value={opcao}
                        onChange={(e) => handleAlterarOpcao(diaEdicaoAtivo, chave, oIdx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
      {salvandoPaciente && <FruitLoader mensagem="Atualizando cadastro do paciente..." />}
      {salvandoConsulta && <FruitLoader mensagem="Registrando consulta..." />}
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
        <div className="profile-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="profile-name" style={{ margin: 0 }}>{paciente.nome}</h1>
            <div className="profile-meta" style={{ marginTop: '0.25rem' }}>
              {idade && (
                <span>
                  <Calendar size={14} />
                  {idade} ({formatarData(paciente.data_nascimento!)})
                </span>
              )}
              {paciente.sexo && (
                <span>
                  <User size={14} />
                  {paciente.sexo}
                </span>
              )}
              {paciente.email && (
                <span>
                  <Mail size={14} />
                  {paciente.email}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status Badge */}
            {(() => {
              const statusObj = obterStatusPaciente(consultas);
              return (
                <div className={`status-badge-wrapper ${statusObj.classe}`}>
                  <span className="status-dot-pulse" />
                  {statusObj.label}
                </div>
              );
            })()}
            
            {/* Próxima Consulta Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div className="proxima-consulta-topo" title="Próxima consulta ou retorno agendado">
                <Clock size={14} />
                <span>Próxima Consulta: <strong>{obterProximaConsulta(consultas)}</strong></span>
              </div>
              {obterProximaConsulta(consultas) !== 'Não agendada' && (
                <button
                  type="button"
                  className="btn-lembrete-whatsapp"
                  onClick={() => {
                    setLembreteHora('');
                    setLembreteLink('');
                    setModoEdicaoTemplate(false);
                    setModalLembrete(true);
                  }}
                  title="Enviar lembrete da consulta por WhatsApp"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: '#25d366',
                    color: 'white',
                    border: 'none',
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.2)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#128c7e'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#25d366'}
                >
                  <span style={{ fontSize: '0.95rem' }}>💬</span>
                  Enviar Lembrete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Geral do Perfil */}
      <div className="profile-details-grid">
        {/* COLUNA CENTRAL: Dados do Paciente (Abas Editáveis) */}
        {/* COLUNA ESQUERDA: Dados do Paciente (Sem abas, tudo visível) */}
        <section className="patient-left-column" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <form onSubmit={handleSalvarPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Bloco 1: Dados Pessoais */}
            <div className="section-card" style={{ margin: 0 }}>
              <div className="section-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem' }}>
                <h2 className="section-title">
                  <User size={18} style={{ color: 'var(--color-primary)' }} />
                  Dados Pessoais
                </h2>
              </div>
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
                    <span style={{ fontSize: '0.825rem', color: 'var(--color-primary-dark)', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>
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

            {/* Bloco 2: Clínica */}
            <div className="section-card" style={{ margin: 0 }}>
              <div className="section-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem' }}>
                <h2 className="section-title">
                  <Stethoscope size={18} style={{ color: 'var(--color-primary)' }} />
                  Dados Clínicos & Hábitos
                </h2>
              </div>
              
              <p className="form-section-title" style={{ marginTop: 0 }}>Dados Biométricos</p>
              <div className="form-grid-3" style={{ marginBottom: '1.25rem' }}>
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
              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Outros objetivos (texto livre)..." 
                  value={objetivoTexto} 
                  onChange={e => setObjetivoTexto(e.target.value)} 
                />
              </div>

              <p className="form-section-title">Nível de Atividade Física</p>
              <div className="activity-cards" style={{ marginBottom: '1.25rem' }}>
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
              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
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
              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
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
              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Adicionar outras (separar por vírgula)..." 
                  value={alergiasExtra} 
                  onChange={e => setAlergiasExtra(e.target.value)} 
                />
              </div>

              <p className="form-section-title">Medicamentos e Suplementos</p>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
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

              <p className="form-section-title">Hábitos e Rotinas</p>
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
                      <div className="form-group" style={{ marginTop: '0.75rem' }}>
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
              </div>
            </div>

            {/* Bloco 3: Observações */}
            <div className="section-card" style={{ margin: 0 }}>
              <div className="section-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem' }}>
                <h2 className="section-title">
                  <Smile size={18} style={{ color: 'var(--color-primary)' }} />
                  Observações
                </h2>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="observacoes">Observações gerais</label>
                <textarea
                  id="observacoes"
                  className="form-input form-textarea"
                  style={{ minHeight: '120px' }}
                  placeholder="Anotações, preferências alimentares, histórico familiar ou outras observações clínicas..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>
            </div>

            {/* Rodapé da Edição */}
            <div className="form-footer" style={{ marginTop: '0.5rem', background: 'transparent', padding: 0, border: 'none' }}>
              <button 
                type="submit" 
                className="btn-action" 
                disabled={salvandoPaciente}
                style={{ width: '100%', padding: '0.85rem 1.5rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {salvandoPaciente ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

          </form>
        </section>

        {/* COLUNA DIREITA: Agenda, Consultas, Evolução & Planos Alimentares */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SEÇÃO 1: AGENDA & CALENDÁRIO */}
          <article className="calendar-card animate-fade-in">
            <div className="calendar-header">
              <h2 className="calendar-month-title">
                📅 Agenda: {MESES[dataCalendario.getMonth()]} {dataCalendario.getFullYear()}
              </h2>
              <div className="calendar-nav-buttons">
                <button type="button" className="calendar-nav-btn" onClick={() => mudarMes(-1)}>&lt;</button>
                <button type="button" className="calendar-nav-btn" onClick={() => mudarMes(1)}>&gt;</button>
              </div>
            </div>

            <div className="calendar-weekdays-grid">
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>

            <div className="calendar-days-grid">
              {diasDoMes().map((dia, index) => {
                if (dia === null) {
                  return <div key={`empty-${index}`} className="calendar-day-cell empty" />;
                }

                const hoje = new Date();
                const ehHoje = dia.getDate() === hoje.getDate() && 
                              dia.getMonth() === hoje.getMonth() && 
                              dia.getFullYear() === hoje.getFullYear();

                const cons = consultasNoDia(dia);
                const rets = retornosNoDia(dia);
                
                const temConsulta = cons.length > 0;
                const temRetorno = rets.length > 0;

                let cellClass = '';
                if (ehHoje) cellClass += ' today';
                if (temConsulta) cellClass += ' has-consultation';
                if (temRetorno) cellClass += ' has-retorno';

                return (
                  <button
                    key={`day-${dia.getDate()}`}
                    type="button"
                    className={`calendar-day-cell${cellClass}`}
                    onClick={() => handleDiaClick(dia)}
                    title={
                      temConsulta 
                        ? `Consulta em: ${obterDataLocalStr(dia)}` 
                        : temRetorno 
                          ? `Retorno agendado: ${obterDataLocalStr(dia)}`
                          : `Agendar consulta em: ${obterDataLocalStr(dia)}`
                    }
                  >
                    {dia.getDate()}
                    {temConsulta && <span className="calendar-day-dot consultation" />}
                    {temRetorno && <span className="calendar-day-dot retorno" />}
                  </button>
                );
              })}
            </div>
          </article>

          {/* SEÇÃO 2: HISTÓRICO DE CONSULTAS */}
          <section id="secao-consultas" className="section-card" style={{ animationDelay: '0.2s' }}>
            <div className="section-header">
              <h2 className="section-title">
                <Clock size={20} style={{ color: 'var(--color-primary)' }} />
                Histórico de Consultas
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

            {/* Tabela de Composição Corporal */}
            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Análise da Composição Corporal
            </h3>

            {consultas.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Clock size={28} className="empty-state-icon" />
                <h3>Nenhuma consulta registrada</h3>
                <p>Agende uma nova consulta com o paciente para iniciar o acompanhamento.</p>
              </div>
            ) : (
              <div className="composicao-table-wrapper">
                <table className="composicao-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Peso (kg)</th>
                      <th>IMC</th>
                      <th>% Gordura</th>
                      <th>Massa Muscular (kg)</th>
                      <th>Grau de Obesidade</th>
                      <th>Cintura (cm)</th>
                      <th>Quadril (cm)</th>
                      <th>Análise Corporal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultas.map((c, idx) => {
                      // Calcular IMC automaticamente se não foi inserido manualmente
                      const imcCalc = c.imc
                        ? c.imc
                        : c.peso && paciente?.altura
                          ? parseFloat((c.peso / Math.pow(paciente.altura / 100, 2)).toFixed(1))
                          : null;

                      // Calcular grau de obesidade pelo IMC
                      const getGrauObesidade = (imcVal: number | null): { label: string; classe: string } => {
                        if (!imcVal) return { label: '—', classe: '' };
                        if (imcVal < 18.5) return { label: 'Abaixo do peso', classe: 'grau-baixo' };
                        if (imcVal < 25)   return { label: 'Peso saudável', classe: 'grau-saudavel' };
                        if (imcVal < 30)   return { label: 'Sobrepeso', classe: 'grau-sobrepeso' };
                        if (imcVal < 35)   return { label: 'Obesidade Grau I', classe: 'grau-obs1' };
                        if (imcVal < 40)   return { label: 'Obesidade Grau II', classe: 'grau-obs2' };
                        return { label: 'Obesidade Grau III', classe: 'grau-obs3' };
                      };

                      const grau = c.grau_obesidade
                        ? { label: c.grau_obesidade, classe: 'grau-manual' }
                        : getGrauObesidade(imcCalc);

                      const isRecente = idx === 0;

                      return (
                        <tr key={c.id} className={isRecente ? 'row-recente' : ''}>
                          <td>
                            <div className="composicao-data-cell">
                              {isRecente && <span className="badge-recente">Recente</span>}
                              {formatarData(c.data_consulta)}
                            </div>
                          </td>
                          <td>
                            <span className="composicao-val peso-val">
                              {c.peso ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className="composicao-val">
                              {imcCalc ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className="composicao-val gordura-val">
                              {c.percentual_gordura != null ? `${c.percentual_gordura}%` : '—'}
                            </span>
                          </td>
                          <td>
                            <span className="composicao-val muscular-val">
                              {c.massa_muscular ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`grau-badge ${grau.classe}`}>
                              {grau.label}
                            </span>
                          </td>
                          <td>{c.cintura != null ? `${c.cintura}` : '—'}</td>
                          <td>{c.quadril != null ? `${c.quadril}` : '—'}</td>
                          <td>
                            <div className="analise-corpo-cell">
                              {c.analise_corpo || c.observacoes || '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SEÇÃO 3: EVOLUÇÃO DE PESO */}
          <section id="secao-evolucao" className="section-card" style={{ animationDelay: '0.25s' }}>
            <div className="section-header">
              <h2 className="section-title">
                <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
                Evolução de Peso
              </h2>
            </div>

            {/* Gráfico sempre visível */}
            <div className="weight-chart-card" style={{ border: 'none', padding: 0, boxShadow: 'none', margin: 0 }}>
              <div className="chart-svg-wrapper">
                {renderGraficoPeso()}
              </div>
            </div>
          </section>

          {/* SEÇÃO 4: PLANOS ALIMENTARES */}
          <section id="secao-planos" className="section-card" style={{ animationDelay: '0.3s' }}>
            <div className="section-header">
              <h2 className="section-title">
                <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                Planos Alimentares
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn-action" 
                  onClick={handleCriarPlanoManual}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={14} />
                  Novo Plano Alimentar
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleGerarPlano}
                  disabled={gerandoPlano}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {gerandoPlano
                    ? <Loader2 size={14} className="spin-icon" />
                    : <Sparkles size={14} />
                  }
                  {gerandoPlano ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>
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
                      <span className="plano-date">{formatarDataHora(p.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => handleEditarPlano(p)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Visualizar/Editar
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => setPlanoSelecionado(p)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'transparent', backgroundColor: 'transparent', color: 'var(--color-text-light)' }}
                      >
                        Imprimir / Detalhes
                      </button>
                    </div>
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
                    <label className="form-label" htmlFor="consulta-massa">Massa Muscular (kg)</label>
                    <div className="input-suffix-wrapper">
                      <input
                        id="consulta-massa"
                        type="number"
                        step="0.1"
                        min="0"
                        className="form-input"
                        placeholder="Opcional"
                        value={consultaMassaMuscular}
                        onChange={e => setConsultaMassaMuscular(e.target.value)}
                      />
                      <span className="input-suffix">kg</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-gordura">% de Gordura</label>
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
                    <label className="form-label" htmlFor="consulta-imc">IMC (calculado automaticamente)</label>
                    <div className="input-suffix-wrapper">
                      <input
                        id="consulta-imc"
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder={consultaPeso && paciente?.altura ? String(parseFloat((parseFloat(consultaPeso) / Math.pow(paciente.altura / 100, 2)).toFixed(1))) : 'Auto'}
                        value={consultaImc}
                        onChange={e => setConsultaImc(e.target.value)}
                      />
                      <span className="input-suffix">kg/m²</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-grau">Grau de Obesidade</label>
                    <select
                      id="consulta-grau"
                      className="form-input"
                      value={consultaGrauObesidade}
                      onChange={e => setConsultaGrauObesidade(e.target.value)}
                    >
                      <option value="">Calculado automaticamente pelo IMC</option>
                      <option value="Abaixo do peso">Abaixo do peso (&lt; 18,5)</option>
                      <option value="Peso saudável">Peso saudável (18,5 – 24,9)</option>
                      <option value="Sobrepeso">Sobrepeso (25,0 – 29,9)</option>
                      <option value="Obesidade Grau I">Obesidade Grau I (30,0 – 34,9)</option>
                      <option value="Obesidade Grau II">Obesidade Grau II (35,0 – 39,9)</option>
                      <option value="Obesidade Grau III">Obesidade Grau III (≥ 40)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-cintura">Cintura (cm)</label>
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
                    <label className="form-label" htmlFor="consulta-quadril">Quadril (cm)</label>
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
                    <label className="form-label" htmlFor="consulta-retorno">Próximo Retorno</label>
                    <input
                      id="consulta-retorno"
                      type="date"
                      className="form-input"
                      value={consultaProximoRetorno}
                      onChange={e => setConsultaProximoRetorno(e.target.value)}
                    />
                  </div>

                  <div className="form-group form-col-span-2">
                    <label className="form-label" htmlFor="consulta-analise">Análise Corporal</label>
                    <textarea
                      id="consulta-analise"
                      className="form-input form-textarea"
                      placeholder="Avaliação geral da composição corporal, distribuição de gordura, progresso, metas..."
                      value={consultaAnaliseCorpo}
                      onChange={e => setConsultaAnaliseCorpo(e.target.value)}
                      style={{ minHeight: '80px' }}
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
              {(erroGeracao || gerandoPlano) && (
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn-action"
                      style={{ width: '100%' }}
                      onClick={() => { setErroGeracao(null); handleGerarPlano(); }}
                    >
                      Tentar novamente
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: '100%' }}
                      onClick={handleCriarPlanoManual}
                    >
                      Criar Plano Manual
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: '100%', borderColor: 'transparent', color: 'var(--color-text-light)' }}
                      onClick={() => { setGerandoPlano(false); setErroGeracao(null); }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="geracao-steps">
                  <div className="geracao-ai-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <FruitLoader fullScreen={false} />
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
      {planoSelecionado && (() => {
        const planoVisualizar = converterParaFormatoManual(planoSelecionado.conteudo);
        return (
          <div className="modal-backdrop">
            <div className="modal-content plano-modal" style={{ maxWidth: '720px' }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                  Plano Alimentar — {formatarDataHora(planoSelecionado.created_at)}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => handleImprimirPlanoCompleto(planoSelecionado)}
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
                <div>
                  {/* Abas de Dias para Visualização */}
                  <div className="plano-tabs-container visualizacao-tabs" style={{ marginBottom: '1.25rem' }}>
                    {DIAS_MAPA.map(({ chave, label }) => (
                      <button
                        key={chave}
                        type="button"
                        className={`plano-tab-btn ${diaVisualizacaoAtivo === chave ? 'active' : ''}`}
                        onClick={() => setDiaVisualizacaoAtivo(chave)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Refeições do Dia Selecionado */}
                  <div className="refeicoes-visualizar-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {REFEICOES_MAPA.map(({ chave, label }) => {
                      const opcoes = planoVisualizar.dias[diaVisualizacaoAtivo]?.[chave] || [];
                      const opcoesPreenchidas = opcoes.filter((o: string) => o.trim() !== '');

                      if (opcoesPreenchidas.length === 0) return null;

                      return (
                        <div key={chave} className="plano-refeicao" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: 'var(--color-surface)' }}>
                          <div className="plano-refeicao-header" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                            <span className="plano-refeicao-nome">{label}</span>
                          </div>
                          <ul className="plano-alimentos" style={{ listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {opcoesPreenchidas.map((op: string, idx: number) => (
                              <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                <span className="opcao-num">{idx + 1}.</span> {op}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}

                    {/* Caso não tenha nenhuma refeição preenchida no dia */}
                    {REFEICOES_MAPA.every(({ chave }) => {
                      const opcoes = planoVisualizar.dias[diaVisualizacaoAtivo]?.[chave] || [];
                      return opcoes.filter((o: string) => o.trim() !== '').length === 0;
                    }) && (
                      <p style={{ textAlign: 'center', color: 'var(--color-text-light)', fontStyle: 'italic', padding: '1.5rem 0' }}>
                        Nenhuma refeição registrada para este dia.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setPlanoSelecionado(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: LEMBRETE DE CONSULTA VIA WHATSAPP */}
      {modalLembrete && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>💬</span>
                {modoEdicaoTemplate ? 'Editar Template do Lembrete' : 'Enviar Lembrete de Consulta'}
              </h3>
              <button type="button" className="btn-close" onClick={() => setModalLembrete(false)}>
                <X size={18} />
              </button>
            </div>

            {modoEdicaoTemplate ? (
              // MODO EDIÇÃO DO TEMPLATE
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                  Edite o template de mensagem abaixo. Você pode usar as variáveis para preencher dinamicamente os dados do paciente:
                  <br />
                  <code>{"{{nome_paciente}}"}</code>, <code>{"{{data_consulta}}"}</code>, <code>{"{{hora_consulta}}"}</code>, <code>{"{{link_confirmacao}}"}</code>
                </p>
                <div className="form-group">
                  <textarea
                    id="editor-template-lembrete"
                    className="form-input form-textarea"
                    style={{ minHeight: '240px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.4' }}
                    defaultValue={templateLembrete}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModoEdicaoTemplate(false)}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => {
                      const el = document.getElementById('editor-template-lembrete') as HTMLTextAreaElement;
                      if (el) handleSalvarTemplateLembrete(el.value);
                    }}
                  >
                    Salvar Template
                  </button>
                </div>
              </div>
            ) : (
              // MODO VISUALIZAÇÃO E CONFIGURAÇÃO
              <div className="modal-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visualização do Lembrete
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModoEdicaoTemplate(true)}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>✏️</span> Editar
                  </button>
                </div>

                {/* Box de Visualização em Tempo Real (WhatsApp bubble) */}
                <div className="whatsapp-preview-box" style={{
                  backgroundColor: '#efeae2',
                  backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  border: '1px solid #cbd5e1',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  <div className="whatsapp-bubble" style={{
                    backgroundColor: '#ffffff',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    maxWidth: '85%',
                    position: 'relative',
                    fontSize: '0.92rem',
                    lineHeight: '1.5',
                    color: '#111b21',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {templateLembrete
                      .replace(/\{\{nome_paciente\}\}/g, paciente?.nome || '')
                      .replace(/\{\{data_consulta\}\}/g, obterProximaConsulta(consultas))
                      .replace(/\{\{hora_consulta\}\}/g, lembreteHora || '⏰ {{hora_consulta}}')
                      .replace(/\{\{link_confirmacao\}\}/g, lembreteLink || '🔗 {{link_confirmacao}}')}
                  </div>
                </div>

                {/* Inputs de Configuração da Hora e Link */}
                <div className="form-grid" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="lembrete-hora">Horário da Consulta</label>
                    <input
                      id="lembrete-hora"
                      type="text"
                      className="form-input"
                      placeholder="Ex: 14:00"
                      value={lembreteHora}
                      onChange={(e) => setLembreteHora(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lembrete-link">Link de Confirmação</label>
                    <input
                      id="lembrete-link"
                      type="url"
                      className="form-input"
                      placeholder="Ex: https://nutrykathy.com/confirm"
                      value={lembreteLink}
                      onChange={(e) => setLembreteLink(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModalLembrete(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-action"
                    onClick={handleDispararWhatsapp}
                    disabled={!lembreteHora}
                    style={{
                      backgroundColor: '#25d366',
                      borderColor: '#25d366',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
                    }}
                  >
                    <span>💬</span> Enviar por WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: INFORMAÇÕES DA NUTRICIONISTA */}
      {modalNutricionista && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Nutricionista Responsável</h3>
              <button type="button" className="btn-close" onClick={() => setModalNutricionista(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body nutri-details-modal" style={{ padding: '2rem' }}>
              <div className="nutri-avatar-wrapper">
                <div className="nutri-avatar-circle">
                  <User size={48} />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Kathy Maia</h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-dark)', fontWeight: 700, padding: '0.25rem 0.75rem', background: 'rgba(225, 29, 72, 0.05)', borderRadius: 'var(--radius-full)' }}>
                  CRN-4 260527
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="nutri-info-row">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="nutri-info-label">Especialidade</span>
                    <span className="nutri-info-value">Nutrição Esportiva e Metabólica</span>
                  </div>
                </div>

                <div className="nutri-info-row">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="nutri-info-label">E-mail de Contato</span>
                    <span className="nutri-info-value">kathy.nutri@example.com</span>
                  </div>
                </div>

                <div className="nutri-info-row">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="nutri-info-label">Telefone / WhatsApp</span>
                    <span className="nutri-info-value">(11) 98765-4321</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => setModalNutricionista(false)}>
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
