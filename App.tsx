import React, { useState, useEffect } from 'react';
import { Upload, Music, Loader2, Sparkles, AlertCircle, Key, Youtube } from 'lucide-react';
import { AppState } from './types.ts';
import { gemini } from './services/geminiService.ts';
import Editor from './components/Editor.tsx';
import SubscriptionModal from './components/SubscriptionModal.tsx';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('chromabeat_v5_state');
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

  // Checks if API_KEY is present in the environment
  const isEnvKeySet = () => {
    const key = process.env.API_KEY;
    return !!key && key !== 'undefined' && key !== 'null' && key.length > 5;
  };

  useEffect(() => {
    const detect = async () => {
      if (isEnvKeySet()) {
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
    if (isEnvKeySet()) {
      setHasKey(true);
      return true;
    }
    try {
      if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true); // GUIDELINE: Assume success after trigger
        setError(null);
        return true;
      }
      setError("API Key Required: Please ensure your environment variable API_KEY is set.");
      return false;
    } catch (e) {
      setError("AI Studio selector failed.");
      return false;
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)) {
      setError('Unsupported audio format.');
      return;
    }

    if (!hasKey && !isEnvKeySet()) {
      const ok = await handleOpenKeySelector();
      if (!ok) return;
    }

    setState(prev => ({ ...prev, processing: true, audioFile: file }));
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Audio read error."));
      });
      reader.readAsDataURL(file);
      const audioBase64 = await base64Promise;

      const metadata = await gemini.processAudio(audioBase64, file.type || 'audio/mpeg');
      const bgImage = await gemini.generateBackgroundImage(`Cinematic atmospheric visualization: ${metadata.imagePrompt}`);

      setState(prev => ({
        ...prev,
        audioUrl: URL.createObjectURL(file),
        metadata,
        backgroundImage: bgImage,
        processing: false
      }));
    } catch (err: any) {
      console.error("Pipeline Failure:", err);
      let msg = err.message;
      if (msg === "API_KEY_NOT_FOUND" || msg === "RE_SELECT_KEY") {
        msg = "AI Authentication Required. Please click 'Setup AI Engine' and select a paid key.";
        setHasKey(false);
      }
      setError(msg || 'An error occurred during processing.');
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
        />
        <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center p-6 selection:bg-cyan-500">
      <header className="w-full max-w-7xl flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-black font-heading tracking-tighter uppercase">ChromaBeat</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleOpenKeySelector} className={`glass px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${!hasKey ? 'text-white/40' : 'text-cyan-400'}`}>
             <Key className="w-3.5 h-3.5" />
             {hasKey ? 'AI Engine Ready' : 'Setup AI Engine'}
           </button>
           {!state.isPro && (
             <button onClick={() => setShowSubModal(true)} className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg">Go Pro</button>
           )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6">
          <h1 className="text-7xl md:text-9xl font-black font-heading tracking-tighter leading-[0.8] text-white">
            Audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-600">Cinematic</span>
          </h1>
          <p className="text-lg text-white/40 max-w-xl mx-auto font-medium">
            Transform tracks into high-definition AI visualizers with synced lyrics instantly.
          </p>
        </div>

        <div className="w-full max-w-2xl relative">
          {state.processing ? (
            <div className="glass rounded-[4rem] p-24 flex flex-col items-center gap-8 border-cyan-500/20 shadow-2xl">
              <Loader2 className="w-20 h-20 text-cyan-500 animate-spin" />
              <div className="space-y-2">
                <p className="text-2xl font-black font-heading uppercase tracking-tight text-white">AI Studio Working...</p>
                <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">Synthesizing audio data</p>
              </div>
            </div>
          ) : (
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer block transition-all duration-300 ${isDragging ? 'scale-105' : 'scale-100'}`}
            >
              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
              <div className={`glass rounded-[4rem] p-28 border-2 border-dashed transition-all duration-500 flex flex-col items-center gap-10 shadow-2xl ${isDragging ? 'border-cyan-400 bg-cyan-500/5' : 'border-white/5'}`}>
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center">
                  <Upload className={`w-10 h-10 ${isDragging ? 'text-cyan-400' : 'text-white/20'}`} />
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-black font-heading tracking-tight">Drop Audio</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-black">MP3, WAV, FLAC</p>
                </div>
              </div>
            </label>
          )}

          {error && (
            <div className="mt-8 glass px-8 py-6 rounded-[2rem] border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 text-center"><AlertCircle className="w-5 h-5 shrink-0" /> {error}</div>
              {(!hasKey) && (
                <button onClick={handleOpenKeySelector} className="bg-red-500/20 px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition">Update Engine</button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="w-full max-w-7xl flex justify-between items-center py-12 opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
        <div className="flex items-center gap-8"><span>Privacy</span><span>Terms</span><span>Legal</span></div>
        <div className="flex items-center gap-3 font-heading"><Youtube className="w-4 h-4" /><span>ChromaBeat Studio v4.6</span></div>
      </footer>

      <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
    </div>
  );
};

export default App;