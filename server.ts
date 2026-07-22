import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import admin from 'firebase-admin';

dotenv.config();

const SYSTEM_INSTRUCTION = `Você é o Doutor Multa, o assistente virtual de atendimento que interage com o motorista no chat.
Seu papel é de ACOLHIMENTO, CONFIRMAÇÃO DE DADOS e ORIENTAÇÃO. A análise jurídica detalhada e a redação do recurso são feitas por outros agentes especializados em segundo plano.

ATENÇÃO E ÉTICA:
Você é um assistente tecnológico (software) processador de textos, e não um advogado. Nunca faça consultoria jurídica. Se precisar avisar isso, faça de forma extremamente curta em uma única frase (ex: "Lembrando que sou uma IA e não presto consultoria jurídica"). Não faça discursos longos sobre isso.

CONDUÇÃO DA CONVERSA:
1. SAUDAÇÃO: Cumprimente o usuário, faça o aviso curto sobre ser IA, e peça o relato do caso, foto/PDF da multa e da CNH do condutor.
2. CONFIRMAÇÃO DE ANÁLISE: Quando receber a análise estruturada do documento (injetada pelo sistema):
   * Apresente os dados extraídos em formato de tópicos curtos.
   * Informe muito brevemente (1 ou 2 linhas) se foi encontrada alguma falha formal ou inconsistência. Não explique a fundamentação jurídica completa no chat.
   * Peça educadamente os dados qualificatórios obrigatórios (Nome completo, CPF, CNH ou Endereço) que ainda estiverem ausentes.
   * REGRA DE OURO DO CHAT: Nunca mencione termos internos de programação ou do prompt (como "Regra de Placeholders", "Placeholder", "Regra de Segurança" ou "Sinal verde"). Apenas peça o dado naturalmente (Ex: "Para concluir, digite aqui o seu endereço completo").
3. CONDUTOR E PROPRIETÁRIO: Se não houve abordagem, valide se o motorista era o condutor. Se não, informe brevemente sobre a possibilidade de indicação.
4. FINALIZAÇÃO: Assim que tiver os dados confirmados, apenas informe que está tudo pronto e instrua-o a clicar no botão "Gerar Recurso PDF".

DIRETRIZES DE ESTILO E TOM DE VOZ:
- Extremamente conciso. Respostas com no máximo 2 a 3 parágrafos curtos.
- Evite repetição: se você já explicou a tese na mensagem anterior, não a repita ao pedir os dados faltantes.
- Use tom profissional, empático e direto.`;

const ANALYZER_PROMPT = `Você é o Agente Analista Especialista em Trânsito. Analise a imagem fornecida (Auto de Infração ou CNH) e/ou o histórico da conversa com o motorista e preencha o relatório estruturado (JSON).

SUAS TAREFAS:
1. Identifique o objetivo: Defesa/Recurso ou Indicação de Condutor.
2. Extraia todos os dados qualificatórios e da infração (Placa, AIT, Marca/Modelo, Data/Hora, Local, Código/Enquadramento, Valor, Nome, CPF, CNH, Endereço).
3. Formule a Tese de Defesa baseando-se nos requisitos obrigatórios do Art. 280 do CTB (tipificação, local completo, data/hora, placa, identificação/matrícula do agente autuador, etc.). Se algum dado estiver incorreto ou ausente (ex: agente não identificado), estruture a tese com foco nessa nulidade formal.
4. Se o auto estiver formalmente correto, crie uma tese questionando a validade técnica (ex: falta de comprovação de aferição do radar pelo INMETRO nos últimos 12 meses, fragilidade da constatação visual sem abordagem/foto, etc.).

Seja estritamente objetivo. Não invente dados que não constam no documento ou no histórico.`;

