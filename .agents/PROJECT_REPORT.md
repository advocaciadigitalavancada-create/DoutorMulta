# Relatório Consolidado do Projeto — DoutorMulta

> **Destinatários**: Agentes de IA, Desenvolvedores e Mantenedores do Projeto.  
> **Data de Atualização**: 22 de Julho de 2026  
> **Status Geral**: 🟢 Aplicação Desenvolvida, Sistema de Cobrança Integrado, Pronto para Deploy.

---

## 📌 1. Visão Geral da Aplicação

O **DoutorMulta** é um sistema web autônomo baseado em Inteligência Artificial para geração e revisão de recursos de multas de trânsito brasileiras, em conformidade com o Código de Trânsito Brasileiro (CTB - Lei 9.503/97) e resoluções do CONTRAN.

### Fluxo de Funcionamento
1. **Atendimento & Coleta (Chat)**: Motorista faz upload da notificação de autuação e/ou CNH.
2. **Agente Analista (Gemini 3.5 Flash)**: Extrai os dados do Auto de Infração via visão computacional e identifica teses de nulidade formal (Art. 280/281 CTB).
3. **Cobrança (Mercado Pago PIX / Mock)**: Solicitação de pagamento de R$ 29,90 antes da liberação do documento.
4. **Agente Redator (Gemini 3.5 Flash)**: Redige o recurso completo em formato oficial (DETRAN/JARI).
5. **Agente Revisor (Gemini 3.5 Flash)**: Revisa a peça jurídica e remove placeholders.
6. **Visualização & Download**: Interface web para pré-visualizar, editar e baixar o PDF.

---

## 🏗️ 2. Arquitetura Técnica

- **Frontend**: Single Page Application (SPA) em React 19, Vite, TailwindCSS v4, Lucide Icons, Framer Motion.
- **Backend**: Servidor Express em TypeScript (`server.ts`), empacotado via `esbuild` para `dist/server.cjs`.
- **Servidor Único**: Em produção, o Express serve tanto os endpoints REST (`/api/*`) quanto os arquivos estáticos compilados do React (`dist/`).

---

## 💳 3. Sistema de Cobrança (Status: CONCLUÍDO)

### Decisão Estratégica: Mercado Pago (PIX)
- **Motivo**: Custo zero de manutenção (sem taxa mensal), cadastro via CPF (sem necessidade de CNPJ), aprovação instantânea, taxa de transação de apenas **0,99%**.
- **Implementação**:
  - `POST /api/create-payment`: Cria cobrança PIX via API v1 do Mercado Pago ou usa modo MOCK em ambiente dev.
  - `GET /api/check-payment/:id`: Polling do status da transação.
  - `POST /api/webhook/mercadopago`: Receptor de Webhooks para notificações assíncronas.
- **Configuração necessária**: Adicionar `MERCADOPAGO_ACCESS_TOKEN` no arquivo `.env` (instruções em `.env.example`).

---

## ☁️ 4. Plano de Deploy na Nuvem (Status: PLANEJADO / PRONTO PARA EXECUÇÃO)

O plano de deploy foi desenhado para manter **Custo R$ 0,00/mês** no ecossistema Google Cloud:

1. **Google Cloud Run**:
   - Serviço: `doutor-multa-app` em `us-central1`.
   - `--min-instances 0` (zero custo quando sem acessos).
   - Enquadrado na cota gratuita mensal de 2M de requisições.
2. **GitHub Actions**:
   - Workflow em `.github/workflows/deploy.yml`.
   - Deploy automático a cada push na branch `main`.
3. **Firebase**:
   - Autenticação de usuários (Google Provider) gratuita até 50.000 MAU.
   - Banco Firestore para histórico de recursos salvos.

---

## 📋 5. Guia para Próximos Agentes

Se você é um agente de IA continuando este projeto:

1. **Código-fonte principal**:
   - Servidor backend: `server.ts`
   - Componente principal frontend: `src/App.tsx`
   - Modal de Pagamento: `src/components/PaymentModal.tsx`
2. **Comandos Úteis**:
   - Desenvolver localmente: `npm run dev`
   - Testar tipos/erros: `npx tsc --noEmit`
   - Build de produção: `npm run build`
