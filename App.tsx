import React, { useState, useEffect } from 'react';
import { Upload, Music, Loader2, Sparkles, AlertCircle, Key, Youtube, Zap, Check, Star } from 'lucide-react';
import { AppState } from './types.ts';
import { gemini } from './services/geminiService.ts';
import Editor from './components/Editor.tsx';
import SubscriptionModal from './components/SubscriptionModal.tsx';
import { PRICING_CONFIG } from './constants.tsx';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('chromabeat_v6_state');
      const initial = saved ? JSON.parse(saved) : {};
      return {
        audioFile: null,
        audioUrl: null,
        processing: false,
        metadata: null,
        backgroundImage: null,
        backgroundVideoUrl: null,
        isPro: initial.isPro || false,
        videosProduced: initial.videosProduced || 0,
      };
    } catch (e) {
      return {
        audioFile: null,
        audioUrl: null,
        processing: false,
        metadata: null,
        backgroundImage: null,
        backgroundVideoUrl: null,
        isPro: false,
        videosProduced: 0,
      };
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('chromabeat_v6_state', JSON.stringify({ isPro: state.isPro, videosProduced: state.videosProduced }));
  }, [state.isPro, state.videosProduced]);

  const getEnvKey = () => {
    return (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
  };

  const isKeyPresent = () => {
    const key = getEnvKey();
    return !!key && key !== 'undefined' && key !== 'null' && key.length > 5;
  };

  useEffect(() => {
    const detect = async () => {
      if (isKeyPresent()) {
        setHasKey(true);
        return;
      }
      try {
        if ((window as any).aistudio?.hasSelectedApiKey) {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(selected);
        }
      } catch (e) {}
    };
    detect();
  }, []);

  const handleOpenKeySelector = async () => {
    if (isKeyPresent()) {
      setHasKey(true);
      return true;
    }
    try {
      if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true); 
        setError(null);
        return true;
      }
      setError("API Key Missing: Please set the 'API_KEY' environment variable.");
      return false;
    } catch (e) {
      setError("Failed to open AI engine selector.");
      return false;
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)) {
      setError('Unsupported audio format. Please use MP3, WAV or FLAC.');
      return;
    }

    if (!hasKey && !isKeyPresent()) {
      const ok = await handleOpenKeySelector();
      if (!ok) return;
    }

    setState(prev => ({ ...prev, processing: true, audioFile: file }));
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("File read error."));
      });
      reader.readAsDataURL(file);
      const audioBase64 = await base64Promise;

      const metadata = await gemini.processAudio(audioBase64, file.type || 'audio/mpeg');
      const bgImage = await gemini.generateBackgroundImage(`Atmospheric cinematic visualizer background: ${metadata.imagePrompt}`);

      setState(prev => ({
        ...prev,
        audioUrl: URL.createObjectURL(file),
        metadata,
        backgroundImage: bgImage,
        processing: false
      }));
    } catch (err: any) {
      console.error("App Pipeline Error:", err);
      let msg = err.message;
      if (msg === "API_KEY_NOT_FOUND" || msg === "RE_SELECT_KEY") {
        msg = "AI Key Required: Please link your account or select a paid API key.";
        setHasKey(false);
      }
      setError(msg || 'An unexpected error occurred.');
      setState(prev => ({ ...prev, processing: false }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  if (state.audioUrl && state.metadata) {
    return (
      <>
        <Editor 
          appState={state} 
          onBack={() => setState(prev => ({ ...prev, audioUrl: null }))} 
          onExported={() => setState(prev => ({ ...prev, videosProduced: prev.videosProduced + 1 }))}
          onUpdateBackground={(url, isVideo) => setState(prev => ({ ...prev, backgroundImage: isVideo ? prev.backgroundImage : url, backgroundVideoUrl: isVideo ? url : prev.backgroundVideoUrl }))}
          onRequestUpgrade={() => setShowSubModal(true)} 
          onMetadataUpdate={(title, artist) => setState(prev => ({ ...prev, metadata: prev.metadata ? { ...prev.metadata, title, artist } : null }))}
        />
        <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center p-6 selection:bg-cyan-500 selection:text-black scroll-smooth">
      <header className="w-full max-w-7xl flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
            <Zap className="w-6 h-6 text-black fill-black" />
          </div>
          <span className="text-2xl font-black font-heading tracking-tighter uppercase text-white">ChromaBeat</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleOpenKeySelector} className={`glass px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${!hasKey ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-cyan-400 bg-cyan-400/5 border-cyan-400/20'}`}>
             <Key className="w-3.5 h-3.5" />
             {hasKey ? 'AI Engine Ready' : 'Setup AI Engine'}
           </button>
           {!state.isPro ? (
             <button onClick={() => setShowSubModal(true)} className="bg-white text-black px-7 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95">Upgrade Pro</button>
           ) : (
             <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-widest bg-cyan-400/10 px-4 py-2 rounded-2xl border border-cyan-400/20">
                <Star className="w-3.5 h-3.5 fill-cyan-400" /> Pro Member
             </div>
           )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl w-full text-center py-12 space-y-20">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-4">
            <Sparkles className="w-3.5 h-3.5" /> New: Veo 3.1 Fast Integration
          </div>
          <h1 className="text-7xl md:text-[10rem] font-black font-heading tracking-tighter leading-[0.75] text-white">
            Audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">Pure Art</span>
          </h1>
          <p className="text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
            Create professional cinematic visualizers with synced lyrics and AI-generated backgrounds in seconds.
          </p>
        </div>

        <div className="w-full max-w-3xl relative">
          {state.processing ? (
            <div className="glass rounded-[4rem] p-32 flex flex-col items-center gap-10 border-cyan-500/20 shadow-[0_0_100px_rgba(34,211,238,0.1)] animate-in fade-in zoom-in">
              <div className="relative">
                <Loader2 className="w-24 h-24 text-cyan-500 animate-spin" />
                <div className="absolute inset-0 blur-2xl bg-cyan-500/20 animate-pulse rounded-full" />
              </div>
              <div className="space-y-3">
                <p className="text-3xl font-black font-heading uppercase tracking-tight text-white">Mastering Audio...</p>
                <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-black">Syncing frequencies to visual nodes</p>
              </div>
            </div>
          ) : (
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer block transition-all duration-500 ${isDragging ? 'scale-[1.03]' : 'scale-100'}`}
            >
              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
              <div className={`glass rounded-[4rem] p-32 border-2 border-dashed transition-all duration-700 flex flex-col items-center gap-12 shadow-2xl group ${isDragging ? 'border-cyan-400 bg-cyan-400/5 ring-4 ring-cyan-400/10' : 'border-white/10 hover:border-white/20'}`}>
                <div className="w-28 h-28 rounded-[2.5rem] bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Upload className={`w-12 h-12 transition-all duration-500 ${isDragging ? 'text-cyan-400 scale-110' : 'text-white/20 group-hover:text-white/40'}`} />
                </div>
                <div className="space-y-3">
                  <p className="text-5xl font-black font-heading tracking-tight text-white">Drop Audio Here</p>
                  <p className="text-[11px] text-white/20 uppercase tracking-[0.6em] font-black font-mono">MP3 • WAV • FLAC • M4A</p>
                </div>
              </div>
            </label>
          )}

          {error && (
            <div className="mt-10 glass px-10 py-8 rounded-[2.5rem] border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex flex-col items-center gap-5 animate-in fade-in slide-in-from-top-6">
              <div className="flex items-center gap-4 text-center"><AlertCircle className="w-6 h-6 shrink-0" /> {error}</div>
              <button onClick={handleOpenKeySelector} className="bg-red-500/20 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition shadow-lg">Retry AI Auth</button>
            </div>
          )}
        </div>

        {!state.isPro && (
          <section id="pricing" className="w-full pt-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <div className="glass rounded-[4rem] p-16 border-white/5 relative overflow-hidden">
               <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px]" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                  <div className="text-left space-y-8">
                     <h2 className="text-5xl font-black font-heading tracking-tighter text-white uppercase leading-none">The Creator <br/><span className="text-cyan-400">Pro Plan</span></h2>
                     <p className="text-white/40 text-lg font-medium leading-relaxed">Unlock the full power of ChromaBeat Studio and transform your sound into viral content.</p>
                     <ul className="space-y-4">
                        {PRICING_CONFIG.currentPlan.features.map((f, i) => (
                           <li key={i} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/60">
                              <Check className="w-5 h-5 text-cyan-400" /> {f}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="bg-white/5 rounded-[3rem] p-12 border border-white/10 flex flex-col items-center space-y-8">
                     <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-4">Unlimited Access</p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-8xl font-black tracking-tighter text-white">{PRICING_CONFIG.currentPlan.currency}{PRICING_CONFIG.currentPlan.price}</span>
                           <span className="text-white/30 text-xs font-black uppercase tracking-widest">/ month</span>
                        </div>
                     </div>
                     <button onClick={() => setShowSubModal(true)} className="w-full bg-cyan-500 text-black py-6 rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition shadow-2xl shadow-cyan-500/20 active:scale-95">Subscribe Now</button>
                     <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Secure PayPal Billing • Cancel Anytime</p>
                  </div>
               </div>
            </div>
          </section>
        )}
      </main>
      
      <footer className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center py-20 gap-10 border-t border-white/5 mt-20">
        <div className="flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
          <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
          <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
          <span className="hover:text-white cursor-pointer transition" onClick={() => !state.isPro && setShowSubModal(true)}>Pro Pricing</span>
        </div>
        <div className="flex items-center gap-4 font-heading text-white/20">
          <Youtube className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">ChromaBeat Studio v6.2.0</span>
        </div>
      </footer>

      <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
    </div>
  );
};

export default App;