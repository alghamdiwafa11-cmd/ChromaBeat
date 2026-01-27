
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings, Play, Pause, Download, Volume2, 
  Type as FontIcon, Image as ImageIcon, Sparkles, 
  Sliders, ChevronLeft, Activity, Music, Video,
  Youtube, Share2, Palette, Edit3, Lock, Zap,
  Loader2, AlignLeft, RefreshCw, Wand2, Languages, Upload, Eye, EyeOff,
  Move, Maximize, FileText, Type as TypeIcon, Copy, Check as CheckIcon,
  AlertTriangle, ExternalLink, Key, Info, HelpCircle, Smartphone, Monitor, Instagram, Facebook,
  Camera
} from 'lucide-react';
import { AppState, VisualizerSettings, VisualizerMode, TranscriptionSegment, ExportQuality, AspectRatio } from '../types';
import { VISUALIZER_MODES, COLOR_PALETTES, FILTERS, FONTS, EXPORT_QUALITIES } from '../constants';
import VisualizerCanvas from './VisualizerCanvas';
import { gemini } from '../services/geminiService';

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
  const [genError, setGenError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'bars', color: '#3b82f6', colorSecondary: '#ec4899', gradientEnabled: false,
    sensitivity: 50, intensity: 100, placementX: 50, placementY: 50, barWidth: 1, filter: '',
    showLyrics: true, lyricsColor: '#ffffff', lyricsFont: FONTS[1].value, lyricsSize: 52, blur: 0,
    aspectRatio: '16:9'
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
    setGenError(null);
    setIsGeneratingVideo(true);
    try {
      const url = await gemini.generateBackgroundVideo(
        `${appState.metadata?.imagePrompt || "Cinematic atmosphere"} - optimized for ${settings.aspectRatio} format`, 
        setVeoProgress
      );
      onUpdateBackground(url, true);
    } catch (err: any) {
      setGenError(err.message || "Video generation failed.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleNatureGen = async () => {
    setGenError(null);
    setIsGeneratingImage(true);
    try {
      const url = await gemini.generateBackgroundImage(
        `Ultra-realistic 8K cinematic nature landscape, ethereal lighting: ${appState.metadata?.imagePrompt || "stunning wilderness"}`
      );
      onUpdateBackground(url, false);
    } catch (err: any) {
      setGenError(err.message || "Image generation failed.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const startExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas || !audioRef.current) {
      setIsExporting(false);
      return;
    }

    try {
      const stream = canvas.captureStream(30);
      const audioStream = (audioRef.current as any).captureStream ? (audioRef.current as any).captureStream() : (audioRef.current as any).mozCaptureStream ? (audioRef.current as any).mozCaptureStream() : null;
      
      if (audioStream) {
        audioStream.getAudioTracks().forEach((track: any) => stream.addTrack(track));
      }

      const recorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 15000000 // Professional bitrate
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Studio_Master_${appState.metadata?.title || 'Video'}.webm`;
        a.click();
        setIsExporting(false);
        onExported();
      };

      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      recorder.start();

      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
          audioRef.current?.pause();
          setIsPlaying(false);
        }
      }, (audioRef.current.duration * 1000) + 1000);

    } catch (err) {
      console.error("Export Error:", err);
      setIsExporting(false);
    }
  };

  const currentLyrics = useMemo(() => {
    const segment = appState.metadata?.transcription.find(s => currentTime >= s.start && currentTime <= s.end);
    return segment ? segment.text : '';
  }, [currentTime, appState.metadata]);

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-white font-sans">
      <aside className="w-80 glass border-r border-white/10 overflow-y-auto p-6 space-y-8 z-20 shadow-2xl">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition group mb-2">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition" /> 
          Back to Import
        </button>
        
        {/* Format Selection */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Maximize className="w-3 h-3 text-blue-400" /> Export Format
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setSettings({...settings, aspectRatio: '16:9'})}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition ${settings.aspectRatio === '16:9' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
              <Youtube className="w-4 h-4" />
              <span className="text-[9px] font-black tracking-tighter">YOUTUBE</span>
            </button>
            <button 
              onClick={() => setSettings({...settings, aspectRatio: '9:16'})}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition ${settings.aspectRatio === '9:16' ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[9px] font-black tracking-tighter">TIKTOK</span>
            </button>
          </div>
        </section>

        {/* Cinematic Engine */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Video className="w-3 h-3 text-blue-400" /> AI Creative Engine
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleVeoGen} disabled={isGeneratingVideo} className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-600/30 transition group relative overflow-hidden">
              {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />}
              <span className="text-[9px] font-black tracking-tighter">VEO MOTION</span>
              {isGeneratingVideo && <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500 animate-progress w-full" />}
            </button>
            <button onClick={handleNatureGen} disabled={isGeneratingImage} className="bg-green-600/20 border border-green-500/30 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-green-600/30 transition group">
              {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-green-400 group-hover:scale-110 transition" />}
              <span className="text-[9px] font-black tracking-tighter">NATURE 8K</span>
            </button>
          </div>

          {(isGeneratingVideo || isGeneratingImage) && (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 animate-pulse">
              <p className="text-[9px] text-blue-400 font-mono text-center uppercase tracking-tighter leading-tight">
                {isGeneratingVideo ? veoProgress : "Synthesizing Ethereal Landscapes..."}
              </p>
            </div>
          )}

          {genError && (
            <div className="bg-red-500/10 p-5 rounded-[1.5rem] border border-red-500/20 space-y-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-white/60 leading-tight">Project lacks permission for Veo. Ensure billing is enabled.</p>
              </div>
              <button onClick={() => (window as any).aistudio?.openSelectKey()} className="w-full bg-red-500/20 hover:bg-red-500/30 p-3 rounded-xl text-[9px] font-black tracking-widest transition">REFRESH API KEY</button>
            </div>
          )}
        </section>

        {/* Script Styling */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <TypeIcon className="w-3 h-3 text-blue-400" /> Script Styling
          </h3>
          <div className="space-y-5">
             <div className="space-y-2">
               <div className="flex justify-between items-center px-1">
                 <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Font Size</span>
                 <span className="text-[11px] font-mono text-blue-400 font-bold">{settings.lyricsSize}px</span>
               </div>
               <input 
                 type="range" min="16" max="140" value={settings.lyricsSize} 
                 onChange={(e) => setSettings({...settings, lyricsSize: parseInt(e.target.value)})} 
                 className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" 
               />
             </div>

             <div className="grid grid-cols-2 gap-2">
               {FONTS.map(f => (
                 <button 
                   key={f.value} 
                   onClick={() => setSettings({...settings, lyricsFont: f.value})}
                   className={`p-3 rounded-xl text-[10px] border transition truncate ${settings.lyricsFont === f.value ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                   style={{ fontFamily: f.value }}
                 >
                   {f.name}
                 </button>
               ))}
             </div>
          </div>
        </section>

        {/* Visualizer Modes */}
        <section className="space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
             <Activity className="w-3 h-3 text-blue-400" /> Beat Reactivity
           </h3>
           <div className="grid grid-cols-2 gap-2">
             {VISUALIZER_MODES.map(m => (
               <button key={m.id} onClick={() => setSettings({...settings, mode: m.id as any})} className={`p-3 rounded-2xl border transition flex flex-col items-center gap-2 ${settings.mode === m.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                 {m.icon} <span className="text-[10px] font-black tracking-tighter">{m.name.toUpperCase()}</span>
               </button>
             ))}
           </div>
        </section>

        {/* Social Sharing */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Share2 className="w-3 h-3 text-blue-400" /> Cloud Sync
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-pink-600/10 border border-pink-500/20 p-3 rounded-2xl flex flex-col items-center gap-2 opacity-40 hover:opacity-60 transition group cursor-not-allowed">
              <Instagram className="w-4 h-4 text-pink-500" />
              <span className="text-[9px] font-black">TIKTOK SYNC</span>
            </button>
            <button className="bg-red-600/10 border border-red-500/20 p-3 rounded-2xl flex flex-col items-center gap-2 opacity-40 hover:opacity-60 transition group cursor-not-allowed">
              <Youtube className="w-4 h-4 text-red-500" />
              <span className="text-[9px] font-black">YT SHORTS</span>
            </button>
          </div>
        </section>

        <section className="pt-4 border-t border-white/5">
          <button onClick={startExport} disabled={isExporting} className="w-full bg-white text-black font-black py-4 rounded-3xl flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition">
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'MASTERING MP4...' : 'PRODUCE FINAL VIDEO'}
          </button>
        </section>
      </aside>

      <main className="flex-1 relative bg-black flex flex-col">
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 md:p-16" ref={canvasContainerRef}>
          <div 
            className={`relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden border border-white/5 bg-black transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${settings.aspectRatio === '9:16' ? 'h-full aspect-[9/16]' : 'w-full aspect-video'}`}
          >
            <VisualizerCanvas 
              analyser={analyserRef.current} 
              settings={settings} 
              backgroundImage={appState.backgroundImage}
              backgroundVideoUrl={appState.backgroundVideoUrl}
            />

            {settings.showLyrics && currentLyrics && (
              <div className="absolute bottom-24 left-0 right-0 text-center px-12 pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                 <p 
                    style={{ 
                        fontFamily: settings.lyricsFont, 
                        fontSize: `${settings.aspectRatio === '9:16' ? settings.lyricsSize * 0.8 : settings.lyricsSize}px`, 
                        color: settings.lyricsColor 
                    }} 
                    className="font-black leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700"
                 >
                   {currentLyrics}
                 </p>
              </div>
            )}

            <div className="absolute top-10 left-10 glass px-6 py-5 rounded-[2.5rem] border-white/10 flex items-center gap-5 animate-in fade-in slide-in-from-left-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/10"><Music className="w-7 h-7 text-blue-400" /></div>
              <div>
                <p className="text-xl font-black tracking-tight leading-none mb-1.5">{appState.metadata?.title}</p>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{appState.metadata?.artist}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-32 glass border-t border-white/10 flex items-center px-16 gap-12">
          <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition active:scale-95 shadow-xl shrink-0">
            {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}
          </button>
          <div className="flex-1">
             <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden group mb-4">
               <div className="absolute inset-y-0 left-0 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all duration-300" style={{ width: `${(currentTime/duration)*100}%` }} />
             </div>
             <div className="flex justify-between text-[11px] font-mono text-white/20 tracking-widest uppercase font-black">
               <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
               <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
             </div>
          </div>
        </div>
      </main>

      <audio ref={audioRef} src={appState.audioUrl || ""} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} />
    </div>
  );
};

export default Editor;
