import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Stethoscope, Leaf, ArrowLeft, CheckCircle } from 'lucide-react';

// --- Opções de múltipla escolha ---
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

function calcularIMC(peso: string, altura: string): { valor: number; classe: string; label: string } | null {
  const p = parseFloat(peso);
  const a = parseFloat(altura) / 100;
  if (!p || !a) return null;
  const imc = p / (a * a);
  let classe = '';
  let label = '';
  if (imc < 18.5) { classe = 'baixo'; label = 'Baixo Peso'; }
  else if (imc < 25) { classe = 'saudavel'; label = 'Saudável'; }
  else if (imc < 30) { classe = 'sobrepeso'; label = 'Sobrepeso'; }
  else { classe = 'obesidade'; label = 'Obesidade'; }
  return { valor: parseFloat(imc.toFixed(1)), classe, label };
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

function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return nums.length ? `(${nums}` : '';
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  return valor;
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

export default function PacientesCadastro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(false);

  // --- Aba 1: Pessoal ---
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // --- Aba 2: Clínico ---
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

  // --- Aba 3: Hábitos ---
  const [refeicoesDia, setRefeicoesDia] = useState('');
  const [horarioAcordaInput, setHorarioAcordaInput] = useState('');
  const [horarioDormeInput, setHorarioDormeInput] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [praticaAtividade, setPraticaAtividade] = useState<boolean | null>(null);
  const [atividadeDescricao, setAtividadeDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const imc = calcularIMC(peso, altura);
  const idade = calcularIdade(dataNascimento);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setAbaAtiva('pessoal');
      return;
    }
    if (!user) return;
    setSalvando(true);

    try {
      const horarioAcorda = converterHorario(horarioAcordaInput) || null;
      const horarioDorme = converterHorario(horarioDormeInput) || null;

      const patologiasFinal = combinarArray(patologias, patologiaExtra);
      const restricoesFinal = combinarArray(restricoes, restricaoExtra);
      const alergiassFinal = combinarArray(alergias, alergiasExtra);
      const objetivosFinal = combinarArray(objetivos, '');

      const payload: Record<string, unknown> = {
        nutricionista_id: user.id,
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
        alergias: alergiassFinal.length > 0 ? alergiassFinal : null,
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

      const { data, error } = await supabase
        .from('pacientes')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;

      setToast(true);
      setTimeout(() => {
        navigate(`/pacientes/${data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="page-content">
      {/* Toast de sucesso */}
      {toast && (
        <div className="toast">
          <CheckCircle size={20} />
          Paciente cadastrado com sucesso!
        </div>
      )}

      {/* Cabeçalho */}
      <header className="page-header">
        <div>
          <Link to="/pacientes" className="btn-secondary" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="page-title">Novo Paciente</h1>
          <p className="page-subtitle">Preencha os dados do paciente nas abas abaixo</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          {/* Navegação de abas */}
          <div className="tabs-header">
            <button type="button" className={`tab-btn ${abaAtiva === 'pessoal' ? 'active' : ''}`} onClick={() => setAbaAtiva('pessoal')}>
              <User size={16} />
              Pessoal
            </button>
            <button type="button" className={`tab-btn ${abaAtiva === 'clinico' ? 'active' : ''}`} onClick={() => setAbaAtiva('clinico')}>
              <Stethoscope size={16} />
              Clínico
            </button>
            <button type="button" className={`tab-btn ${abaAtiva === 'habitos' ? 'active' : ''}`} onClick={() => setAbaAtiva('habitos')}>
              <Leaf size={16} />
              Hábitos
            </button>
          </div>

          {/* ======== ABA 1: PESSOAL ======== */}
          <div className={`tab-content ${abaAtiva === 'pessoal' ? 'visible' : ''}`}>
            <div className="form-grid">
              <div className="form-group form-col-span-2">
                <label className="form-label required" htmlFor="nome">Nome completo</label>
                <input id="nome" type="text" className="form-input" placeholder="Ex: Ana Paula Silva" value={nome} onChange={e => setNome(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="data-nascimento">Data de nascimento</label>
                <input id="data-nascimento" type="date" className="form-input" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                {idade && (
                  <span style={{ fontSize: '0.825rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                    🎂 {idade}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sexo">Sexo</label>
                <select id="sexo" className="form-input form-select" value={sexo} onChange={e => setSexo(e.target.value)}>
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
                <input id="email" type="email" className="form-input" placeholder="paciente@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ======== ABA 2: CLÍNICO ======== */}
          <div className={`tab-content ${abaAtiva === 'clinico' ? 'visible' : ''}`}>
            {/* Peso, Altura e IMC */}
            <p className="form-section-title">Dados Biométricos</p>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="peso">Peso atual</label>
                <div className="input-suffix-wrapper">
                  <input id="peso" type="number" step="0.1" min="0" className="form-input" placeholder="0,0" value={peso} onChange={e => setPeso(e.target.value)} />
                  <span className="input-suffix">kg</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="altura">Altura</label>
                <div className="input-suffix-wrapper">
                  <input id="altura" type="number" step="1" min="0" className="form-input" placeholder="0" value={altura} onChange={e => setAltura(e.target.value)} />
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

            {/* Objetivos */}
            <p className="form-section-title">Objetivos</p>
            <ChipGroup opcoes={OPCOES_OBJETIVOS} selecionados={objetivos} onChange={setObjetivos} />
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Outros objetivos (texto livre)..." value={objetivoTexto} onChange={e => setObjetivoTexto(e.target.value)} />
            </div>

            {/* Nível de atividade */}
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

            {/* Patologias */}
            <p className="form-section-title">Patologias / Condições de Saúde</p>
            <ChipGroup opcoes={OPCOES_PATOLOGIAS} selecionados={patologias} onChange={setPatologias} comNenhum />
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Adicionar outras (separar por vírgula)..." value={patologiaExtra} onChange={e => setPatologiaExtra(e.target.value)} />
            </div>

            {/* Restrições */}
            <p className="form-section-title">Restrições Alimentares</p>
            <ChipGroup opcoes={OPCOES_RESTRICOES} selecionados={restricoes} onChange={setRestricoes} comNenhum />
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Adicionar outras (separar por vírgula)..." value={restricaoExtra} onChange={e => setRestricaoExtra(e.target.value)} />
            </div>

            {/* Alergias */}
            <p className="form-section-title">Alergias Alimentares</p>
            <ChipGroup opcoes={OPCOES_ALERGIAS} selecionados={alergias} onChange={setAlergias} comNenhum />
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Adicionar outras (separar por vírgula)..." value={alergiasExtra} onChange={e => setAlergiasExtra(e.target.value)} />
            </div>

            {/* Medicamentos e Suplementos */}
            <p className="form-section-title">Medicamentos e Suplementos</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="medicamentos">Medicamentos contínuos</label>
                <textarea id="medicamentos" className="form-input form-textarea" placeholder="Liste os medicamentos em uso..." value={medicamentos} onChange={e => setMedicamentos(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="suplementos">Suplementos em uso</label>
                <textarea id="suplementos" className="form-input form-textarea" placeholder="Liste os suplementos em uso..." value={suplementos} onChange={e => setSuplementos(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ======== ABA 3: HÁBITOS ======== */}
          <div className={`tab-content ${abaAtiva === 'habitos' ? 'visible' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="refeicoes">Refeições por dia</label>
                <input id="refeicoes" type="number" min="1" max="12" className="form-input" placeholder="Ex: 5" value={refeicoesDia} onChange={e => setRefeicoesDia(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="agua">Quantidade de água por dia</label>
                <div className="input-suffix-wrapper">
                  <input id="agua" type="number" step="0.1" min="0" className="form-input" placeholder="Ex: 2" value={litrosAgua} onChange={e => setLitrosAgua(e.target.value)} />
                  <span className="input-suffix">litros</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="horario-acorda">Horário que acorda</label>
                <input
                  id="horario-acorda"
                  type="text"
                  className="form-input"
                  placeholder="Ex: 630 → 06:30"
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
                  placeholder="Ex: 2230 → 22:30"
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
                        placeholder="Ex: Musculação 3x por semana, caminhada 2x por semana..."
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
                  placeholder="Informações adicionais relevantes sobre o paciente..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Rodapé do formulário */}
          <div className="form-footer">
            <Link to="/pacientes" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-action" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Paciente'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
