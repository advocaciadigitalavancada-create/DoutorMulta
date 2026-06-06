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
  });

  const [currentView, setCurrentView] = useState<'chat' | 'appeal'>('chat');
  const { user, loginWithGoogle, logout } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState<any | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

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

  const handleCreatePayment = async () => {
    setIsCreatingPayment(true);
    try {
      const response = await fetch('/api/create-payment', { method: 'POST' });
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
        body: JSON.stringify({ history: state.messages })
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
        generatedAppeal: data.document
      }));
      
      setCurrentView('appeal');
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isGeneratingAppeal: false }));
      alert("Houve um erro ao tentar gerar o recurso.");
    }
  };

  return (
    <div className="h-full bg-[#F5F2ED] text-[#1A1A1A] font-sans overflow-hidden flex flex-col print:bg-white print:h-auto">
      <header className="flex justify-between items-end p-6 md:p-8 border-b border-black/10 shrink-0 print:hidden">
        <div>
          <h1 className="text-5xl md:text-7xl font-[Playfair_Display] font-black tracking-tighter leading-none">
            DOUTOR <span className="italic relative -ml-2">MULTA</span>
          </h1>
          <p className="mt-2 text-[10px] md:text-sm uppercase tracking-[0.2em] font-semibold opacity-60 text-[#8B4513]">
            Inteligência Especializada no CTB
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <div className="text-xs font-mono mb-2 uppercase tracking-widest">
            {user ? `Bem-vindo(a), ${user.displayName || 'Motorista'}` : 'Visitante'}
          </div>
          {user ? (
            <button onClick={logout} className="text-xs font-bold border border-black/20 px-3 py-1 rounded hover:bg-black/5 transition">
              Sair
            </button>
          ) : (
            <button onClick={loginWithGoogle} className="text-xs font-bold bg-black text-white px-3 py-1 rounded hover:bg-black/80 transition">
              Login com Google
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full mx-auto grid grid-cols-1 lg:grid-cols-12 overflow-hidden print:block print:overflow-visible relative">
        <section className={cn("col-span-1 lg:col-span-7 flex-col min-h-0 border-r border-black/10 bg-white/30 backdrop-blur-sm h-full print:hidden", currentView === 'chat' ? 'flex' : 'hidden lg:flex')}>
          <ChatView 
            state={state} 
            onSendMessage={handleSendMessage} 
            onGenerateAppeal={handleCreatePayment} 
            isCreatingPayment={isCreatingPayment}
          />
        </section>
        
        <section className={cn("col-span-1 lg:col-span-5 flex-col min-h-0 h-full bg-[#F5F2ED] relative print:block print:bg-white print:h-auto", currentView === 'appeal' ? 'flex' : 'hidden lg:flex')}>
          <AppealView 
            state={state} 
            onBack={() => setCurrentView('chat')} 
            onGenerateAppeal={handleCreatePayment}
            isCreatingPayment={isCreatingPayment}
          />
          {/* Vertical Accent Text */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 print:hidden">
            <div className="rotate-90 origin-right translate-x-full text-[100px] font-black text-black/5 select-none pointer-events-none">
              RECURSOS
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black text-white p-4 flex justify-between items-center shrink-0 print:hidden">
        <div className="flex gap-4 md:gap-8">
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">Doutor Multa &copy; 2024</div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-70 hidden md:block">Privacidade</div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-70 hidden md:block">Termos de Uso</div>
        </div>
        <div className="text-[10px] uppercase tracking-widest font-bold bg-white text-black px-2 py-1">
          Base Legal: Lei 9.503/97
        </div>
      </footer>

      {paymentInfo && (
        <PaymentModal 
          paymentInfo={paymentInfo} 
          onClose={() => setPaymentInfo(null)} 
          onPaymentConfirmed={handleGenerateAppeal} 
        />
      )}
    </div>
  );
}

