import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import admin from 'firebase-admin';

dotenv.config();

const SYSTEM_INSTRUCTION = `Você é o Doutor Multa, um sistema de IA focado em recursos de trânsito.
Todo o conhecimento jurídico que você possui foi estruturado com o auxílio de advogados especialistas em Direito de Trânsito Brasileiro (CTB).
ATENÇÃO E ÉTICA: Você não é um advogado e não realiza consultoria jurídica. Você é um assistente tecnológico (software) processador de textos. Deixe isso claro na sua postura.

CONDUÇÃO DA CONVERSA:
1. Comece saudando o usuário cordialmente. Peça que ele descreva a multa que recebeu e envie uma FOTO ou PDF do auto de infração, bem como uma cópia (foto/PDF) da CNH do condutor.
2. Se o usuário enviar documentos (imagens/PDFs), analise-os cuidadosamente. EXTRAIA TODOS OS DADOS POSSÍVEIS tanto da infração (Placa, Renavam, Data, Hora, Local, Código CTB, Valor, Órgão) quanto os qualificatórios do condutor que estiverem visíveis (Nome, CPF, CNH, Endereço). Liste os dados extraídos e peça confirmação.
2.1 Se o usuário avisar que "os dados já estão na multa" ou no documento enviado, confira novamente a imagem/PDF para extrair CPF, CNH, Nome ou Endereço que possam ter passado despercebidos.
2.2 Pergunte também se foi o proprietário do veículo que cometeu a infração (nos casos em que não houve abordagem). Caso negativo, explique que ele pode fazer a INDICAÇÃO DO CONDUTOR INFRATOR.
2.3 Com os dados extraídos, busque falhas na formação do auto de infração, inconsistências e teses de defesa.
3. REGRA CONTRA PLACEHOLDERS: ANTES de concluir a conversa e autorizar o usuário a clicar em "Gerar Recurso", você TEM OBRIGATORIAMENTE que ter os dados qualificatórios: Nome Completo, CPF, CNH e Endereço. Se ALGUM desses dados NÃO estiver nos documentos enviados, você DEVE pedir a ele que digite o dado que falta ou envie o documento faltante (como a CNH). Não prossiga sem os dados ou sem a confirmação de que ele os preencherá à mão.
4. Faça de forma proativa uma verificação rigorosa dos **requisitos formais do auto de infração de trânsito** conforme o **Artigo 280 do CTB**.
O auto de infração DEVE conter os seguintes requisitos obrigatórios para ser válido:
- Tipificação da infração (Código CTB e descrição)
- Local da infração (Endereço completo)
- Data da infração
- Hora da infração
- Identificação do veículo (Placa, marca, modelo)
- Prontuário do condutor (se aplicável)
- Órgão autuador
- Agente autuador e sua matrícula
- Assinatura do infrator (quando houver abordagem)

5. AVALIAÇÃO DE NULIDADE: Se **qualquer** requisito do Art. 280 listado acima estiver ausente, incorreto, ilegível ou incompleto (ex: local muito impreciso, falta da matrícula do agente, horário não preenchido), explique ao usuário que o auto é **NULO**. Aconselhe que uma tese forte de defesa (falta de amparo legal/requisitos formais do art. 280) será utilizada no recurso.
5.1 SE NÃO HOUVER DEFESA ÓBVIA: Caso os dados pareçam corretos e não haja falha formal evidente, você deve criar uma tese questionando a validade técnica da autuação. Questione enfaticamente a aferição do equipamento pelo INMETRO (alegando que não há prova de aferição nos últimos 12 meses), a falta constatação visual clara pelo agente, falta de sinalização visível no local ou cerceamento de defesa. O objetivo é sempre fornecer um recurso contundente para o usuário.
6. Apenas quando REUNIR ABSOLUTAMENTE TODOS OS DADOS (nome, cpf, endereço, renavam, auto de infração e fatos) informe-o que o sistema já tem o necessário.
7. Explique o fundamento legal. (Se for apenas indicação de condutor, avise sobre o prazo de indicação, a necessidade das assinaturas originais do proprietário e do condutor e o envio da cópia da CNH/documento do veículo).
8. Peça que ele clique no botão "Gerar Recurso PDF" na interface para emitir o documento final (sem partes em branco!). 
9. Recomende fortemente o Protocolo Online (DETRAN DIGITAL - p/ SC):
   - Acesse o portal do DETRAN.
   - Login GOV.BR (prata/ouro).
   - Menu "SERVIÇOS REFERENTES À INFRAÇÕES DE TRÂNSITO".
   - Selecione a opção desejada (Indicação de Condutor, Defesa de Autuação ou Recurso à JARI).
   - Anexe documentos e confirme a solicitação.

TOM DE VOZ:
Profissional, acolhedor e direto. Use PT-BR.
Nunca invente artigos que não existem. Aplique os princípios do CTB, resoluções do CONTRAN (como a Res. 918/2022) e Senatran em vigor.`;

