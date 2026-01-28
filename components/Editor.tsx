import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, Download, ChevronLeft, Sparkles, Video, Camera, Type as TypeIcon, Loader2, Maximize, Smartphone, Youtube, Brush, Music, Share2, Instagram, Facebook, Palette, Sliders, Edit3, Image as ImageIcon, Check, Star
} from 'lucide-react';
import { AppState, VisualizerSettings } from '../types.ts';
import { VISUALIZER_MODES, FONTS, COLOR_PALETTES, EXPORT_QUALITIES, FILTERS } from '../constants.tsx';
import VisualizerCanvas from './VisualizerCanvas.tsx';
import { gemini } from '../services/geminiService.ts';

interface EditorProps {
  appState: AppState;
  onBack: () => void;
  onExported: () => void;
  onUpdateBackground: (url: string, isVideo?: boolean) => void;
  onRequestUpgrade: () => void;
  onMetadataUpdate: (title: string, artist: string) => void;
}

const Editor: React.FC<EditorProps> = ({ appState, onBack, onExported, onUpdateBackground, onRequestUpgrade, onMetadataUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [veoProgress, setVeoProgress] = useState("");
  const [selectedQuality, setSelectedQuality] = useState(EXPORT_QUALITIES[1].id);
  
  // Local metadata overrides
  const [customMetadata, setCustomMetadata] = useState({
    title: appState.metadata?.title || "Unknown Track",
    artist: appState.metadata?.artist || "Unknown Artist"
  });

  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'bars', color: COLOR_PALETTES[0].primary, colorSecondary: COLOR_PALETTES[0].secondary, gradientEnabled: true,
    sensitivity: 50, intensity: 100, placementX: 50, placementY: 50, barWidth: 1.2, filter: FILTERS[0].class,
    showLyrics: true, lyricsColor: '#ffffff', lyricsFont: FONTS[0].value, lyricsSize: 52, blur: 0,
    aspectRatio: '16:9',
    visualStyle: 'photorealistic'
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMetadataUpdate(customMetadata.title, customMetadata.artist);
  }, [customMetadata]);

  useEffect(() => {
    if (appState.audioUrl && !audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      if (audioRef.current) {
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    }
  }, [appState.audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else {
        audioContextRef.current?.resume();
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVeoGen = async () => {
    if (!appState.isPro) { onRequestUpgrade(); return; }
    setIsGeneratingVideo(true);
    try {
      const url = await gemini.generateBackgroundVideo(appState.metadata?.imagePrompt || "Cinematic rhythm", setVeoProgress);
      onUpdateBackground(url, true);
    } catch (err) { console.error(err); }
    finally { setIsGeneratingVideo(false); setVeoProgress(""); }
  };

  const handleAIVisualGen = async () => {
    setIsGeneratingImage(true);
    try {
      const url = await gemini.generateBackgroundImage(appState.metadata?.imagePrompt || "Abstract cinematic atmospheric background");
      onUpdateBackground(url, false);
    } catch (err) { console.error(err); }
    finally { setIsGeneratingImage(false); }
  };

  const startExport = async () => {
    if (!appState.isPro && (selectedQuality === '2K' || selectedQuality === '4K')) {
      onRequestUpgrade();
      return;
    }
    setIsExporting(true);
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas || !audioRef.current) { setIsExporting(false); return; }

    try {
      const stream = canvas.captureStream(60); 
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', bitsPerSecond: 18000000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ChromaBeat_${customMetadata.title.replace(/\s+/g, '_')}_${selectedQuality}.webm`;
        a.click();
        setIsExporting(false);
        onExported();
      };
      recorder.start();
      setTimeout(() => recorder.stop(), (audioRef.current.duration * 1000) + 1000);
    } catch (err) { setIsExporting(false); }
  };

  const currentLyrics = useMemo(() => {
    const segment = appState.metadata?.transcription.find(s => currentTime >= s.start && currentTime <= s.end);
    return segment ? segment.text : '';
  }, [currentTime, appState.metadata]);

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-white font-sans selection:bg-cyan-500 selection:text-black">
      <aside className="w-85 glass border-r border-white/10 overflow-y-auto p-6 space-y-8 z-20 custom-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition group font-black uppercase tracking-widest text-[10px]">
            <ChevronLeft className="w-4 h-4" /> Studio
          </button>
          {appState.isPro && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black uppercase text-cyan-400 tracking-widest">
              <Star className="w-2.5 h-2.5 fill-cyan-400" /> Pro
            </div>
          )}
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Edit3 className="w-3 h-3 text-cyan-400" /> Track Metadata</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-white/20 ml-1">Title</label>
              <input 
                type="text" 
                value={customMetadata.title} 
                onChange={(e) => setCustomMetadata({...customMetadata, title: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500 placeholder:text-white/10 transition-colors"
                placeholder="Track Title"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-white/20 ml-1">Artist / Speaker</label>
              <input 
                type="text" 
                value={customMetadata.artist} 
                onChange={(e) => setCustomMetadata({...customMetadata, artist: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500 placeholder:text-white/10 transition-colors"
                placeholder="Speaker Name"
              />
            </div>
          </div>
        </section>
        
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Palette className="w-3 h-3 text-cyan-400" /> Chroma Palette</h3>
          <div className="grid grid-cols-6 gap-2 mb-3">
            {COLOR_PALETTES.map(p => (
              <button key={p.name} onClick={() => setSettings({...settings, color: p.primary, colorSecondary: p.secondary})} className="h-6 rounded-md transition hover:scale-110 active:scale-90" style={{ background: `linear-gradient(45deg, ${p.primary}, ${p.secondary})` }} />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black uppercase text-white/20">Primary</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
                <input type="color" value={settings.color} onChange={(e) => setSettings({...settings, color: e.target.value})} className="w-6 h-6 bg-transparent border-none rounded-full cursor-pointer" />
                <span className="text-[9px] font-mono uppercase text-white/40">{settings.color}</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black uppercase text-white/20">Secondary</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
                <input type="color" value={settings.colorSecondary} onChange={(e) => setSettings({...settings, colorSecondary: e.target.value})} className="w-6 h-6 bg-transparent border-none rounded-full cursor-pointer" />
                <span className="text-[9px] font-mono uppercase text-white/40">{settings.colorSecondary}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><ImageIcon className="w-3 h-3 text-cyan-400" /> Filter Engine</h3>
          <select 
            value={settings.filter} 
            onChange={(e) => setSettings({...settings, filter: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
          >
            {FILTERS.map(f => <option key={f.name} value={f.class} className="bg-[#111] text-white">{f.name}</option>)}
          </select>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><TypeIcon className="w-3 h-3 text-cyan-400" /> Typography</h3>
          <div className="space-y-3">
            <select 
              value={settings.lyricsFont} 
              onChange={(e) => setSettings({...settings, lyricsFont: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              {FONTS.map(f => <option key={f.value} value={f.value} className="bg-[#111] text-white">{f.name}</option>)}
            </select>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1"><span className="text-[8px] font-black text-white/20 uppercase">Size</span><span className="text-[9px] font-black">{settings.lyricsSize}px</span></div>
              <input type="range" min="24" max="110" value={settings.lyricsSize} onChange={(e) => setSettings({...settings, lyricsSize: parseInt(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Sliders className="w-3 h-3 text-cyan-400" /> Visualization</h3>
          <div className="space-y-5">
             <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black uppercase text-white/20 px-1"><span>BPM Sync</span><span>{settings.sensitivity}%</span></div>
                <input type="range" min="10" max="150" value={settings.sensitivity} onChange={(e) => setSettings({...settings, sensitivity: parseInt(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer" />
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black uppercase text-white/20 px-1"><span>Spectrum Width</span><span>{settings.barWidth}x</span></div>
                <input type="range" min="0.5" max="5.0" step="0.1" value={settings.barWidth} onChange={(e) => setSettings({...settings, barWidth: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer" />
             </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Maximize className="w-3 h-3 text-cyan-400" /> Export Quality</h3>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setSettings({...settings, aspectRatio: '16:9'})} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-300 ${settings.aspectRatio === '16:9' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}>
              <Youtube className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-tighter">Youtube</span>
            </button>
            <button onClick={() => setSettings({...settings, aspectRatio: '9:16'})} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-300 ${settings.aspectRatio === '9:16' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}>
              <Smartphone className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-tighter">Shorts</span>
            </button>
            <button onClick={() => setSettings({...settings, aspectRatio: '1:1'})} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-300 ${settings.aspectRatio === '1:1' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}>
              <Instagram className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-tighter">Square</span>
            </button>
          </div>
          <div className="relative">
            <select 
              value={selectedQuality} 
              onChange={(e) => setSelectedQuality(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              {EXPORT_QUALITIES.map(q => {
                const isProQuality = q.id === '2K' || q.id === '4K' || q.id === '5K';
                return (
                  <option key={q.id} value={q.id} className="bg-[#111] text-white">
                    {q.label} {isProQuality && !appState.isPro ? '(PRO)' : ''}
                  </option>
                );
              })}
            </select>
            {!appState.isPro && (selectedQuality === '2K' || selectedQuality === '4K') && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                 <Lock className="w-3 h-3 text-cyan-400" />
              </div>
            )}
          </div>
        </section>

        <section className="pt-6 border-t border-white/5 space-y-4">
          <button onClick={handleVeoGen} disabled={isGeneratingVideo} className={`w-full bg-cyan-600/10 border border-cyan-500/20 p-4 rounded-2xl flex items-center gap-4 group hover:bg-cyan-600/20 transition-all ${!appState.isPro ? 'grayscale opacity-60' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              {isGeneratingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-white">Veo AI Render</p>
              <p className="text-[8px] text-white/40 uppercase tracking-widest">{veoProgress || (appState.isPro ? 'Regenerate Scene' : 'Unlock with Pro')}</p>
            </div>
          </button>
          
          <button onClick={startExport} disabled={isExporting} className="w-full bg-cyan-500 text-black font-black py-5 rounded-[2.25rem] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50">
            {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Share2 className="w-6 h-6" />}
            {isExporting ? 'MASTERING...' : 'MASTER STUDIO'}
          </button>
        </section>
      </aside>

      <main className="flex-1 relative bg-black flex flex-col">
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-12" ref={canvasContainerRef}>
          <div className={`relative shadow-[0_0_180px_rgba(0,0,0,0.95)] rounded-[3.5rem] overflow-hidden border border-white/5 bg-[#080808] transition-all duration-1000 ease-out ${settings.aspectRatio === '9:16' ? 'h-full aspect-[9/16]' : settings.aspectRatio === '1:1' ? 'h-full aspect-square' : 'w-full aspect-video'}`}>
            <VisualizerCanvas analyser={analyserRef.current} settings={settings} backgroundImage={appState.backgroundImage} backgroundVideoUrl={appState.backgroundVideoUrl} />
            {settings.showLyrics && currentLyrics && (
              <div className="absolute bottom-28 left-0 right-0 text-center px-16 pointer-events-none z-10">
                 <p style={{ fontFamily: settings.lyricsFont, fontSize: `${settings.lyricsSize}px`, color: settings.lyricsColor }} className="font-black animate-in fade-in slide-in-from-bottom-8 duration-500 drop-shadow-[0_4px_24px_rgba(0,0,0,1)] leading-tight tracking-tight">{currentLyrics}</p>
              </div>
            )}
            <div className="absolute top-12 left-12 glass px-8 py-5 rounded-[2.5rem] flex items-center gap-5 z-10 border-white/10 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20"><Music className="w-7 h-7 text-black" /></div>
              <div>
                <p className="text-2xl font-black leading-none tracking-tighter text-white mb-1.5">{customMetadata.title}</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">{customMetadata.artist}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-32 glass border-t border-white/10 flex items-center px-20 gap-12 z-20">
          <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">{isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1.5" />}</button>
          <div className="flex-1">
             <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden mb-5 relative border border-white/5">
               <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-300 relative shadow-[0_0_15px_rgba(34,211,238,0.5)]" style={{ width: `${(currentTime/duration)*100}%` }}>
                  <div className="absolute top-0 right-0 w-4 h-full bg-white opacity-30 animate-pulse" />
               </div>
             </div>
             <div className="flex justify-between text-[11px] font-black text-white/20 tracking-[0.3em] uppercase">
               <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
               <div className="flex items-center gap-3">
                 <span className="text-cyan-400/50">Frequency Sync Matrix Active</span>
                 <div className="flex gap-0.5">
                    {[1,2,3,4].map(i => <div key={i} className="w-1 h-3 bg-cyan-400/20 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                 </div>
               </div>
               <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
             </div>
          </div>
        </div>
      </main>
      <audio ref={audioRef} src={appState.audioUrl || ""} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />
    </div>
  );
};

export default Editor;