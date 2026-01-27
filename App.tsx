
import React, { useState, useEffect } from 'react';
import { Upload, Music, Loader2, Sparkles, Zap, Crown, AlertCircle, Key, Youtube } from 'lucide-react';
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

  // Direct check for API_KEY in process.env
  const isKeyInEnv = () => {
    const key = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
    return !!key && key !== 'undefined' && key !== 'null' && key.length > 5;
  };

  useEffect(() => {
    const checkKey = async () => {
      // If key is in environment, we are good to go
      if (isKeyInEnv()) {
        setHasKey(true);
        return;
      }

      // Otherwise, check for AI Studio bridge
      try {
        if ((window as any).aistudio?.hasSelectedApiKey) {
          const isSelected = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(isSelected);
        }
      } catch (e) {
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('chromabeat_v5_state', JSON.stringify({
      isPro: state.isPro,
      videosProduced: state.videosProduced
    }));
  }, [state.isPro, state.videosProduced]);

  const handleOpenKeySelector = async () => {
    if (isKeyInEnv()) {
      setHasKey(true);
      return true;
    }

    try {
      if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true);
        setError(null);
        return true;
      } else {
        setError("API Key Required: Please ensure your 'API_KEY' environment variable is set in your project settings.");
        return false;
      }
    } catch (e) {
      setError("Failed to initialize AI connection. Please refresh and try again.");
      return false;
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)) {
      setError('Unsupported format. Please upload an audio file (MP3, WAV, FLAC).');
      return;
    }

    if (!hasKey && !isKeyInEnv()) {
      const success = await handleOpenKeySelector();
      if (!success) return;
    }

    setState(prev => ({ ...prev, processing: true, audioFile: file }));
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("File reading failed."));
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
      let msg = err.message || 'Processing failed.';
      if (msg.includes("403") || msg.toLowerCase().includes("key")) {
        msg = "AI Authentication Failed. Please check if your API Key is valid and has billing enabled for Veo/Pro models.";
        setHasKey(false);
      }
      setError(msg);
      setState(prev => ({ ...prev, processing: false }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
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
    <div className="min-h-screen bg-[#050505] flex flex-col items-center p-6 selection:bg-cyan-500 selection:text-black">
      <header className="w-full max-w-7xl flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-black font-heading tracking-tighter uppercase">ChromaBeat</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleOpenKeySelector} className={`glass px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${!hasKey ? 'text-white/40 hover:text-white' : 'text-cyan-400'}`}>
             <Key className="w-3.5 h-3.5" />
             {hasKey ? 'AI Connection Active' : 'Setup AI Engine'}
           </button>
           {!state.isPro && (
             <button onClick={() => setShowSubModal(true)} className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition shadow-lg">Go Pro</button>
           )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-7xl md:text-9xl font-black font-heading tracking-tighter leading-[0.8] text-white">
            Audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">Cinematic</span>
          </h1>
          <p className="text-lg text-white/40 max-w-xl mx-auto font-medium">
            Transform any track into a professional AI-generated visualizer with synced lyrics.
          </p>
        </div>

        <div className="w-full max-w-2xl relative animate-in fade-in zoom-in duration-1000 delay-200">
          {state.processing ? (
            <div className="glass rounded-[4rem] p-24 flex flex-col items-center gap-8 border-cyan-500/20 shadow-2xl">
              <div className="relative">
                 <Loader2 className="w-20 h-20 text-cyan-500 animate-spin" />
                 <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-black font-heading uppercase tracking-tight text-white">Generating Experience...</p>
                <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">AI is analyzing your frequency</p>
              </div>
            </div>
          ) : (
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer block group transition-all duration-300 ${isDragging ? 'scale-105' : 'scale-100'}`}
            >
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              <div className={`glass rounded-[4rem] p-28 border-2 border-dashed transition-all duration-500 flex flex-col items-center gap-10 shadow-2xl relative overflow-hidden ${isDragging ? 'border-cyan-400 bg-cyan-500/5' : 'border-white/5 group-hover:border-cyan-500/40'}`}>
                <div className={`w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center transition-all ${isDragging ? 'bg-cyan-500/20 scale-110 shadow-2xl shadow-cyan-500/20' : 'group-hover:scale-110'}`}>
                  <Upload className={`w-10 h-10 transition-colors ${isDragging ? 'text-cyan-400' : 'text-white/20 group-hover:text-cyan-400'}`} />
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-black font-heading tracking-tight">Select Audio</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-black">Drag & Drop track here</p>
                </div>
              </div>
            </label>
          )}

          {error && (
            <div className="mt-8 glass px-8 py-6 rounded-[2rem] border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 text-center"><AlertCircle className="w-5 h-5 shrink-0" /> {error}</div>
              {(error.toLowerCase().includes("key") || !hasKey) && (
                <button onClick={handleOpenKeySelector} className="bg-red-500/20 px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition shadow-lg">Refresh AI Link</button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="w-full max-w-7xl flex justify-between items-center py-12 opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
        <div className="flex items-center gap-8"><span>Privacy</span><span>Terms</span><span>Legal</span></div>
        <div className="flex items-center gap-3 font-heading"><Youtube className="w-4 h-4" /><span>ChromaBeat Studio v4.5</span></div>
      </footer>

      <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} onSuccess={() => setState(prev => ({ ...prev, isPro: true }))} />
    </div>
  );
};

export default App;
