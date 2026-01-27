
import React, { useState, useEffect } from 'react';
import { Upload, Music, Loader2, Sparkles, Zap, Crown, ShieldCheck, Globe, Star, AlertCircle, Key } from 'lucide-react';
import { AppState } from './types';
import { gemini } from './services/geminiService';
import Editor from './components/Editor';
import SubscriptionModal from './components/SubscriptionModal';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('sonic_visualizer_state');
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
    localStorage.setItem('sonic_visualizer_state', JSON.stringify({
      isPro: state.isPro,
      videosProduced: state.videosProduced
    }));
  }, [state.isPro, state.videosProduced]);

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
      const bgImage = await gemini.generateBackgroundImage(metadata.imagePrompt);

      setState(prev => ({
        ...prev,
        audioUrl: URL.createObjectURL(file),
        metadata,
        backgroundImage: bgImage,
        processing: false
      }));
    } catch (err: any) {
      setError(err.message || 'Processing failed. Check your API key.');
      setState(prev => ({ ...prev, processing: false }));
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
      <div className="fixed top-8 right-8 z-50 flex items-center gap-3">
        <button onClick={() => (window as any).aistudio?.openSelectKey()} className="glass w-12 h-12 rounded-2xl flex items-center justify-center border-white/5 hover:bg-white/10 transition"><Key className="w-5 h-5 text-white/40" /></button>
        {!state.isPro ? (
          <button onClick={() => setShowSubModal(true)} className="glass px-6 py-3 rounded-2xl flex items-center gap-2 border-blue-500/30 hover:bg-blue-500/10 transition"><Zap className="w-4 h-4 text-blue-400 fill-blue-400" /><span className="text-sm font-bold tracking-tight uppercase">Go Pro</span></button>
        ) : (
          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-2 border-yellow-500/30 bg-yellow-500/5"><Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" /><span className="text-sm font-bold text-yellow-500 uppercase">Pro</span></div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl w-full text-center z-10 space-y-12 py-20">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4"><Sparkles className="w-3.5 h-3.5 text-blue-400" /><span>AI Music Video Engine v3.2</span></div>
          <h1 className="text-6xl md:text-8xl font-bold font-heading tracking-tight leading-[0.9] text-white">Animate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Audio</span></h1>
          <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed">Turn sounds into cinematic beat-synced videos with AI lyrics and Veo motion backgrounds.</p>
        </div>

        <div className="relative group w-full max-w-xl">
          {state.processing ? (
            <div className="glass rounded-[3rem] p-20 flex flex-col items-center gap-8 border-blue-500/20 shadow-2xl">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              <div className="space-y-2">
                <p className="text-xl font-bold font-heading">Processing Acoustics...</p>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Syncing beat markers & metadata</p>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer block group">
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              <div className="glass rounded-[3rem] p-20 border-2 border-dashed border-white/10 group-hover:border-blue-500/40 group-hover:bg-white/[0.05] transition-all duration-700 flex flex-col items-center gap-8 shadow-2xl">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-all duration-500"><Upload className="w-8 h-8 text-white/40 group-hover:text-blue-400" /></div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold font-heading">Drop your sound</p>
                  <p className="text-sm text-white/30 text-center uppercase tracking-widest font-bold">Import MP3 or WAV</p>
                </div>
              </div>
            </label>
          )}
          {error && <div className="mt-6 glass px-6 py-4 rounded-2xl border-red-500/20 bg-red-500/5 text-red-400 text-sm font-bold">{error}</div>}
        </div>
      </div>
      <footer className="w-full max-w-6xl mt-20 pb-12 border-t border-white/5 pt-12 z-10 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.4em]">© 2025 SonicVisualizer Studio. Powered by Google Veo & Gemini.</footer>
      <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
    </div>
  );
};

export default App;
