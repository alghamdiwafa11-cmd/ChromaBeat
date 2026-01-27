
import React, { useState } from 'react';
// Added Loader2 to the imports from lucide-react
import { Check, X, CreditCard, ShieldCheck, Zap, Lock, Info, AlertCircle, Loader2 } from 'lucide-react';
import { PRICING_CONFIG } from '../constants';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const plan = PRICING_CONFIG.currentPlan;

  const handlePayment = (method: string) => {
    if (!agreed) {
      setError("Please agree to the Terms of Service to continue.");
      return;
    }
    setError(null);
    setIsProcessing(true);
    
    // Mimic actual payment gateway redirection
    setTimeout(() => {
        setIsProcessing(false);
        onSuccess();
        alert(`Success! Your Lifetime Pro access has been activated via ${method}.`);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative glass w-full max-w-xl rounded-[3.5rem] overflow-hidden border-white/10 shadow-[0_0_150px_rgba(59,130,246,0.2)] animate-in fade-in zoom-in duration-500">
        <button onClick={onClose} className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors z-50 p-2">
          <X className="w-6 h-6" />
        </button>

        <div className="p-10 md:p-16">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black font-heading tracking-tight leading-none mb-2 uppercase">Unlock Pro</h2>
              <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Premium AI Cinematic Studio</p>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-[2.5rem] p-10 border border-white/5 mb-8 relative group">
            <div className="absolute -top-4 right-10 bg-blue-500 text-[10px] font-black px-6 py-2 rounded-full shadow-2xl tracking-[0.2em]">{plan.badge}</div>
            
            <div className="flex justify-between items-end mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white/20 text-sm line-through font-bold">{plan.currency}{plan.originalPrice}</span>
                  <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">{plan.discount}</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black tracking-tighter">{plan.currency}{plan.price}</span>
                    <span className="text-white/30 text-xs uppercase tracking-widest font-black ml-2">{plan.billingCycle}</span>
                </div>
              </div>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-4 text-[11px] text-white/60 font-bold uppercase tracking-tight">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 mb-8">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative pt-0.5">
                <input 
                    type="checkbox" 
                    checked={agreed} 
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-white/10 bg-white/5 accent-blue-500 transition-all cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-white/30 leading-relaxed font-bold uppercase tracking-wider group-hover:text-white/50 transition-colors">
                I authorize a one-time charge for lifetime access. See <button className="text-blue-400 hover:underline">Terms</button>.
              </span>
            </label>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-500 text-[10px] font-black animate-pulse">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => handlePayment('PayPal')}
              disabled={!agreed || isProcessing}
              className={`w-full bg-[#ffc439] hover:bg-[#f2ba36] text-[#003087] font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-2xl ${(!agreed || isProcessing) ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6" />
                    <span>Pay with PayPal</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handlePayment('Card')}
                disabled={!agreed || isProcessing}
                className={`bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all ${(!agreed || isProcessing) ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
              >
                <CreditCard className="w-5 h-5 text-white/40" /> Credit Card
              </button>
              <button 
                onClick={() => handlePayment('Apple')}
                disabled={!agreed || isProcessing}
                className={`bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all ${(!agreed || isProcessing) ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
              >
                Apple Pay
              </button>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 border-t border-white/5 pt-10">
            <span className="flex items-center gap-2 text-[10px] text-white/20 font-black uppercase tracking-[0.2em]"><ShieldCheck className="w-4 h-4" /> Secure SSL</span>
            <span className="flex items-center gap-2 text-[10px] text-white/20 font-black uppercase tracking-[0.2em]"><Lock className="w-4 h-4" /> Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
