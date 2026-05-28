// Helper para geração de planos alimentares semanais via API Backend

export interface RefeicoesDia {
  cafe_da_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

export interface DiaPlano {
  dia: string; // 'Segunda-feira', 'Terça-feira', etc.
  refeicoes: RefeicoesDia;
}

export interface PlanoSemanalGerado {
  plano_semanal: DiaPlano[];
}

export interface DadosPaciente {
  nome: string;
  data_nascimento?: string | null;
  sexo?: string | null;
  peso_inicial?: number | null;
  altura?: number | null;
  objetivos?: string[] | null;
  objetivo_texto?: string | null;
  nivel_atividade?: string | null;
  patologias?: string[] | null;
  restricoes_alimentares?: string[] | null;
  alergias?: string[] | null;
  medicamentos?: string | null;
  suplementos?: string | null;
  refeicoes_por_dia?: number | null;
  horario_acorda?: string | null;
  horario_dorme?: string | null;
  litros_agua?: number | null;
  atividade_fisica?: boolean | null;
  atividade_fisica_descricao?: string | null;
  observacoes?: string | null;
}

export async function gerarPlanoAlimentar(
  paciente: DadosPaciente,
  pesoAtual?: number | null,
  onStep?: (step: number) => void
): Promise<PlanoSemanalGerado> {
  // Step 1: Analisando dados
  onStep?.(1);

  // Step 2: Consultando IA (Chama a Serverless Function do Backend)
  onStep?.(2);
  const response = await fetch('/api/gerar-plano', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      paciente,
      pesoAtual
    })
  });

  // Step 3: Processando resposta
  onStep?.(3);

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody?.error || `Erro HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const plano: PlanoSemanalGerado = await response.json();

  // Validação mínima da estrutura recebida
  if (!plano || !Array.isArray(plano.plano_semanal) || plano.plano_semanal.length === 0) {
    throw new Error('O plano gerado pela IA não contém a estrutura semanal esperada.');
  }

  // Validar se cada dia possui refeições válidas
  plano.plano_semanal.forEach((dia, index) => {
    if (!dia.dia || !dia.refeicoes) {
      throw new Error(`O dia no índice ${index} não possui a estrutura correta.`);
    }
    const chaves = ['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'];
    chaves.forEach(chave => {
      const items = (dia.refeicoes as any)[chave];
      if (!Array.isArray(items)) {
        throw new Error(`A refeição ${chave} do dia ${dia.dia} deve ser uma lista de opções.`);
      }
    });
  });

  return plano;
}
