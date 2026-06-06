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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {state.messages.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-black fade-in">
             <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-2 shadow-lg font-serif italic text-2xl font-bold">
               Dr
             </div>
             <h3 className="text-2xl font-serif font-black">Análise de Autuações</h3>
             <p className="max-w-xs text-sm uppercase tracking-widest opacity-60 mt-1">
               Descreva sua notificação ou envie uma foto para análise estruturada.
             </p>
             <p className="max-w-xs text-[9px] mt-4 opacity-40 uppercase tracking-widest border-t border-black/10 pt-2 leading-relaxed">
               * Sistema laboratorial testado com advogados. Não constitui consultoria jurídica. Serviço de IA gerativa.
             </p>
           </div>
        )}
        
        {state.messages.map((msg, i) => (
          msg.role === 'assistant' ? (
            <div key={msg.id} className="flex gap-4 fade-in">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-serif text-xl shrink-0">Dr</div>
              <div className="flex-1">
                <div className="p-5 bg-white border border-black/5 rounded-2xl shadow-sm markdown-body text-lg leading-relaxed text-black">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <span className="text-[10px] uppercase tracking-widest mt-2 block opacity-40">Assistente IA</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex gap-4 flex-row-reverse fade-in">
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold shrink-0">VC</div>
              <div className="flex-1 text-right">
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl inline-block text-lg markdown-body text-left text-black overflow-hidden flex flex-col items-end">
                  {msg.image && (
                     msg.image.startsWith('data:application/pdf') ? (
                       <div className="w-full max-w-sm rounded-lg p-3 bg-white mb-3 border border-black/10 flex items-center gap-3 shadow-sm">
                         <FileText className="w-8 h-8 text-red-500 shrink-0" />
                         <span className="text-sm font-medium text-black line-clamp-1 truncate">Documento PDF Anexado</span>
                       </div>
                     ) : (
                       <img src={msg.image} alt="Envio do usuário" className="w-full max-w-sm rounded-lg object-contain mb-3 border border-black/10 shadow-sm bg-white" />
                     )
                  )}
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          )
        ))}

        {state.isLoading && (
          <div className="flex gap-4 fade-in">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-serif text-xl shrink-0">Dr</div>
            <div className="flex-1">
              <div className="p-5 bg-white border border-black/5 rounded-2xl shadow-sm inline-flex gap-1 items-center h-[68px]">
                <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:px-8 md:pb-8 shrink-0 bg-transparent flex flex-col gap-4">
        {state.messages.length > 2 && (
          <div className="lg:hidden flex items-center gap-3 justify-between">
            <button 
              onClick={onGenerateAppeal}
              disabled={state.isGeneratingAppeal || state.isLoading || isCreatingPayment}
              className="w-full bg-black text-white py-4 px-6 flex justify-between items-center group font-bold uppercase tracking-widest text-xs disabled:opacity-50 transition-colors"
            >
              <span>{state.isGeneratingAppeal || isCreatingPayment ? "Processando..." : "Gerar Recurso PDF"}</span>
              <span className="text-xl font-[Playfair_Display] italic text-amber-500">$ 29,90</span>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative bg-white border-2 border-black rounded-xl p-1 md:p-1.5 focus-within:ring-4 focus-within:ring-amber-200 transition-shadow z-10 w-full flex-col flex">
          {imagePreview && (
            <div className="relative mb-2 ml-2 mt-2 inline-block self-start">
              {imagePreview.startsWith('data:application/pdf') ? (
                 <div className="h-16 w-16 md:h-20 md:w-20 flex items-center justify-center bg-gray-50 text-red-500 rounded-md border border-gray-200 shadow-sm">
                    <FileText className="w-8 h-8" />
                 </div>
              ) : (
                 <img src={imagePreview} alt="Preview" className="h-16 md:h-20 w-auto object-contain rounded-md border border-gray-200 shadow-sm" />
              )}
              <button 
                type="button" 
                onClick={() => setImagePreview(null)} 
                className="absolute -top-2 -right-2 bg-black text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-md pb-0.5 text-xs md:text-sm"
              >
                &times;
              </button>
            </div>
          )}
          <div className="flex items-center w-full">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              title="Anexar foto ou PDF do Auto de Infração"
              disabled={state.isLoading || state.isGeneratingAppeal}
              className="p-3 mx-1 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
            >
              <Camera className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={state.isLoading || state.isGeneratingAppeal}
              placeholder="Descreva a multa ou anexe foto/PDF..."
              className="w-full px-2 py-3 bg-transparent text-black text-sm md:text-lg outline-none disabled:text-gray-400"
            />
            <button 
              type="submit" 
              disabled={(!input.trim() && !imagePreview) || state.isLoading || state.isGeneratingAppeal}
              className="p-3 bg-black text-white rounded-lg transition-transform active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shrink-0 ml-1 md:ml-2"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
