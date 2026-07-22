import React, { useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ChatState } from '../types';

export default function AppealView({
  state,
  onBack,
  onGenerateAppeal,
  isCreatingPayment
}: {
  state: ChatState;
  onBack: () => void;
  onGenerateAppeal: () => void;
  isCreatingPayment?: boolean;
}) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const content = state.generatedAppeal || '';
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Setup styles
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25; // 25mm margins
      const maxLineWidth = pageWidth - (margin * 2);

      // Generate protocol number once so it's consistent across pages
      const protocolNumber = `${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;

      const addHeader = () => {
        // Logo / Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 30, 30);
        doc.text("DOUTOR MULTA", margin, 20);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Inteligência Especializada no CTB", margin, 25);
        
        // Protocol Number
        doc.setFont("courier", "normal");
        doc.setFontSize(10);
        const protocolText = `PROTOCOLO #${protocolNumber}`;
        doc.text(protocolText, pageWidth - margin - doc.getTextWidth(protocolText), 20);
        
        // Draw decorative line
        doc.setDrawColor(200, 150, 100); // Amber-ish color
        doc.setLineWidth(0.5);
        doc.line(margin, 28, pageWidth - margin, 28);

        // ALWAYS reset to body font at the end of header
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
      };

      const addFooter = (pageNum: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 13, { align: 'center' });
        doc.text("Gerado por Doutor Multa - Base Legal: Lei 9.503/97", pageWidth / 2, pageHeight - 9, { align: 'center' });
      };

      // Set initial font for splitTextToSize calculation
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      
      const lines = doc.splitTextToSize(content, maxLineWidth);
      
      let cursorY = 40; // Start Y position after header
      let pageNumber = 1;
      
      addHeader();

      for (let i = 0; i < lines.length; i++) {
        if (cursorY > pageHeight - 30) {
          addFooter(pageNumber);
          doc.addPage();
          pageNumber++;
          addHeader();
          cursorY = 40;
        }
        
        doc.text(lines[i], margin, cursorY);
        cursorY += 6; // Line height
      }
      
      addFooter(pageNumber);
      
      doc.save(`Recurso_Doutor_Multa_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!state.generatedAppeal) return;
    const content = state.generatedAppeal;
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Doutor Multa - Recurso</title></head><body><p style='white-space: pre-wrap; font-family: \"Times New Roman\", serif; font-size: 11pt;'>";
    const postHtml = "</p></body></html>";
    const html = preHtml + content + postHtml;
    
    const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recurso_doutor_multa.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full fade-in z-10 bg-transparent md:p-8 p-4 print:bg-white print:p-0 print:block">
      <div className="flex items-center justify-between mb-4 lg:mb-2 w-full print:hidden">
        <button 
          onClick={onBack}
          className="p-2 text-black/60 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest -ml-2 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> {state.generatedAppeal ? "Revisar no Chat" : "Voltar"}
        </button>
        <div className="hidden md:flex flex-1 justify-between items-baseline ml-4 border-b border-black/10 pb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Dossiê do Caso</h3>
          <span className="text-[10px] font-mono font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded">PROTOCOLO #{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(4, '0')}</span>
        </div>
      </div>
      
      <div className="hidden lg:block h-[1px] w-full bg-gradient-to-r from-amber-200 to-transparent mb-6 shrink-0 print:hidden" />

      <div className="flex-1 w-full flex flex-col mb-8 overflow-hidden print:overflow-visible print:mb-0 relative">
        <div className="bg-black/5 rounded-2xl p-4 md:p-8 shadow-inner h-full overflow-auto print:bg-white print:border-none print:shadow-none print:p-0 print:block flex flex-col items-center custom-scrollbar relative">
          {state.isGeneratingAppeal && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-4 transition-all">
              <Loader2 className="w-12 h-12 text-amber-700 animate-spin" />
              <p className="text-xs md:text-sm font-bold text-amber-900 uppercase tracking-widest animate-pulse">
                {state.generatedAppeal ? "Regerando defesa..." : "Gerando defesa..."}
              </p>
            </div>
          )}
          <div className="text-[10px] font-serif uppercase tracking-[0.3em] text-center mb-6 italic text-amber-900/40 shrink-0 w-full print:hidden">
            Minuta de Recurso Administrativo
          </div>
          {state.generatedAppeal ? (
            <div 
              ref={documentRef}
              className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] text-[13px] md:text-[15px] lg:text-[16px] text-[#1A1A1A] leading-relaxed font-serif whitespace-pre-wrap w-full max-w-[210mm] min-h-[297mm] px-6 sm:px-10 py-10 sm:py-16 shrink-0 print:shadow-none print:w-full print:px-0 print:py-0 transition-all"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {state.generatedAppeal}
            </div>
          ) : (
            <div className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full max-w-[210mm] min-h-[297mm] px-12 py-16 shrink-0 flex flex-col items-center justify-center text-amber-900/20 gap-4 font-sans italic text-sm transition-all border border-black/5">
              <FileText className="w-16 h-16 opacity-30" />
              <p>Análise em andamento. O documento aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="shrink-0 space-y-3 relative z-10 bg-transparent print:hidden">
        {state.generatedAppeal ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col md:flex-row gap-3">
               <button 
                 onClick={handleDownloadPDF}
                 disabled={isDownloading}
                 className="w-full bg-gradient-to-r from-black to-[#2A2A2A] text-white py-4 md:py-4 px-6 flex justify-between items-center group disabled:opacity-50 transition-all rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
               >
                 <span className="text-xs md:text-sm uppercase tracking-widest font-bold">
                   {isDownloading ? "Gerando..." : "Baixar em PDF"}
                 </span>
                 <Download className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
               </button>
               <button 
                 onClick={handleDownloadDoc}
                 disabled={isDownloading}
                 className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white py-4 md:py-4 px-6 flex justify-between items-center group disabled:opacity-50 transition-all rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
               >
                 <span className="text-xs md:text-sm uppercase tracking-widest font-bold">
                   Baixar em .DOC
                 </span>
                 <FileText className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
               </button>
            </div>
            
            <button 
              onClick={onGenerateAppeal}
              disabled={state.isGeneratingAppeal || state.isLoading || isCreatingPayment}
              className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 border border-white/10 text-white py-3 px-6 flex justify-between items-center group disabled:opacity-50 transition-all rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] font-bold uppercase tracking-widest text-xs"
            >
              <span>
                {state.isGeneratingAppeal || isCreatingPayment ? "Processando..." : "Regerar Defesa (Atualizar)"}
              </span>
              <span className="text-xs font-mono text-amber-400">
                {state.generationCount < 3 
                  ? `Grátis (${3 - state.generationCount} restam)` 
                  : "+ R$ 5,00"
                }
              </span>
            </button>
          </div>
        ) : (
          <button 
            onClick={onGenerateAppeal}
            disabled={state.isGeneratingAppeal || state.messages.length < 3 || isCreatingPayment}
            className="hidden lg:flex w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white py-4 px-6 justify-between items-center group disabled:opacity-50 transition-all disabled:cursor-not-allowed rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="text-xs md:text-sm uppercase tracking-widest font-bold">
              {state.isGeneratingAppeal || isCreatingPayment ? "Processando..." : "Gerar Recurso PDF"}
            </span>
            <span className="text-xl md:text-2xl font-[Playfair_Display] italic text-amber-200 group-hover:text-white transition-colors">$ 29,90</span>
          </button>
        )}
        
        <div className="flex gap-3">
           <div className="flex-1 p-3 md:p-3 bg-white/60 backdrop-blur-sm text-[9px] md:text-[10px] leading-tight uppercase font-bold tracking-tight text-amber-900 border border-amber-900/10 rounded-lg shadow-sm">
             Instruções de Protocolo Digital inclusas via Portal Gov.br
           </div>
           <div className="flex-1 p-3 md:p-3 bg-white/60 backdrop-blur-sm text-[9px] md:text-[10px] leading-tight uppercase font-bold tracking-tight text-zinc-600 border border-zinc-200 rounded-lg shadow-sm">
             Encaminhamento Direto ao Órgão Autuador
           </div>
        </div>
      </div>
    </div>
  );
}
