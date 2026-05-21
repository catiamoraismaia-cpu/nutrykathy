// Helper para geração de planos alimentares via Google Gemini API

export interface RefeicaoPlano {
  nome: string;
  horario?: string;
  alimentos: string[];
  observacoes?: string;
}

export interface PlanoGerado {
  nome_plano: string;
  objetivo_geral?: string;
  calorias_estimadas?: string;
  refeicoes: RefeicaoPlano[];
  dicas_gerais?: string[];
  observacoes_nutricionais?: string;
}

interface DadosPaciente {
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

function calcularIdade(dataNascimento: string): number {
  const nascimento = new Date(dataNascimento + 'T00:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

function calcularIMC(peso: number, altura: number): string {
  const altMetros = altura / 100;
  const imc = peso / (altMetros * altMetros);
  if (imc < 18.5) return `${imc.toFixed(1)} (Baixo peso)`;
  if (imc < 25) return `${imc.toFixed(1)} (Peso saudável)`;
  if (imc < 30) return `${imc.toFixed(1)} (Sobrepeso)`;
  return `${imc.toFixed(1)} (Obesidade)`;
}

function montarPrompt(paciente: DadosPaciente, pesoAtual?: number | null): string {
  const linhas: string[] = [];

  linhas.push('Você é uma nutricionista especialista com mais de 15 anos de experiência clínica.');
  linhas.push('Crie um plano alimentar semanal detalhado, PERSONALIZADO e PROFISSIONAL para o seguinte paciente:');
  linhas.push('');
  linhas.push('## DADOS DO PACIENTE');
  linhas.push(`- **Nome:** ${paciente.nome}`);

  if (paciente.data_nascimento) {
    const idade = calcularIdade(paciente.data_nascimento);
    linhas.push(`- **Idade:** ${idade} anos`);
  }

  if (paciente.sexo) linhas.push(`- **Sexo:** ${paciente.sexo}`);

  const pesoRef = pesoAtual ?? paciente.peso_inicial;
  if (pesoRef) linhas.push(`- **Peso atual:** ${pesoRef} kg`);
  if (paciente.altura) linhas.push(`- **Altura:** ${paciente.altura} cm`);

  if (pesoRef && paciente.altura) {
    linhas.push(`- **IMC:** ${calcularIMC(pesoRef, paciente.altura)}`);
  }

  linhas.push('');
  linhas.push('## OBJETIVOS');
  const objetivosList: string[] = [];
  if (paciente.objetivos && paciente.objetivos.length > 0) {
    objetivosList.push(...paciente.objetivos);
  }
  if (paciente.objetivo_texto) objetivosList.push(paciente.objetivo_texto);
  linhas.push(objetivosList.length > 0 ? objetivosList.map(o => `- ${o}`).join('\n') : '- Não informado');

  linhas.push('');
  linhas.push('## ATIVIDADE FÍSICA');
  linhas.push(`- **Nível de atividade:** ${paciente.nivel_atividade || 'Não informado'}`);
  if (paciente.atividade_fisica === true) {
    linhas.push(`- **Pratica atividade física:** Sim${paciente.atividade_fisica_descricao ? ` — ${paciente.atividade_fisica_descricao}` : ''}`);
  } else if (paciente.atividade_fisica === false) {
    linhas.push('- **Pratica atividade física:** Não');
  }

  linhas.push('');
  linhas.push('## SAÚDE E CONDIÇÕES CLÍNICAS');
  if (paciente.patologias && paciente.patologias.length > 0 && !paciente.patologias.includes('Nenhum')) {
    linhas.push(`- **Patologias/Condições:** ${paciente.patologias.join(', ')}`);
  } else {
    linhas.push('- **Patologias/Condições:** Nenhuma relevante');
  }

  if (paciente.restricoes_alimentares && paciente.restricoes_alimentares.length > 0 && !paciente.restricoes_alimentares.includes('Nenhum')) {
    linhas.push(`- **Restrições alimentares:** ${paciente.restricoes_alimentares.join(', ')}`);
  } else {
    linhas.push('- **Restrições alimentares:** Nenhuma');
  }

  if (paciente.alergias && paciente.alergias.length > 0 && !paciente.alergias.includes('Nenhum')) {
    linhas.push(`- **Alergias alimentares:** ${paciente.alergias.join(', ')}`);
  } else {
    linhas.push('- **Alergias alimentares:** Nenhuma');
  }

  if (paciente.medicamentos) linhas.push(`- **Medicamentos contínuos:** ${paciente.medicamentos}`);
  if (paciente.suplementos) linhas.push(`- **Suplementos em uso:** ${paciente.suplementos}`);

  linhas.push('');
  linhas.push('## HÁBITOS E ROTINA');
  if (paciente.refeicoes_por_dia) linhas.push(`- **Refeições por dia:** ${paciente.refeicoes_por_dia}`);
  if (paciente.horario_acorda) linhas.push(`- **Acorda às:** ${paciente.horario_acorda}`);
  if (paciente.horario_dorme) linhas.push(`- **Dorme às:** ${paciente.horario_dorme}`);
  if (paciente.litros_agua) linhas.push(`- **Ingestão de água:** ${paciente.litros_agua} litros/dia`);
  if (paciente.observacoes) linhas.push(`- **Observações da nutricionista:** ${paciente.observacoes}`);

  linhas.push('');
  linhas.push('## INSTRUÇÕES PARA O PLANO');
  linhas.push('- Crie um plano completo para 1 dia típico (que pode ser repetido com variações semanais)');
  linhas.push('- Inclua TODAS as refeições do dia com horários baseados nos hábitos do paciente');
  linhas.push('- Os alimentos devem ser práticos, acessíveis e com porções bem definidas');
  linhas.push('- Respeite RIGOROSAMENTE todas as restrições alimentares e alergias');
  linhas.push('- Leve em conta todas as patologias e condições clínicas informadas');
  linhas.push('- Use linguagem clara e acessível, sem jargões técnicos desnecessários');
  linhas.push('- Inclua dicas nutricionais práticas relevantes para os objetivos do paciente');

  linhas.push('');
  linhas.push('## FORMATO DE RESPOSTA OBRIGATÓRIO');
  linhas.push('Responda SOMENTE com um JSON válido, sem texto antes ou depois, no formato abaixo:');
  linhas.push('');
  linhas.push(JSON.stringify({
    nome_plano: `Plano Alimentar — ${paciente.nome}`,
    objetivo_geral: "Descrição clara do objetivo principal do plano",
    calorias_estimadas: "XXXX kcal/dia",
    refeicoes: [
      {
        nome: "Café da Manhã",
        horario: "07:00",
        alimentos: [
          "2 ovos mexidos com azeite",
          "1 fatia de pão integral",
          "1 xícara de café sem açúcar",
          "1 fruta da estação"
        ],
        observacoes: "Observação específica se necessário"
      }
    ],
    dicas_gerais: [
      "Dica prática e relevante para os objetivos do paciente",
      "Outra dica importante"
    ],
    observacoes_nutricionais: "Observações clínicas gerais importantes para o acompanhamento"
  }, null, 2));

  return linhas.join('\n');
}

export async function gerarPlanoAlimentar(
  paciente: DadosPaciente,
  pesoAtual?: number | null,
  onStep?: (step: number) => void
): Promise<PlanoGerado> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'COLOQUE_SUA_CHAVE_AQUI') {
    throw new Error(
      'Chave da API Gemini não configurada. Acesse aistudio.google.com/app/apikey para obter sua chave gratuita e adicione-a ao arquivo .env.local como VITE_GEMINI_API_KEY=sua_chave.'
    );
  }

  // Step 1: Preparando dados
  onStep?.(1);
  const prompt = montarPrompt(paciente, pesoAtual);

  // Step 2: Chamando IA
  onStep?.(2);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody?.error?.message || `Erro HTTP ${response.status}`;
    if (response.status === 400 && errMsg.toLowerCase().includes('api key')) {
      throw new Error('Chave de API inválida. Verifique o valor de VITE_GEMINI_API_KEY no arquivo .env.local.');
    }
    throw new Error(`Erro na API Gemini: ${errMsg}`);
  }

  const data = await response.json();
  const textoResposta: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Step 3: Processando resposta
  onStep?.(3);

  // Extrair JSON da resposta (remover possível markdown ```json ... ```)
  const jsonMatch = textoResposta.match(/```json\s*([\s\S]*?)\s*```/) ||
                    textoResposta.match(/```\s*([\s\S]*?)\s*```/) ||
                    null;

  const jsonStr = jsonMatch ? jsonMatch[1] : textoResposta.trim();

  let plano: PlanoGerado;
  try {
    plano = JSON.parse(jsonStr);
  } catch {
    // Tentar encontrar o JSON mesmo sem delimitadores
    const startIdx = textoResposta.indexOf('{');
    const endIdx = textoResposta.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      plano = JSON.parse(textoResposta.slice(startIdx, endIdx + 1));
    } else {
      throw new Error('A IA não retornou um plano no formato esperado. Tente novamente.');
    }
  }

  // Validação mínima
  if (!plano.refeicoes || !Array.isArray(plano.refeicoes) || plano.refeicoes.length === 0) {
    throw new Error('O plano gerado não contém refeições. Tente novamente.');
  }

  return plano;
}
