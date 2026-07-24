import { useState } from 'react';
import { Message, ChatState } from './types';
import ChatView from './components/ChatView';
import AppealView from './components/AppealView';
import { cn } from './lib/utils';
import { useAuth } from './components/AuthProvider';
import PaymentModal from './components/PaymentModal';
import { saveAppeal } from './lib/db';

export default function App() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isGeneratingAppeal: false,
    generatedAppeal: null,
    generationCount: 0,
  });

  const [currentView, setCurrentView] = useState<'chat' | 'appeal'>('chat');
  const { user, loginWithGoogle, logout } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState<any | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);

  const handleSendMessage = async (content: string, image?: string) => {
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image,
      createdAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newUserMsg],
      isLoading: true
    }));

    try {
      // Small delay for better UX if it replies instantly
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          history: state.messages,
          message: content,
          image: image
        })
      });

      if (!response.ok) throw new Error("Erro na resposta");
      
      const data = await response.json();
      
      if (data.analysisData) {
        setAnalysisData(data.analysisData);
      }

      const newBotMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        createdAt: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, newBotMsg],
        isLoading: false
      }));
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Houve um erro ao processar sua resposta. Pode tentar novamente?",
        createdAt: new Date(),
      };
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMsg],
        isLoading: false
      }));
    }
  };

  const handleCreatePayment = async (amount: number, description: string) => {
    setIsCreatingPayment(true);
    try {
      const response = await fetch('/api/create-payment', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description })
      });
      if (!response.ok) throw new Error("Erro ao criar cobrança");
      const data = await response.json();
      setPaymentInfo(data);
    } catch (error) {
      console.error(error);
      alert("Houve um erro ao gerar o pagamento via PIX.");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleGenerateAppeal = async () => {
    setPaymentInfo(null); // Close modal
    setState(prev => ({ ...prev, isGeneratingAppeal: true }));
    try {
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/generate-appeal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ history: state.messages, analysisData })
      });

      if (!response.ok) throw new Error("Erro na geração da peça");

      const data = await response.json();
      
      if (user) {
        try {
          await saveAppeal(user.uid, data.document);
        } catch (e) {
          console.error("Falha ao salvar no banco de dados", e);
        }
      }

      setState(prev => ({
        ...prev,
        isGeneratingAppeal: false,
        generatedAppeal: data.document,
        generationCount: prev.generationCount + 1
      }));
      
      setCurrentView('appeal');
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isGeneratingAppeal: false }));
      alert("Houve um erro ao tentar gerar o recurso.");
    }
  };

  const handleRequestAppealGeneration = async () => {
    if (!user) {
      await loginWithGoogle();
      return;
    }
    if (state.generationCount === 0) {
      // Primeira geração: Exige pagamento de R$ 29,90
      await handleCreatePayment(29.90, "Geração de Recurso de Multa em PDF");
    } else if (state.generationCount < 3) {
      // Segunda e Terceira geração: Grátis (revisões inclusas)
      await handleGenerateAppeal();
    } else {
      // Quarta geração em diante: Exige pagamento adicional de R$ 5,00
      await handleCreatePayment(5.00, `Regeração de Defesa - Versão ${state.generationCount + 1}`);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col justify-between p-2 md:p-4 bg-transparent text-[#1A1A1A] font-sans overflow-hidden">
      <div className="w-full flex-1 max-w-[1440px] mx-auto flex flex-col md:rounded-3xl md:glass-panel overflow-hidden relative shadow-2xl bg-[#FDFBF7]/60 min-h-0">
        <main className="flex-1 min-h-0 w-full mx-auto grid grid-cols-1 lg:grid-cols-12 overflow-hidden print:block print:overflow-visible relative z-0">
          <section className={cn("col-span-1 lg:col-span-5 flex flex-col min-h-0 border-r border-black/10 bg-white/40 h-full print:hidden transition-all duration-300", currentView === 'chat' ? 'flex' : 'hidden lg:flex')}>
            <header className="flex justify-between items-center p-4 md:p-6 border-b border-black/10 shrink-0 print:hidden relative z-10 bg-white/30 backdrop-blur-md">
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-[Playfair_Display] font-black tracking-tighter leading-none">
                  DOUTOR <span className="italic relative -ml-1 text-amber-700">MULTA</span>
                </h1>
                <p className="mt-1 text-[7px] md:text-[9px] uppercase tracking-[0.2em] font-semibold opacity-70 text-[#8B4513]">
                  Inteligência Especializada no CTB
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-[8px] md:text-[10px] font-mono mb-1 uppercase tracking-widest opacity-80">
                  {user ? `${user.displayName || 'Motorista'}` : 'Visitante'}
                </div>
                {user ? (
                  <button onClick={logout} className="text-[8px] md:text-[10px] font-bold border border-black/20 px-2.5 py-1 rounded-lg hover:bg-black/5 hover:border-black/40 transition-all">
                    Sair
                  </button>
                ) : (
                  <button onClick={loginWithGoogle} className="text-[8px] md:text-[10px] font-bold bg-black text-white px-3 py-1 rounded-lg hover:bg-black/80 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    Entrar
                  </button>
                )}
              </div>
            </header>

            <ChatView 
              state={state} 
              onSendMessage={handleSendMessage} 
              onGenerateAppeal={handleRequestAppealGeneration} 
              isCreatingPayment={isCreatingPayment}
            />
          </section>
          
          <section className={cn("col-span-1 lg:col-span-7 flex-col min-h-0 h-full bg-white/20 relative print:block print:bg-white print:h-auto transition-all duration-300", currentView === 'appeal' ? 'flex' : 'hidden lg:flex')}>
            <AppealView 
              state={state} 
              onBack={() => setCurrentView('chat')} 
              onGenerateAppeal={handleRequestAppealGeneration}
              isCreatingPayment={isCreatingPayment}
            />
            {/* Vertical Accent Text */}
            <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 print:hidden z-[-1]">
              <div className="rotate-90 origin-right translate-x-full text-[120px] font-black text-amber-900/5 select-none pointer-events-none">
                RECURSOS
              </div>
            </div>
          </section>
        </main>

        {paymentInfo && (
          <PaymentModal 
            paymentInfo={paymentInfo} 
            onClose={() => setPaymentInfo(null)} 
            onPaymentConfirmed={handleGenerateAppeal} 
          />
        )}
      </div>

      <footer className="w-full max-w-[1440px] mx-auto bg-black/95 text-white p-2 flex justify-between items-center shrink-0 print:hidden relative z-10 backdrop-blur-md mt-2 md:rounded-xl shadow-lg text-[9px]">
        <div className="flex gap-4 md:gap-8">
          <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 hover:opacity-100 transition-opacity cursor-pointer">Doutor Multa &copy; 2024</div>
          <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 hidden md:block hover:opacity-100 transition-opacity cursor-pointer">Privacidade</div>
          <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 hidden md:block hover:opacity-100 transition-opacity cursor-pointer">Termos de Uso</div>
        </div>
        <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold bg-amber-50 text-black px-3 py-1.5 rounded-full shadow-inner">
          Base Legal: Lei 9.503/97
        </div>
      </footer>
    </div>
  );
}