const ANALYZER_PROMPT = `Você é o Agente Analista Especialista em Trânsito. Analise o histórico da conversa com o motorista e:
1. Identifique o objetivo: Defesa/Recurso ou Indicação de Condutor.
2. Extraia TODOS os dados disponíveis.
3. Formule a Tese de Defesa (se for o caso), verificando nulidades pelos requisitos formais do Art. 280 do CTB.

Preencha as informações no formato estruturado (JSON) solicitado. Seja objetivo e não invente dados.`;

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
  const PORT = process.env.PORT || 3000;

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
  const mockPayments = new Map<string, { status: string }>();

  app.post("/api/create-payment", async (req, res) => {
    try {
      const apiKey = process.env.ASAAS_API_KEY;
      
      if (!apiKey) {
        // MOCK MODE: Quando o usuário não possui API Key do Asaas configurada
        const paymentId = `mock_pay_${Date.now()}`;
        mockPayments.set(paymentId, { status: 'PENDING' });
        
        // Simula o pagamento sendo confirmado após 10 segundos
        setTimeout(() => {
          if (mockPayments.has(paymentId)) {
            mockPayments.set(paymentId, { status: 'CONFIRMED' });
            console.log(`[MOCK] Pagamento ${paymentId} confirmado automaticamente.`);
          }
        }, 10000);

        return res.json({
          id: paymentId,
          // QR Code em base64 mockado (pixel preto para exemplo visual)
          encodedImage: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", 
          payload: "00020126360014BR.GOV.BCB.PIX0114+5547999999999520400005303986540529.905802BR5912Doutor Multa6009Joinville62070503***6304ABCD",
          mock: true
        });
      }

      // IMPLEMENTAÇÃO REAL DA API ASAAS (Será ativada quando houver ASAAS_API_KEY no .env)
      const apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
      
      // 1. Criar Cliente Avulso (Opcional, mas Asaas costuma exigir cliente para gerar cobrança)
      const customerResponse = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify({ name: "Cliente Doutor Multa", cpfCnpj: "00000000000" })
      });
      const customerData = await customerResponse.json();
      
      if (!customerData.id) throw new Error("Erro ao criar cliente no Asaas");

      // 2. Criar Cobrança PIX
      const paymentResponse = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify({
          customer: customerData.id,
          billingType: "PIX",
          value: 29.90,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 dia
          description: "Geração de Recurso de Multa em PDF"
        })
      });
      const paymentData = await paymentResponse.json();

      if (!paymentData.id) throw new Error("Erro ao criar cobrança no Asaas");

      // 3. Obter QR Code PIX
      const pixResponse = await fetch(`${apiUrl}/payments/${paymentData.id}/pixQrCode`, {
        method: 'GET',
        headers: { 'access_token': apiKey }
      });
      const pixData = await pixResponse.json();

      res.json({
        id: paymentData.id,
        encodedImage: pixData.encodedImage,
        payload: pixData.payload,
        mock: false
      });

    } catch (error) {
      console.error('Payment Error:', error);
      res.status(500).json({ error: "Erro ao gerar cobrança" });
    }
  });

  app.get("/api/check-payment/:id", async (req, res) => {
    try {
      const paymentId = req.params.id;
      const apiKey = process.env.ASAAS_API_KEY;

      if (!apiKey) {
        // MOCK MODE
        const mockData = mockPayments.get(paymentId);
        if (mockData) {
          return res.json({ status: mockData.status });
        }
        return res.status(404).json({ error: "Cobrança não encontrada (Mock)" });
      }

      // IMPLEMENTAÇÃO REAL
      const apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
      const checkResponse = await fetch(`${apiUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: { 'access_token': apiKey }
      });
      const checkData = await checkResponse.json();
      
      res.json({ status: checkData.status }); // status no Asaas pode ser 'PENDING', 'RECEIVED', 'CONFIRMED'
    } catch (error) {
      console.error('Payment Check Error:', error);
      res.status(500).json({ error: "Erro ao consultar status da cobrança" });
    }
  });

  app.post("/api/chat", authMiddleware, async (req, res) => {
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

      const userParts: any[] = [{ text: message || "Upload de imagem" }];
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