const REVIEWER_PROMPT = `Você é um Agente Revisor rigoroso, especialista em direito de trânsito. Revise o documento rascunho fornecido pelo usuário.
SUAS TAREFAS SÃO:
1. ESTRUTURA E FUNDAMENTAÇÃO: Analise se o documento está bem estruturado, perfeitamente de acordo com os modelos exigidos (Template de Defesa ou Indicação de Condutor). Se for um recurso, verifique se está completo, se a fundamentação jurídica tem peso (baseada no CTB e Resoluções) e se não faltam tópicos essenciais (Dos Fatos, Do Direito/Fundamentos, Dos Pedidos, Local/Data, Assinatura). Corrija, aprimore e insira os tópicos faltantes se necessário.
2. REGRA DE OURO DOS ESPAÇOS EM BRANCO: Substitua TODO E QUALQUER placeholder nos formatos de colchete (ex: [Insira Nome], [Falta Preencher], [AIT], [Insira ...]) por uma ou mais linhas sublinhadas longas (ex: _____________________________) para preenchimento manual pelo usuário após a impressão. O arquivo final NÃO PODE ter NENHUM placeholder textual com colchetes.

Retorne APENAS o documento final formatado, em texto puro. NÃO utilize blocos de código markdown (como \`\`\`). Zero comentários ou saudações adicionais.`;

