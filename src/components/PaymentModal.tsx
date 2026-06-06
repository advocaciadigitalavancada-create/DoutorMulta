import React, { useState, useEffect } from 'react';
import { Loader2, Copy, CheckCircle2, X } from 'lucide-react';
import { PaymentInfo } from '../types';

export default function PaymentModal({
  paymentInfo,
  onClose,
  onPaymentConfirmed
}: {
  paymentInfo: PaymentInfo;
  onClose: () => void;
  onPaymentConfirmed: () => void;
}) {
  const [status, setStatus] = useState<'PENDING' | 'CONFIRMED' | 'ERROR'>('PENDING');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'CONFIRMED' || status === 'ERROR') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/check-payment/${paymentInfo.id}`);
        if (!res.ok) throw new Error('Erro ao verificar status');
        
        const data = await res.json();
        if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
          setStatus('CONFIRMED');
          clearInterval(interval);
          
          // Auto close and proceed after a short delay
          setTimeout(() => {
            onPaymentConfirmed();
          }, 2000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000); // Polling every 3 seconds

    return () => clearInterval(interval);
  }, [paymentInfo.id, status, onPaymentConfirmed]);

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentInfo.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          disabled={status === 'CONFIRMED'}
          className="absolute top-4 right-4 p-2 text-black/50 hover:text-black transition-colors disabled:opacity-0"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-6 shadow-lg font-serif italic text-2xl font-bold shrink-0">
            Dr
          </div>
          
          <h2 className="text-3xl font-black font-serif mb-2">Liberação de Recurso</h2>
          <p className="text-sm opacity-60 uppercase tracking-widest font-bold mb-8">
            Pagamento via PIX - R$ 29,90
          </p>

          {status === 'CONFIRMED' ? (
            <div className="flex flex-col items-center py-8 fade-in">
              <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
              <h3 className="text-2xl font-bold text-green-600 mb-2">Pagamento Confirmado!</h3>
              <p className="text-black/60 text-sm">Gerando o seu recurso automaticamente...</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center fade-in">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-black/10 mb-6">
                <img 
                  src={`data:image/png;base64,${paymentInfo.encodedImage}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <div className="w-full bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6 relative">
                <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2 text-left">
                  Pix Copia e Cola
                </p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={paymentInfo.payload}
                    className="flex-1 bg-transparent text-sm outline-none text-black/80 truncate font-mono"
                  />
                  <button 
                    onClick={handleCopy}
                    className="p-2 bg-black text-white rounded hover:bg-black/80 transition-colors shrink-0 flex items-center gap-2"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {copied ? "Copiado" : "Copiar"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-amber-600 font-bold text-sm uppercase tracking-widest">
                <Loader2 className="w-5 h-5 animate-spin" />
                Aguardando Pagamento...
              </div>
              
              {paymentInfo.mock && (
                <p className="text-[10px] text-red-500 mt-4 uppercase tracking-widest">
                  * MODO DE TESTE. O PAGAMENTO SERÁ CONFIRMADO SOZINHO EM 10 SEGUNDOS.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
