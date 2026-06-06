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
    <div className="flex flex-col h-full fade-in z-10 bg-[#F5F2ED] md:p-8 p-4 print:bg-white print:p-0 print:block">
      <div className="flex items-center justify-between mb-4 lg:mb-2 w-full print:hidden">
        <button 
          onClick={onBack}
          className="p-2 text-black hover:bg-black/5 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest -ml-2"
        >
          <ArrowLeft className="w-5 h-5" /> {state.generatedAppeal ? "Revisar no Chat" : "Voltar"}
        </button>
        <div className="hidden md:flex flex-1 justify-between items-baseline ml-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black">Dossiê do Caso</h3>
          <span className="text-xs font-mono text-amber-800">PROTOCOLO #{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(4, '0')}</span>
        </div>
      </div>
      
      <div className="hidden lg:block h-1 w-full bg-black/5 overflow-hidden mb-6 shrink-0 print:hidden">
        <div className="h-full w-4/5 bg-black"></div>
      </div>

      <div className="flex-1 w-full flex flex-col mb-8 overflow-hidden print:overflow-visible print:mb-0">
        <div className="bg-[#e6e2da] border border-black p-4 md:p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.05)] h-full overflow-auto print:bg-white print:border-none print:shadow-none print:p-0 print:block">
          <div className="text-[11px] font-serif uppercase tracking-widest text-center border-b border-black/10 pb-4 mb-4 italic text-black shrink-0 w-full mx-auto max-w-[210mm] print:hidden">
            Minuta de Recurso Administrativo
          </div>
          {state.generatedAppeal ? (
            <div 
              ref={documentRef}
              className="mx-auto bg-white border border-gray-200 shadow-sm text-[11pt] text-black leading-relaxed font-serif whitespace-pre-wrap w-full max-w-[210mm] min-h-[297mm] px-6 sm:px-12 py-10 sm:py-16 shrink-0 print:border-none print:shadow-none print:w-full print:px-0 print:py-0"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {state.generatedAppeal}
            </div>
          ) : (
            <div className="mx-auto bg-white border border-gray-200 shadow-sm w-full max-w-[210mm] min-h-[297mm] px-12 py-16 shrink-0 flex flex-col items-center justify-center text-black/40 gap-4 font-sans italic text-sm">
              <FileText className="w-12 h-12 text-black/20" />
              <p>Análise em andamento. O documento aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="shrink-0 space-y-3 relative z-10 bg-[#F5F2ED] print:hidden">
        {state.generatedAppeal ? (
          <div className="flex flex-col md:flex-row gap-3">
             <button 
               onClick={handleDownloadPDF}
               disabled={isDownloading}
               className="w-full bg-black text-white py-4 md:py-5 px-6 flex justify-between items-center group disabled:opacity-50 transition-colors"
             >
               <span className="text-xs md:text-sm uppercase tracking-widest font-bold">
                 {isDownloading ? "Gerando..." : "Baixar em PDF"}
               </span>
               <Download className="w-5 h-5 text-white" />
             </button>
             <button 
               onClick={handleDownloadDoc}
               disabled={isDownloading}
               className="w-full bg-amber-600 text-white py-4 md:py-5 px-6 flex justify-between items-center group disabled:opacity-50 transition-colors"
             >
               <span className="text-xs md:text-sm uppercase tracking-widest font-bold">
                 Baixar em .DOC
               </span>
               <FileText className="w-5 h-5 text-white" />
             </button>
          </div>
        ) : (
          <button 
            onClick={onGenerateAppeal}
            disabled={state.isGeneratingAppeal || state.messages.length < 3 || isCreatingPayment}
            className="hidden lg:flex w-full bg-black text-white py-4 md:py-5 px-6 justify-between items-center group disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
          >
            <span className="text-xs md:text-sm uppercase tracking-widest font-bold">
              {state.isGeneratingAppeal || isCreatingPayment ? "Processando..." : "Gerar Recurso PDF"}
            </span>
            <span className="text-xl md:text-2xl font-[Playfair_Display] italic text-amber-500">$ 29,90</span>
          </button>
        )}
        
        <div className="flex gap-3">
           <div className="flex-1 p-3 md:p-4 bg-amber-100 text-[9px] md:text-[10px] leading-tight uppercase font-bold tracking-tight text-amber-900 border border-amber-200">
             Instruções de Protocolo Digital inclusas via Portal Gov.br
           </div>
           <div className="flex-1 p-3 md:p-4 bg-zinc-200 text-[9px] md:text-[10px] leading-tight uppercase font-bold tracking-tight text-zinc-800 border border-zinc-300">
             Encaminhamento Direto ao Órgão Autuador
           </div>
        </div>
      </div>
    </div>
  );
}