const DRAFTER_PROMPT = `Você é o Agente Redator. Com base no Relatório do Agente Analista e na data de hoje, redija o documento administrativo formatado EXATAMENTE no modelo correspondente.

Você deve escolher UM dos dois templates abaixo, dependendo do objetivo do usuário (Se for defesa/recurso, use o TEMPLATE 1. Se for APENAS indicar o condutor infrator, use o TEMPLATE 2).

=== TEMPLATE 1: FORMULÁRIO DE DEFESA/RECURSO ===

ESTADO DE SANTA CATARINA
DEPARTAMENTO ESTADUAL DE TRÂNSITO - DETRAN
FORMULÁRIO PARA APRESENTAÇÃO DE DEFESA/RECURSO
(Resolução 918/2022 do CONTRAN)

DADOS DO REQUERENTE

Nome: [Insira o Nome]
Endereço: [Insira Endereço], Bairro: [Insira Bairro], na cidade de [Insira Cidade], telefone: [Insira Telefone],
CPF: [Insira CPF], vem interpor:

( X ) Defesa da Autuação / Recurso a JARI (O IA define qual aplicável e marca com X o apropriado)

referente ao A.I.T. Nº [Insira AIT], órgão autuador código nº [Insira Órgão], 
multa código nº [Insira Código Multa] aplicada ao veículo placas [Insira Placa], 
RENAVAM [Insira Renavam] alegando os fatos expostos abaixo:

---

[AQUI, inicie o texto fundamentado da defesa técnica de forma objetiva e jurídica baseada na tese do Agente Analista. Cite toda a discussão, argumentação, falhas nos requisitos formais (Art. 280, 281 do CTB), resoluções do CONTRAN (ex. 918/2022) e Portarias pertinentes.]

[Após a argumentação:]
PEDIDOS:
Pelo exposto, requer:
I - O recebimento e provimento do presente, com base no art. 281, I, do CTB;
II - O ARQUIVAMENTO do Auto de Infração de Trânsito e o cancelamento da penalidade;
III - Efeito suspensivo caso o recurso não seja julgado no prazo legal.

---

Local: __________________________ Data: ____/____/_______ 
Assinatura: _____________________________________

=== TEMPLATE 2: INDICAÇÃO DE CONDUTOR INFRATOR ===

ESTADO DE SANTA CATARINA
DEPARTAMENTO ESTADUAL DE TRÂNSITO – DETRAN

IDENTIFICAÇÃO DO CONDUTOR INFRATOR

Caso não tenha sido o(a) proprietário(a) responsável pela infração, deverá indicar quem a cometeu. Não havendo a indicação do condutor infrator o proprietário do veículo será considerado responsável pela infração cometida (Art. 257, § 7° do CTB). Sendo o veículo de pessoa jurídica, a falta de indicação de condutor infrator implicará nas sanções previstas no Art. 257, § 8° do CTB e Resolução 918/2022 do CONTRAN.

PLACA/UF: [Insira Placa]
CÓDIGO ÓRGÃO AUTUADOR: [Insira Órgão]
N° AUTO DE INFRAÇÃO: [Insira AIT]
CÓDIGO DA MULTA: [Insira Código Multa]

NOME DO CONDUTOR INFRATOR: [Insira Nome do Condutor]
RG (INFRATOR): [Insira RG do Condutor]
CPF (INFRATOR): [Insira CPF do Condutor]
CNH (INFRATOR): [Insira CNH do Condutor]

___________________________________________________
ASSINATURA DO CONDUTOR INFRATOR

___________________________________________________
ASSINATURA DO PROPRIETÁRIO DO VEÍCULO

=== FIM DOS TEMPLATES ===

INSTRUÇÕES: Preencha com os dados reais do Relatório. Para dados faltantes, temporariamente escreva [Falta Preencher]. Retorne EXCLUSIVAMENTE o modelo formatado sem explicações adicionais.`;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-build" });

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  // Middleware de Autenticação
  const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
      return;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
  };

  // Payment Endpoints (Asaas Mock/Integration)
  // Payment Endpoints (Mercado Pago / Asaas / Mock)
  const mockPayments = new Map<string, { status: string }>();

  app.post("/api/create-payment", async (req, res) => {
    try {
      const { amount, description, email } = req.body;
      const paymentAmount = Number(amount) || 29.90;
      const paymentDescription = description || "Geração de Recurso de Multa em PDF";

      const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      const asaasApiKey = process.env.ASAAS_API_KEY;
      
      // 1. MERCADO PAGO INTEGRATION (Recomendado: Sem custos fixos, aprovação instantânea por CPF)
      if (mpToken) {
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpToken}`,
            'X-Idempotency-Key': `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          },
          body: JSON.stringify({
            transaction_amount: paymentAmount,
            description: paymentDescription,
            payment_method_id: 'pix',
            payer: {
              email: email || 'cliente@doutormulta.com.br'
            }
          })
        });

        const mpData = await mpResponse.json();
        
        if (!mpResponse.ok || !mpData.id) {
          console.error("Erro no Mercado Pago:", mpData);
          throw new Error(mpData.message || "Erro ao criar cobrança no Mercado Pago");
        }

        const transactionData = mpData.point_of_interaction?.transaction_data;

        return res.json({
          id: mpData.id.toString(),
          encodedImage: transactionData?.qr_code_base64 || '',
          payload: transactionData?.qr_code || '',
          mock: false,
          gateway: 'mercadopago'
        });
      }

      // 2. ASAAS INTEGRATION (Opção secundária se houver ASAAS_API_KEY no .env)
      if (asaasApiKey) {
        const apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
        
        const customerResponse = await fetch(`${apiUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
          body: JSON.stringify({ name: "Cliente Doutor Multa", cpfCnpj: "00000000000" })
        });
        const customerData = await customerResponse.json();
        
        if (!customerData.id) throw new Error("Erro ao criar cliente no Asaas");

        const paymentResponse = await fetch(`${apiUrl}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
          body: JSON.stringify({
            customer: customerData.id,
            billingType: "PIX",
            value: paymentAmount,
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            description: paymentDescription
          })
        });
        const paymentData = await paymentResponse.json();

        if (!paymentData.id) throw new Error("Erro ao criar cobrança no Asaas");

        const pixResponse = await fetch(`${apiUrl}/payments/${paymentData.id}/pixQrCode`, {
          method: 'GET',
          headers: { 'access_token': asaasApiKey }
        });
        const pixData = await pixResponse.json();

        return res.json({
          id: paymentData.id,
          encodedImage: pixData.encodedImage,
          payload: pixData.payload,
          mock: false,
          gateway: 'asaas'
        });
      }

      // 3. MOCK MODE (Ativado quando nenhuma API KEY é configurada)
      const paymentId = `mock_pay_${Date.now()}`;
      mockPayments.set(paymentId, { status: 'PENDING' });
      
      setTimeout(() => {
        if (mockPayments.has(paymentId)) {
          mockPayments.set(paymentId, { status: 'CONFIRMED' });
          console.log(`[MOCK] Pagamento ${paymentId} confirmado automaticamente.`);
        }
      }, 10000);

      const formattedAmount = paymentAmount.toFixed(2);
      const payload = `00020126360014BR.GOV.BCB.PIX0114+55479999999995204000053039865405${formattedAmount}5802BR5912Doutor Multa6009Joinville62070503***6304ABCD`;

      return res.json({
        id: paymentId,
        encodedImage: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", 
        payload: payload,
        mock: true,
        gateway: 'mock'
      });

    } catch (error) {
      console.error('Payment Error:', error);
      res.status(500).json({ error: "Erro ao gerar cobrança" });
    }
  });

  app.get("/api/check-payment/:id", async (req, res) => {
    try {
      const paymentId = req.params.id;
      const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      const asaasApiKey = process.env.ASAAS_API_KEY;

      // Se for pagamento simulado (mock)
      if (paymentId.startsWith('mock_pay_')) {
        const mockData = mockPayments.get(paymentId);
        if (mockData) {
          return res.json({ status: mockData.status });
        }
        return res.status(404).json({ error: "Cobrança mock não encontrada" });
      }

      // Consulta Mercado Pago
      if (mpToken && !isNaN(Number(paymentId))) {
        const checkResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${mpToken}` }
        });
        const checkData = await checkResponse.json();
        
        const statusMap: Record<string, string> = {
          'approved': 'CONFIRMED',
          'pending': 'PENDING',
          'in_process': 'PENDING',
          'rejected': 'CANCELLED',
          'cancelled': 'CANCELLED'
        };

        return res.json({ status: statusMap[checkData.status] || 'PENDING' });
      }

      // Consulta Asaas
      if (asaasApiKey) {
        const apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
        const checkResponse = await fetch(`${apiUrl}/payments/${paymentId}`, {
          method: 'GET',
          headers: { 'access_token': asaasApiKey }
        });
        const checkData = await checkResponse.json();
        return res.json({ status: checkData.status });
      }

      return res.status(400).json({ error: "Gateway não configurado" });
    } catch (error) {
      console.error('Payment Check Error:', error);
      res.status(500).json({ error: "Erro ao consultar status da cobrança" });
    }
  });

  // Webhook Mercado Pago (para receber notificações automáticas do PIX)
  app.post("/api/webhook/mercadopago", async (req, res) => {
    try {
      const { type, data } = req.body;
      if (type === 'payment' && data?.id) {
        console.log(`[MercadoPago Webhook] Notificação de pagamento recebida para o ID: ${data.id}`);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook Error:', error);
      res.sendStatus(500);
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { history, message, image } = req.body;
      
      const formattedHistory = [
        ...history.map((msg: any) => {
          const parts: any[] = [{ text: msg.content }];
          if (msg.image) {
            const base64Data = msg.image.split(',')[1];
            const mimeType = msg.image.split(';')[0].split(':')[1] || 'image/jpeg';
            parts.push({ inlineData: { data: base64Data, mimeType } });
          }
          return { role: msg.role === 'user' ? 'user' : 'model', parts };
        })
      ];

      let analysisContext = "";
      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';
        
        try {
          const analyzerResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { text: "Analise esta imagem (Auto de Infração ou CNH) para extrair os dados e identificar possíveis irregularidades de trânsito." },
                  { inlineData: { data: base64Data, mimeType } }
                ]
              }
            ],
            config: {
              systemInstruction: ANALYZER_PROMPT,
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  objetivo: { type: Type.STRING, description: "Defesa/Recurso ou Indicação de Condutor" },
                  dados: {
                    type: Type.OBJECT,
                    properties: {
                      nome: { type: Type.STRING },
                      cpf: { type: Type.STRING },
                      endereco: { type: Type.STRING },
                      cnh: { type: Type.STRING },
                      placa: { type: Type.STRING },
                      renavam: { type: Type.STRING },
                      auto_de_infracao: { type: Type.STRING },
                      orgao_autuador: { type: Type.STRING },
                      codigo_multa: { type: Type.STRING }
                    }
                  },
                  dados_faltantes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de dados qualificatórios que o usuário ainda não forneceu (ex: CPF, CNH, Endereço)"
                  },
                  tese_defesa: { type: Type.STRING, description: "Tese de Defesa fundamentada ou descrição da inconsistência encontrada" }
                },
                required: ["objetivo", "dados", "dados_faltantes", "tese_defesa"]
              }
            }
          });
          
          const analysisJson = analyzerResponse.text;
          analysisContext = `\n\n[ANÁLISE DO SISTEMA EM SEGUNDO PLANO - INFORMAÇÃO PARA O ATENDENTE]:
O sistema analisou a imagem enviada com sucesso. Aqui está o relatório estruturado em JSON:
${analysisJson}

Instruções para você (Doutor Multa):
1. Apresente os dados extraídos de forma muito resumida e legível em tópicos (bullet points) para o usuário confirmar.
2. Diga de forma muito breve (1 a 2 linhas) se foi encontrada alguma irregularidade (baseado no campo tese_defesa). Não explique a fundamentação jurídica de forma detalhada no chat.
3. Peça de forma amigável e direta os dados qualificatórios listados no campo dados_faltantes (ex: Endereço completo). Nunca cite regras de placeholders ou termos técnicos.
4. Mantenha a resposta concisa.`;
        } catch (analError) {
          console.error("Erro na análise do documento pelo Analyzer:", analError);
        }
      }

      const userParts: any[] = [{ text: (message || "Upload de imagem") + analysisContext }];
      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';
        userParts.push({ inlineData: { data: base64Data, mimeType } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          ...formattedHistory,
          { role: 'user', parts: userParts }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text });
    } catch (error) {
      console.error('Chat Error:', error);
      res.status(500).json({ error: "Erro ao comunicar com Doutor Multa" });
    }
  });

  app.post("/api/generate-appeal", authMiddleware, async (req, res) => {
    try {
      const { history } = req.body;
      
      const historyText = history.map((msg: any) => 
        `${msg.role === 'user' ? 'Motorista' : 'Doutor Multa'}: ${msg.content}`
      ).join("\\n");

      const today = new Date().toLocaleDateString('pt-BR');

      // 1. Agente Analista
      const analyzerResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
           { role: 'user', parts: [{ text: "Histórico:\n" + historyText }] }
        ],
        config: {
          systemInstruction: ANALYZER_PROMPT,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objetivo: { type: Type.STRING, description: "Defesa/Recurso ou Indicação de Condutor" },
              dados: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  cpf: { type: Type.STRING },
                  endereco: { type: Type.STRING },
                  cnh: { type: Type.STRING },
                  placa: { type: Type.STRING },
                  renavam: { type: Type.STRING },
                  auto_de_infracao: { type: Type.STRING },
                  orgao_autuador: { type: Type.STRING },
                  codigo_multa: { type: Type.STRING }
                }
              },
              dados_faltantes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de dados que o usuário ainda não forneceu"
              },
              tese_defesa: { type: Type.STRING, description: "Tese de Defesa fundamentada, se aplicável, ou vazio" }
            },
            required: ["objetivo", "dados", "dados_faltantes", "tese_defesa"]
          }
        }
      });
      const analyzerReport = analyzerResponse.text;

      // 2. Agente Redator
      const drafterResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
           { role: 'user', parts: [{ text: "Data de Hoje: " + today + "\n\nRelatório do Analista (JSON):\n" + analyzerReport }] }
        ],
        config: {
          systemInstruction: DRAFTER_PROMPT,
          temperature: 0.2
        }
      });
      const draftContent = drafterResponse.text;

      // 3. Agente Revisor
      const reviewerResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: draftContent }] }],
        config: {
          systemInstruction: REVIEWER_PROMPT,
          temperature: 0.1
        }
      });

      let finalDoc = reviewerResponse.text || "";
      // Remover possíveis blocos markdown que a IA ainda possa gerar por vício
      finalDoc = finalDoc.replace(/```[A-Za-z]*\\n?/g, '').replace(/```/g, '').trim();
      // Garantia programática: substitui qualquer placeholder residual com colchetes por linha de preenchimento manual
      finalDoc = finalDoc.replace(/\[[^\]]{1,80}\]/g, '___________________________');

      res.json({ document: finalDoc });
    } catch (error) {
      console.error('Appeal Generation Error:', error);
      res.status(500).json({ error: "Erro ao gerar o recurso." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
