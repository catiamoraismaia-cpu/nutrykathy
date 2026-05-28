import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

function calcularIdade(dataNascimento: string): number {
  const nascimento = new Date(dataNascimento + 'T00:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

function formatarDadosPaciente(paciente: any, pesoAtual: any): string {
  const idade = paciente.data_nascimento ? `${calcularIdade(paciente.data_nascimento)} anos` : 'Não informada';
  const objetivosList = [...(paciente.objetivos || [])];
  if (paciente.objetivo_texto) objetivosList.push(paciente.objetivo_texto);

  const patologiasList = paciente.patologias || [];
  const restricoesList = paciente.restricoes_alimentares || [];
  const alergiasList = paciente.alergias || [];

  return `
- Nome do Paciente: ${paciente.nome || 'Não informado'}
- Idade: ${idade}
- Sexo: ${paciente.sexo || 'Não informado'}
- Peso atual/referência: ${pesoAtual || paciente.peso_inicial || 'Não informado'} kg
- Altura: ${paciente.altura || 'Não informada'} cm
- Objetivos principais: ${objetivosList.length > 0 ? objetivosList.join(', ') : 'Não informado'}
- Nível de atividade física: ${paciente.nivel_atividade || 'Não informado'}
- Pratica atividade física?: ${paciente.atividade_fisica ? `Sim (${paciente.atividade_fisica_descricao || ''})` : 'Não'}
- Condições clínicas (Patologias): ${patologiasList.length > 0 ? patologiasList.join(', ') : 'Nenhuma'}
- Restrições alimentares: ${restricoesList.length > 0 ? restricoesList.join(', ') : 'Nenhuma'}
- Alergias alimentares: ${alergiasList.length > 0 ? alergiasList.join(', ') : 'Nenhuma'}
- Medicamentos de uso contínuo: ${paciente.medicamentos || 'Nenhum'}
- Suplementos alimentares em uso: ${paciente.suplementos || 'Nenhum'}
- Hábitos:
  - Refeições por dia: ${paciente.refeicoes_por_dia || 'Não informado'}
  - Ingestão de água recomendada/atual: ${paciente.litros_agua || 'Não informado'} litros/dia
  - Horário de acordar: ${paciente.horario_acorda || 'Não informado'}
  - Horário de dormir: ${paciente.horario_dorme || 'Não informado'}
- Observações adicionais do nutricionista: ${paciente.observacoes || 'Nenhuma'}
  `.trim();
}

export default async function handler(req: any, res: any) {
  // Adicionar cabeçalhos de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { paciente, pesoAtual } = req.body;

    if (!paciente) {
      return res.status(400).json({ error: 'Dados do paciente são obrigatórios' });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'COLOQUE_SUA_CHAVE_AQUI') {
      return res.status(500).json({ error: 'Chave da API do Gemini não configurada no servidor.' });
    }

    const dadosPacienteFormatados = formatarDadosPaciente(paciente, pesoAtual);

    const prompt = `
Você é um nutricionista clínico profissional especialista na culinária e rotina brasileira.
Gere um plano alimentar semanal completo, saudável e diversificado com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Metas, Alergias, Restrições e Histórico):
${dadosPacienteFormatados}

⚠️ Regras Críticas de Execução:
- Você deve responder APENAS e estritamente o objeto JSON solicitado.
- Não inclua blocos de código markdown (como \`\`\`json ... \`\`\`), explicações, introduções ou textos complementares.
- Adapte o cardápio rigorosamente a quaisquer alergias ou restrições descritas nos dados.
- Utilize alimentos comuns, acessíveis e culturalmente aceitos no Brasil.
- Evite repetições monótonas de alimentos nos dias seguidos.

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "plano_semanal": [
    {
      "dia": "Segunda-feira",
      "refeicoes": {
        "cafe_da_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "lanche_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "almoco": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "lanche_tarde": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "jantar": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"]
      }
    },
    // ... repetir estruturado para os 7 dias da semana (Segunda a Domingo)
  ]
}
    `.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            plano_semanal: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  dia: {
                    type: SchemaType.STRING,
                    description: 'Dia da semana por extenso em português (ex: Segunda-feira, Terça-feira, etc.)'
                  },
                  refeicoes: {
                    type: SchemaType.OBJECT,
                    properties: {
                      cafe_da_manha: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: '5 opções saudáveis e práticas para o café da manhã brasileiro'
                      },
                      lanche_manha: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: '5 opções saudáveis e práticas para o lanche da manhã brasileiro'
                      },
                      almoco: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: '5 opções saudáveis e práticas para o almoço brasileiro'
                      },
                      lanche_tarde: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: '5 opções saudáveis e práticas para o lanche da tarde brasileiro'
                      },
                      jantar: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: '5 opções saudáveis e práticas para o jantar brasileiro'
                      }
                    },
                    required: ['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar']
                  }
                },
                required: ['dia', 'refeicoes']
              }
            }
          },
          required: ['plano_semanal']
        }
      }
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = result.response.text();
    const planoJson = JSON.parse(responseText);

    return res.status(200).json(planoJson);
  } catch (error: any) {
    console.error('Erro ao gerar plano:', error);
    return res.status(500).json({
      error: 'Erro na API Gemini: Falha ao gerar plano alimentar estruturado.',
      details: error?.message || String(error)
    });
  }
}
