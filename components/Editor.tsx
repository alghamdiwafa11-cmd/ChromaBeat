import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, Download, ChevronLeft, Sparkles, Video, Camera, Type as TypeIcon, Loader2, Maximize, Smartphone, Youtube, Brush, Music, Share2, Instagram, Facebook, Palette, Sliders, Edit3, Image as ImageIcon
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
}

const Editor: React.FC<EditorProps> = ({ appState, onBack, onExported, onUpdateBackground, onRequestUpgrade }) => {
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
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', bitsPerSecond: 15000000 });
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
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition group mb-2 font-black uppercase tracking-widest text-[10px]">
          <ChevronLeft className="w-4 h-4" /> Back to Studio
        </button>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Edit3 className="w-3 h-3 text-cyan-400" /> Track Details</h3>
          <div className="space-y-3">
            <input 
              type="text" 
              value={customMetadata.title} 
              onChange={(e) => setCustomMetadata({...customMetadata, title: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500 placeholder:text-white/20"
              placeholder="Track Title"
            />
            <input 
              type="text" 
              value={customMetadata.artist} 
              onChange={(e) => setCustomMetadata({...customMetadata, artist: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500 placeholder:text-white/20"
              placeholder="Artist / Speaker"
            />
          </div>
        </section>
        
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Palette className="w-3 h-3 text-cyan-400" /> Color Engine</h3>
          <div className="grid grid-cols-6 gap-2 mb-3">
            {COLOR_PALETTES.map(p => (
              <button key={p.name} onClick={() => setSettings({...settings, color: p.primary, colorSecondary: p.secondary})} className="h-6 rounded-md transition hover:scale-110" style={{ background: `linear-gradient(45deg, ${p.primary}, ${p.secondary})` }} />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black uppercase text-white/20">Primary</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
                <input type="color" value={settings.color} onChange={(e) => setSettings({...settings, color: e.target.value})} className="w-6 h-6 bg-transparent border-none rounded-full cursor-pointer" />
                <span className="text-[10px] font-mono uppercase">{settings.color}</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black uppercase text-white/20">Secondary</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
                <input type="color" value={settings.colorSecondary} onChange={(e) => setSettings({...settings, colorSecondary: e.target.value})} className="w-6 h-6 bg-transparent border-none rounded-full cursor-pointer" />
                <span className="text-[10px] font-mono uppercase">{settings.colorSecondary}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><ImageIcon className="w-3 h-3 text-cyan-400" /> Visual Processing</h3>
          <select 
            value={settings.filter} 
            onChange={(e) => setSettings({...settings, filter: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500"
          >
            {FILTERS.map(f => <option key={f.name} value={f.class} className="bg-black text-white">{f.name}</option>)}
          </select>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><TypeIcon className="w-3 h-3 text-cyan-400" /> Typography</h3>
          <select 
            value={settings.lyricsFont} 
            onChange={(e) => setSettings({...settings, lyricsFont: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500"
          >
            {FONTS.map(f => <option key={f.value} value={f.value} className="bg-black text-white">{f.name}</option>)}
          </select>
          <div className="space-y-2">
            <div className="flex justify-between items-center"><span className="text-[9px] font-black text-white/20 uppercase">Font Size</span><span className="text-[9px] font-black">{settings.lyricsSize}px</span></div>
            <input type="range" min="24" max="100" value={settings.lyricsSize} onChange={(e) => setSettings({...settings, lyricsSize: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Sliders className="w-3 h-3 text-cyan-400" /> Dynamics</h3>
          <div className="space-y-4">
             <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase text-white/20"><span>Sensitivity</span><span>{settings.sensitivity}%</span></div>
                <input type="range" min="10" max="150" value={settings.sensitivity} onChange={(e) => setSettings({...settings, sensitivity: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase text-white/20"><span>Bar Width</span><span>{settings.barWidth}x</span></div>
                <input type="range" min="0.5" max="5.0" step="0.1" value={settings.barWidth} onChange={(e) => setSettings({...settings, barWidth: parseFloat(e.target.value)})} className="w-full accent-cyan-500" />
             </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Maximize className="w-3 h-3 text-cyan-400" /> Social & Master</h3>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setSettings({...settings, aspectRatio: '16:9'})} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${settings.aspectRatio === '16:9' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <Youtube className="w-4 h-4" /><span className="text-[8px] font-black uppercase">Wide</span>
            </button>
            <button onClick={() => setSettings({...settings, aspectRatio: '9:16'})} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${settings.aspectRatio === '9:16' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <Smartphone className="w-4 h-4" /><span className="text-[8px] font-black uppercase">Shorts</span>
            </button>
            <button onClick={() => setSettings({...settings, aspectRatio: '1:1'})} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${settings.aspectRatio === '1:1' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <Instagram className="w-4 h-4" /><span className="text-[8px] font-black uppercase">Insta</span>
            </button>
          </div>
          <select 
            value={selectedQuality} 
            onChange={(e) => setSelectedQuality(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-cyan-500"
          >
            {EXPORT_QUALITIES.map(q => <option key={q.id} value={q.id} className="bg-black text-white">{q.label} {!appState.isPro && (q.id === '2K' || q.id === '4K') ? '(PRO)' : ''}</option>)}
          </select>
        </section>

        <section className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex flex-col gap-2">
            <button onClick={handleVeoGen} disabled={isGeneratingVideo} className="bg-cyan-600/20 border border-cyan-500/30 p-4 rounded-2xl flex items-center gap-4 group hover:bg-cyan-600/30 transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">{isGeneratingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5 text-cyan-400" />}</div>
              <div className="text-left"><p className="text-[10px] font-black uppercase tracking-wider">AI Video Engine</p><p className="text-[8px] text-white/30 uppercase">{veoProgress || 'Regenerate Background'}</p></div>
            </button>
          </div>
          <button onClick={startExport} disabled={isExporting} className="w-full bg-cyan-500 text-black font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition shadow-2xl shadow-cyan-500/20">
            {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Share2 className="w-6 h-6" />}
            {isExporting ? 'MASTERING...' : 'EXPORT STUDIO'}
          </button>
        </section>
      </aside>

      <main className="flex-1 relative bg-black flex flex-col">
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-12" ref={canvasContainerRef}>
          <div className={`relative shadow-[0_0_150px_rgba(0,0,0,0.9)] rounded-[3rem] overflow-hidden border border-white/5 bg-[#080808] transition-all duration-700 ${settings.aspectRatio === '9:16' ? 'h-full aspect-[9/16]' : settings.aspectRatio === '1:1' ? 'h-full aspect-square' : 'w-full aspect-video'}`}>
            <VisualizerCanvas analyser={analyserRef.current} settings={settings} backgroundImage={appState.backgroundImage} backgroundVideoUrl={appState.backgroundVideoUrl} />
            {settings.showLyrics && currentLyrics && (
              <div className="absolute bottom-24 left-0 right-0 text-center px-16 pointer-events-none z-10">
                 <p style={{ fontFamily: settings.lyricsFont, fontSize: `${settings.lyricsSize}px`, color: settings.lyricsColor }} className="font-black animate-in fade-in slide-in-from-bottom-4 drop-shadow-[0_4px_16px_rgba(0,0,0,1)] leading-tight">{currentLyrics}</p>
              </div>
            )}
            <div className="absolute top-12 left-12 glass px-6 py-4 rounded-[2rem] flex items-center gap-4 z-10">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/10"><Music className="w-6 h-6 text-cyan-400" /></div>
              <div><p className="text-xl font-black leading-tight tracking-tighter">{customMetadata.title}</p><p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{customMetadata.artist}</p></div>
            </div>
          </div>
        </div>

        <div className="h-32 glass border-t border-white/10 flex items-center px-16 gap-12 z-20">
          <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition shadow-xl">{isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}</button>
          <div className="flex-1">
             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4 relative">
               <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300" style={{ width: `${(currentTime/duration)*100}%` }} />
             </div>
             <div className="flex justify-between text-[10px] font-black text-white/30 tracking-widest uppercase">
               <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
               <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /> AI ENGINE STABLE</div>
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