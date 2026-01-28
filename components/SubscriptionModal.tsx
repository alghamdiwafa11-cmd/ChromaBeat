import React, { useState, useEffect, useRef } from 'react';
import { Check, X, CreditCard, ShieldCheck, Zap, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { PRICING_CONFIG } from '../constants.tsx';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonRendered = useRef(false);

  useEffect(() => {
    const checkScript = () => {
      if ((window as any).paypal) {
        setScriptReady(true);
      } else {
        setTimeout(checkScript, 500);
      }
    };
    checkScript();
  }, []);

  useEffect(() => {
    if (isOpen && agreed && scriptReady && paypalContainerRef.current && !paypalButtonRendered.current) {
      try {
        (window as any).paypal.Buttons({
          createOrder: (data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [{
                description: "ChromaBeat Pro Monthly Subscription",
                amount: {
                  currency_code: "GBP",
                  value: PRICING_CONFIG.currentPlan.price
                }
              }]
            });
          },
          onApprove: async (data: any, actions: any) => {
            setIsProcessing(true);
            try {
              await actions.order.capture();
              setIsProcessing(false);
              onSuccess();
              onClose();
            } catch (err) {
              setError("Subscription failed. Check your bank connection.");
              setIsProcessing(false);
            }
          },
          onError: (err: any) => {
            console.error("PayPal Error:", err);
            setError("PayPal connection error. Smart buttons failed to load.");
          },
          style: { 
            layout: 'vertical', 
            color: 'blue', 
            shape: 'pill', 
            label: 'pay' 
          }
        }).render(paypalContainerRef.current);
        paypalButtonRendered.current = true;
      } catch (e) {
        console.error("Button Render Exception:", e);
      }
    }
  }, [isOpen, agreed, scriptReady, onSuccess, onClose]);

  const handleSimulatedPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const plan = PRICING_CONFIG.currentPlan;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative glass w-full max-w-xl rounded-[3.5rem] overflow-hidden border-white/10 shadow-[0_0_150px_rgba(59,130,246,0.1)] animate-in fade-in zoom-in duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors z-50 p-2">
          <X className="w-6 h-6" />
        </button>

        <div className="p-10 md:p-16">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black font-heading tracking-tight leading-none mb-2 uppercase">Pro Studio</h2>
              <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Unlimited Creator Access</p>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-[2.5rem] p-10 border border-white/5 mb-8 relative">
            <div className="absolute -top-4 right-10 bg-cyan-500 text-[10px] font-black px-6 py-2 rounded-full tracking-[0.2em] text-black uppercase shadow-lg shadow-cyan-500/30">{plan.badge}</div>
            
            <div className="flex justify-between items-end mb-10">
              <div>
                <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black tracking-tighter">{plan.currency}{plan.price}</span>
                    <span className="text-white/30 text-xs uppercase tracking-widest font-black ml-2">{plan.billingCycle}</span>
                </div>
              </div>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-4 text-[11px] text-white/60 font-bold uppercase tracking-tight">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 mb-8">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); if (!e.target.checked) paypalButtonRendered.current = false; }} className="w-5 h-5 rounded-lg border-white/10 bg-white/5 accent-cyan-500 cursor-pointer" />
              <span className="text-[10px] text-white/30 leading-relaxed font-bold uppercase tracking-wider group-hover:text-white/50 transition-colors">
                I authorize a monthly charge of £10 for Pro status. Securely processed by PayPal. Cancel anytime.
              </span>
            </label>
            {error && <div className="mt-4 flex flex-col gap-2 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
              <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase"><AlertCircle className="w-4 h-4" /> {error}</div>
              <button onClick={handleSimulatedPayment} className="text-[9px] text-cyan-400 uppercase font-black hover:underline text-left">Click here to try Simulated Checkout if PayPal is blocked</button>
            </div>}
          </div>

          <div className="space-y-4">
            {!agreed ? (
              <div className="w-full bg-white/5 py-10 rounded-3xl flex flex-col items-center justify-center border border-white/5 border-dashed">
                 <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Review Terms Above</p>
              </div>
            ) : (
              <div className="relative min-h-[150px]">
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 z-[110] flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Authorizing Payment...</p>
                  </div>
                )}
                {!scriptReady && (
                   <div className="w-full py-10 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-6 h-6 animate-spin text-white/20" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Waking PayPal...</p>
                   </div>
                )}
                <div ref={paypalContainerRef} className="animate-in fade-in duration-700 relative z-[100]" />
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 border-t border-white/5 pt-10">
            <span className="flex items-center gap-2 text-[10px] text-white/10 font-black uppercase tracking-[0.2em]"><ShieldCheck className="w-4 h-4" /> Secure Bank Link</span>
            <span className="flex items-center gap-2 text-[10px] text-white/10 font-black uppercase tracking-[0.2em]"><Lock className="w-4 h-4" /> Encrypted Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;