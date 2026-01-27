
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, Download, ChevronLeft, Sparkles, Video, Camera, Type as TypeIcon, Loader2, Maximize, Smartphone, Youtube, Brush, Music
} from 'lucide-react';
import { AppState, VisualizerSettings, VisualStyle } from '../types.ts';
import { VISUALIZER_MODES, FONTS } from '../constants.tsx';
import VisualizerCanvas from './VisualizerCanvas.tsx';
import { gemini } from '../services/geminiService.ts';

interface EditorProps {
  appState: AppState;
  onBack: () => void;
  onExported: () => void;
  onUpdateBackground: (url: string, isVideo?: boolean) => void;
  onRequestUpgrade: () => void;
}

const VISUAL_STYLES: { id: VisualStyle; name: string }[] = [
  { id: 'photorealistic', name: 'Cinematic 8K' },
  { id: 'anime', name: 'Studio Ghibli' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'oil-painting', name: 'Oil Painting' },
  { id: '3d-render', name: 'Unreal 5' },
  { id: 'minimalist', name: 'Minimalist' },
];

const Editor: React.FC<EditorProps> = ({ appState, onBack, onExported, onUpdateBackground, onRequestUpgrade }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [veoProgress, setVeoProgress] = useState("");
  
  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'bars', color: '#06b6d4', colorSecondary: '#8b5cf6', gradientEnabled: true,
    sensitivity: 50, intensity: 100, placementX: 50, placementY: 50, barWidth: 1, filter: '',
    showLyrics: true, lyricsColor: '#ffffff', lyricsFont: FONTS[1].value, lyricsSize: 52, blur: 0,
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
    setIsGeneratingVideo(true);
    try {
      const url = await gemini.generateBackgroundVideo(
        `${appState.metadata?.imagePrompt || "Cinematic"}`, 
        setVeoProgress
      );
      onUpdateBackground(url, true);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleAIVisualGen = async () => {
    setIsGeneratingImage(true);
    try {
      const url = await gemini.generateBackgroundImage(
        `${appState.metadata?.imagePrompt || "stunning visual"}`
      );
      onUpdateBackground(url, false);
    } catch (err: any) {
      console.error(err);
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
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ChromaBeat_Export.webm`;
        a.click();
        setIsExporting(false);
        onExported();
      };
      recorder.start();
      setTimeout(() => recorder.stop(), (audioRef.current.duration * 1000) + 500);
    } catch (err) {
      setIsExporting(false);
    }
  };

  const currentLyrics = useMemo(() => {
    const segment = appState.metadata?.transcription.find(s => currentTime >= s.start && currentTime <= s.end);
    return segment ? segment.text : '';
  }, [currentTime, appState.metadata]);

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-white font-sans">
      <aside className="w-80 glass border-r border-white/10 overflow-y-auto p-6 space-y-8 z-20">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition group mb-2 font-black uppercase tracking-widest text-[10px]">
          <ChevronLeft className="w-4 h-4" /> 
          ChromaBeat Studio
        </button>
        
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Maximize className="w-3 h-3 text-cyan-400" /> Export Format</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSettings({...settings, aspectRatio: '16:9'})} className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition ${settings.aspectRatio === '16:9' ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
              <Youtube className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Wide</span>
            </button>
            <button onClick={() => setSettings({...settings, aspectRatio: '9:16'})} className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition ${settings.aspectRatio === '9:16' ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
              <Smartphone className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Mobile</span>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Sparkles className="w-3 h-3 text-cyan-400" /> AI Creative</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleVeoGen} disabled={isGeneratingVideo} className="bg-cyan-600/20 border border-cyan-500/30 p-3 rounded-2xl flex flex-col items-center gap-2">
              {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4 text-cyan-400" />}
              <span className="text-[9px] font-black uppercase">Veo Gen</span>
            </button>
            <button onClick={handleAIVisualGen} disabled={isGeneratingImage} className="bg-green-600/20 border border-green-500/30 p-3 rounded-2xl flex flex-col items-center gap-2">
              {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-green-400" />}
              <span className="text-[9px] font-black uppercase">Gen Art</span>
            </button>
          </div>
        </section>

        <section className="pt-4 border-t border-white/5">
          <button onClick={startExport} disabled={isExporting} className="w-full bg-white text-black font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition shadow-2xl">
            {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
            {isExporting ? 'MASTERING...' : 'PRODUCE VIDEO'}
          </button>
        </section>
      </aside>

      <main className="flex-1 relative bg-black flex flex-col">
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-12" ref={canvasContainerRef}>
          <div className={`relative shadow-2xl rounded-[3rem] overflow-hidden border border-white/5 bg-[#080808] transition-all duration-700 ${settings.aspectRatio === '9:16' ? 'h-full aspect-[9/16]' : 'w-full aspect-video'}`}>
            <VisualizerCanvas analyser={analyserRef.current} settings={settings} backgroundImage={appState.backgroundImage} backgroundVideoUrl={appState.backgroundVideoUrl} />
            {settings.showLyrics && currentLyrics && (
              <div className="absolute bottom-24 left-0 right-0 text-center px-16 pointer-events-none drop-shadow-2xl">
                 <p style={{ fontFamily: settings.lyricsFont, fontSize: `${settings.lyricsSize}px`, color: settings.lyricsColor }} className="font-black animate-in fade-in slide-in-from-bottom-4">{currentLyrics}</p>
              </div>
            )}
            <div className="absolute top-12 left-12 glass px-6 py-4 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center"><Music className="w-6 h-6 text-cyan-400" /></div>
              <div><p className="text-xl font-black leading-tight">{appState.metadata?.title}</p><p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{appState.metadata?.artist}</p></div>
            </div>
          </div>
        </div>

        <div className="h-32 glass border-t border-white/10 flex items-center px-16 gap-12">
          <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition">{isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}</button>
          <div className="flex-1">
             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4">
               <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(currentTime/duration)*100}%` }} />
             </div>
             <div className="flex justify-between text-[10px] font-black text-white/30 tracking-widest uppercase">
               <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
               <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /> CHROMABEAT SYNC</div>
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
