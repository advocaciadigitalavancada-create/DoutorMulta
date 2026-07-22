import React, { useState, useRef, useEffect } from 'react';
import { Send, Gavel, Scale, Loader2, ArrowLeft, Download, FileText, CheckCircle2, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Message, ChatState } from '../types';
import { cn } from '../lib/utils';

export default function ChatView({ 
  state, 
  onSendMessage, 
  onGenerateAppeal,
  isCreatingPayment
}: { 
  state: ChatState, 
  onSendMessage: (msg: string, image?: string) => void,
  onGenerateAppeal: () => void,
  isCreatingPayment?: boolean
}) {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if ((!content && !imagePreview) || state.isLoading) return;
    
    onSendMessage(content || "Anexo adicionado", imagePreview || undefined);
    setInput('');
    setImagePreview(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-transparent overflow-hidden">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {state.messages.length === 0 && (
           <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 text-[#1A1A1A] fade-in py-8 md:py-12">
             <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-900 text-white rounded-full flex items-center justify-center shadow-2xl font-serif italic text-4xl font-black border-4 border-white/50">
               Dr
             </div>
             <div>
               <h3 className="text-3xl font-serif font-black text-amber-900">Análise de Autuações</h3>
               <p className="max-w-md text-sm md:text-base opacity-70 mt-2 font-medium">
                 Descreva sua notificação detalhadamente ou envie uma foto/PDF para análise estruturada.
               </p>
             </div>
             
             <div className="flex flex-wrap justify-center gap-3 w-full max-w-lg mt-4">
               {["Excesso de velocidade", "Avançar o sinal vermelho", "Dirigir usando celular"].map(suggestion => (
                 <button 
                   key={suggestion}
                   onClick={() => setInput(`Recebi uma multa por ${suggestion.toLowerCase()}. Como posso recorrer?`)}
                   className="px-4 py-2 bg-white/50 hover:bg-white/80 border border-amber-900/10 rounded-full text-xs md:text-sm font-semibold text-amber-900 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                 >
                   {suggestion}
                 </button>
               ))}
             </div>

             <p className="max-w-xs text-[9px] mt-6 opacity-40 uppercase tracking-widest border-t border-black/10 pt-4 leading-relaxed">
               * Sistema laboratorial testado com advogados. Não constitui consultoria jurídica. Serviço de IA gerativa.
             </p>
           </div>
        )}
        
        {state.messages.map((msg, i) => (
          msg.role === 'assistant' ? (
            <div key={msg.id} className="flex gap-4 fade-in items-end">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 shadow-md flex items-center justify-center text-white font-serif text-lg md:text-xl shrink-0 mb-5 border-2 border-white">Dr</div>
              <div className="flex-1 max-w-[85%]">
                <div className="p-4 md:p-6 bg-white/90 backdrop-blur-md border border-white rounded-2xl rounded-bl-none shadow-sm markdown-body text-base md:text-lg leading-relaxed text-[#1A1A1A]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <span className="text-[9px] uppercase tracking-widest mt-1.5 ml-1 block opacity-40 font-bold text-amber-900">Assistente IA</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex gap-4 flex-row-reverse fade-in items-end">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-bold shrink-0 mb-5 shadow-md border-2 border-white text-xs md:text-sm">VC</div>
              <div className="flex-1 max-w-[85%] flex flex-col items-end">
                <div className="p-4 md:p-6 bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] text-white border border-black/10 rounded-2xl rounded-br-none shadow-md inline-block text-base md:text-lg markdown-body text-left overflow-hidden w-auto">
                  {msg.image && (
                     msg.image.startsWith('data:application/pdf') ? (
                       <div className="w-full max-w-sm rounded-xl p-3 bg-white/10 backdrop-blur-sm mb-3 border border-white/20 flex items-center gap-3">
                         <FileText className="w-8 h-8 text-red-400 shrink-0" />
                         <span className="text-sm font-medium text-white line-clamp-1 truncate">Documento PDF Anexado</span>
                       </div>
                     ) : (
                       <img src={msg.image} alt="Envio do usuário" className="w-full max-w-sm rounded-xl object-contain mb-3 border border-white/20 bg-black/20" />
                     )
                  )}
                  <div className="text-white/95">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}

        {state.isLoading && (
          <div className="flex gap-4 fade-in items-end">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 shadow-md flex items-center justify-center text-white font-serif text-lg md:text-xl shrink-0 mb-5 border-2 border-white">Dr</div>
            <div className="flex-1">
              <div className="p-4 md:p-5 bg-white/90 backdrop-blur-md border border-white rounded-2xl rounded-bl-none shadow-sm inline-flex gap-1.5 items-center h-[54px] md:h-[68px]">
                <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="p-4 md:px-8 md:pb-8 shrink-0 bg-transparent flex flex-col gap-4 relative z-10">
        {state.messages.length > 2 && (
          <div className="lg:hidden flex items-center gap-3 justify-between">
            <button 
              onClick={onGenerateAppeal}
              disabled={state.isGeneratingAppeal || state.isLoading || isCreatingPayment}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white py-4 px-6 flex justify-between items-center group font-bold uppercase tracking-widest text-xs disabled:opacity-50 transition-all rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <span>
                {state.isGeneratingAppeal || isCreatingPayment 
                  ? "Processando..." 
                  : state.generatedAppeal 
                    ? "Regerar defesa" 
                    : "Gerar Recurso PDF"
                }
              </span>
              <span className="text-xl font-[Playfair_Display] italic text-amber-200">
                {state.generatedAppeal 
                  ? state.generationCount < 3 
                    ? `Grátis (${3 - state.generationCount} restam)` 
                    : "R$ 5,00"
                  : "R$ 29,90"
                }
              </span>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-amber-500/50 transition-all z-10 w-full flex-col flex">
          {imagePreview && (
            <div className="relative mb-2 ml-2 mt-2 inline-block self-start">
              {imagePreview.startsWith('data:application/pdf') ? (
                 <div className="h-16 w-16 md:h-20 md:w-20 flex items-center justify-center bg-gray-50/80 text-red-500 rounded-xl border border-gray-200 shadow-sm backdrop-blur-sm">
                    <FileText className="w-8 h-8" />
                 </div>
              ) : (
                 <img src={imagePreview} alt="Preview" className="h-16 md:h-20 w-auto object-contain rounded-xl border border-gray-200 shadow-sm" />
              )}
              <button 
                type="button" 
                onClick={() => setImagePreview(null)} 
                className="absolute -top-2 -right-2 bg-black text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md pb-0.5 text-sm hover:scale-110 transition-transform"
              >
                &times;
              </button>
            </div>
          )}
          <div className="flex items-end w-full p-1">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              title="Anexar foto ou PDF do Auto de Infração"
              disabled={state.isLoading || state.isGeneratingAppeal}
              className="p-3 mx-1 text-black/40 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-all shrink-0 disabled:opacity-50 mb-0.5"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={state.isLoading || state.isGeneratingAppeal}
              placeholder="Descreva a multa com detalhes ou anexe o auto de infração..."
              className="w-full px-3 py-3.5 bg-transparent text-[#1A1A1A] text-sm md:text-base outline-none disabled:text-gray-400 resize-none max-h-32 min-h-[52px]"
              rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
            />
            
            <button 
              type="submit" 
              disabled={(!input.trim() && !imagePreview) || state.isLoading || state.isGeneratingAppeal}
              className="p-3 bg-gradient-to-r from-black to-[#2A2A2A] text-white rounded-xl transition-all active:scale-95 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shrink-0 ml-1 md:ml-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 mb-0.5"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
