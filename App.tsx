
import React, { useState, useEffect } from 'react';
import { Upload, Music, Loader2, Sparkles, Zap, Crown, ShieldCheck, Globe, Star, AlertCircle, Key, Youtube, ExternalLink, Cpu } from 'lucide-react';
import { AppState } from './types.ts';
import { gemini } from './services/geminiService.ts';
import Editor from './components/Editor.tsx';
import SubscriptionModal from './components/SubscriptionModal.tsx';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('chromabeat_state_v3');
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
  });

  const [error, setError] = useState<string | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // Priority 1: Check environment variable injected by the platform
      if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
        setHasKey(true);
        return;
      }
      
      // Priority 2: Check window.aistudio helper for manual selection
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for environments where key is just expected to work or provided via env
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('chromabeat_state_v3', JSON.stringify({
      isPro: state.isPro,
      videosProduced: state.videosProduced
    }));
  }, [state.isPro, state.videosProduced]);

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Per instructions: assume success after triggering the dialog to avoid race conditions
      setHasKey(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please upload a valid audio file.');
      return;
    }

    setState(prev => ({ ...prev, processing: true, audioFile: file }));
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(file);
      const audioBase64 = await base64Promise;

      const metadata = await gemini.processAudio(audioBase64, file.type);
      const bgImage = await gemini.generateBackgroundImage(`Cinematic high-fidelity visualization: ${metadata.imagePrompt}`);

      setState(prev => ({
        ...prev,
        audioUrl: URL.createObjectURL(file),
        metadata,
        backgroundImage: bgImage,
        processing: false
      }));
    } catch (err: any) {
      setError(err.message || 'Processing failed. Please ensure your API key has enough quota.');
      setState(prev => ({ ...prev, processing: false }));
      
      // If requested entity not found, re-prompt for key as per instructions
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
    }
  };

  const updateBackground = (url: string, isVideo?: boolean) => {
    setState(prev => ({ 
      ...prev, 
      backgroundImage: isVideo ? prev.backgroundImage : url,
      backgroundVideoUrl: isVideo ? url : prev.backgroundVideoUrl 
    }));
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full glass rounded-[3rem] p-12 border-cyan-500/20 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-[1.5rem] bg-cyan-500/10 flex items-center justify-center mx-auto border border-cyan-500/30">
            <Cpu className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black font-heading tracking-tight uppercase">Connect AI Engine</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              ChromaBeat requires a paid Google Gemini API key to generate high-quality 4K videos and artistic visuals.
            </p>
          </div>
          <div className="space-y-4 pt-4">
            <button 
              onClick={handleOpenKeySelector}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl shadow-cyan-500/20"
            >
              <Key className="w-5 h-5" />
              SELECT API KEY
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="inline-flex items-center gap-2 text-[10px] text-white/30 font-black uppercase tracking-widest hover:text-white transition"
            >
              Learn about Billing & Usage <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state.audioUrl && state.metadata) {
    return (
      <>
        <Editor 
          appState={state} 
          onBack={() => setState(prev => ({ ...prev, audioUrl: null }))} 
          onExported={() => setState(prev => ({ ...prev, videosProduced: prev.videosProduced + 1 }))}
          onUpdateBackground={updateBackground}
          onRequestUpgrade={() => setShowSubModal(true)} 
        />
        <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center p-6 overflow-x-hidden">
      <div className="fixed top-8 right-8 z-50 flex items-center gap-3">
        <button onClick={handleOpenKeySelector} className="glass w-12 h-12 rounded-2xl flex items-center justify-center border-white/5 hover:bg-white/10 transition group">
          <Key className="w-5 h-5 text-white/40 group-hover:text-cyan-400" />
        </button>
        {!state.isPro ? (
          <button onClick={() => setShowSubModal(true)} className="glass px-6 py-3 rounded-2xl flex items-center gap-2 border-cyan-500/30 hover:bg-cyan-500/10 transition shadow-lg shadow-cyan-500/5"><Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" /><span className="text-sm font-bold tracking-tight uppercase">Go Pro</span></button>
        ) : (
          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-2 border-yellow-500/30 bg-yellow-500/5"><Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" /><span className="text-sm font-bold text-yellow-500 uppercase">Pro Studio</span></div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full text-center z-10 space-y-12 py-20">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ChromaBeat AI v4.0 Platinum</span>
          </div>
          <h1 className="text-7xl md:text-9xl font-bold font-heading tracking-tight leading-[0.85] text-white">
            Audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">Cinematic</span>
          </h1>
          <p className="text-xl text-white/40 max-w-2xl mx-auto leading-relaxed font-medium">
            Generate stunning 4K music videos from any sound. AI-synced lyrics, mood analysis, and professional rendering.
          </p>
        </div>

        <div className="relative group w-full max-w-2xl">
          {state.processing ? (
            <div className="glass rounded-[4rem] p-24 flex flex-col items-center gap-10 border-cyan-500/20 shadow-[0_0_150px_rgba(34,211,238,0.15)] animate-in fade-in duration-700">
              <Loader2 className="w-24 h-24 text-cyan-500 animate-spin" />
              <div className="space-y-4">
                <p className="text-3xl font-black font-heading tracking-tight">ChromaBeat is Syncing...</p>
                <div className="flex justify-center gap-2">
                  <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">Mood Mapping</span>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">AI Rendering</span>
                </div>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer block group">
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              <div className="glass rounded-[4.5rem] p-28 border-2 border-dashed border-white/5 group-hover:border-cyan-500/40 group-hover:bg-white/[0.04] transition-all duration-700 flex flex-col items-center gap-12 shadow-2xl relative overflow-hidden">
                <div className="w-28 h-28 rounded-[2rem] bg-white/5 flex items-center justify-center group-hover:scale-110 transition-all duration-700 group-hover:shadow-[0_0_50px_rgba(34,211,238,0.2)]">
                  <Upload className="w-12 h-12 text-white/20 group-hover:text-cyan-400" />
                </div>
                <div className="space-y-4">
                  <p className="text-4xl font-black font-heading tracking-tight">Upload Your Track</p>
                  <p className="text-[11px] text-white/20 uppercase tracking-[0.5em] font-black">MP3, WAV, FLAC, M4A</p>
                </div>
              </div>
            </label>
          )}
          {error && (
            <div className="mt-8 glass px-8 py-6 rounded-[2rem] border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex flex-col items-center gap-4">
              <div className="flex items-center gap-3"><AlertCircle className="w-5 h-5" /> {error}</div>
              <button onClick={handleOpenKeySelector} className="bg-red-500/20 px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition">Reconnect API Key</button>
            </div>
          )}
        </div>
      </div>
      
      <footer className="w-full max-w-5xl px-8 flex justify-between items-center mt-auto pb-12 opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
        <div className="flex items-center gap-6"><span>PRIVACY</span><span>TERMS</span><span>DOCS</span></div>
        <div className="flex items-center gap-3"><Youtube className="w-4 h-4" /><span>ChromaBeat Studio 2025</span></div>
      </footer>
      
      <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
    </div>
  );
};

export default App;
