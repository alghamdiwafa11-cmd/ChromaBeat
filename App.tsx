
import React, { useState, useEffect } from 'react';
import { Upload, Music, Loader2, Sparkles, Zap, Crown, ShieldCheck, Globe, Star, AlertCircle, Key, Youtube, ExternalLink, Cpu } from 'lucide-react';
import { AppState } from './types.ts';
import { gemini } from './services/geminiService.ts';
import Editor from './components/Editor.tsx';
import SubscriptionModal from './components/SubscriptionModal.tsx';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('chromabeat_v4_state');
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
      const isEnvSet = !!process.env.API_KEY && process.env.API_KEY !== 'undefined';
      const isSelected = (window as any).aistudio?.hasSelectedApiKey ? await (window as any).aistudio.hasSelectedApiKey() : false;
      setHasKey(isEnvSet || isSelected);
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('chromabeat_v4_state', JSON.stringify({
      isPro: state.isPro,
      videosProduced: state.videosProduced
    }));
  }, [state.isPro, state.videosProduced]);

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasKey && !(process.env.API_KEY && process.env.API_KEY !== 'undefined')) {
      handleOpenKeySelector();
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
      const bgImage = await gemini.generateBackgroundImage(`Cinematic atmospheric visualization of ${metadata.imagePrompt}`);

      setState(prev => ({
        ...prev,
        audioUrl: URL.createObjectURL(file),
        metadata,
        backgroundImage: bgImage,
        processing: false
      }));
    } catch (err: any) {
      setError(err.message || 'Processing failed.');
      setState(prev => ({ ...prev, processing: false }));
      if (err.message?.includes("API_KEY")) {
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
    <div className="min-h-screen bg-[#050505] flex flex-col items-center p-6">
      <header className="w-full max-w-7xl flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-black font-heading tracking-tighter uppercase">ChromaBeat</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleOpenKeySelector} className={`glass px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition ${!hasKey ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 animate-pulse' : 'text-white/40'}`}>
             <Key className="w-3.5 h-3.5" />
             {hasKey ? 'Engine Connected' : 'Setup AI Studio'}
           </button>
           {!state.isPro && (
             <button onClick={() => setShowSubModal(true)} className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition">Go Pro</button>
           )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6">
          <h1 className="text-7xl md:text-9xl font-black font-heading tracking-tighter leading-[0.8] text-white">
            Audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">Cinematic</span>
          </h1>
          <p className="text-lg text-white/40 max-w-xl mx-auto font-medium">
            Turn your tracks into 4K visual experiences with ChromaBeat's advanced AI engine.
          </p>
        </div>

        <div className="w-full max-w-2xl relative">
          {state.processing ? (
            <div className="glass rounded-[4rem] p-24 flex flex-col items-center gap-8 border-cyan-500/20 shadow-2xl animate-in fade-in zoom-in duration-500">
              <Loader2 className="w-20 h-20 text-cyan-500 animate-spin" />
              <p className="text-2xl font-black font-heading uppercase tracking-tight">Deconstructing Audio...</p>
            </div>
          ) : (
            <label className="cursor-pointer block group">
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              <div className="glass rounded-[4rem] p-28 border-2 border-dashed border-white/5 group-hover:border-cyan-500/40 group-hover:bg-white/[0.04] transition-all duration-700 flex flex-col items-center gap-10 shadow-2xl relative overflow-hidden">
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:shadow-2xl transition-all duration-700">
                  <Upload className="w-10 h-10 text-white/20 group-hover:text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-black font-heading tracking-tight">Drop Your Track</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-black">AI Mastered MP3 / WAV / FLAC</p>
                </div>
              </div>
            </label>
          )}

          {error && (
            <div className="mt-8 glass px-8 py-6 rounded-[2rem] border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3"><AlertCircle className="w-5 h-5" /> {error}</div>
              {error.includes("API") && (
                <button onClick={handleOpenKeySelector} className="bg-red-500/20 px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition">Select Paid API Key</button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="w-full max-w-7xl flex justify-between items-center py-12 opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
        <div className="flex items-center gap-8"><span>Privacy</span><span>Terms</span><span>Creator Guide</span></div>
        <div className="flex items-center gap-3"><Youtube className="w-4 h-4" /><span>ChromaBeat Studio v4.0</span></div>
      </footer>

      <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
    </div>
  );
};

export default App;
