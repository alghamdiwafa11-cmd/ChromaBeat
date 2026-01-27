
export type VisualizerMode = 'bars' | 'waves' | 'circle' | 'particles' | 'symmetry' | 'grid';
export type ExportQuality = '720p' | '1080p' | '2K' | '4K' | '5K';
export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface VisualizerSettings {
  mode: VisualizerMode;
  color: string;
  colorSecondary: string;
  gradientEnabled: boolean;
  sensitivity: number;
  intensity: number;
  placementX: number;
  placementY: number;
  barWidth: number;
  filter: string;
  showLyrics: boolean;
  lyricsColor: string;
  lyricsFont: string;
  lyricsSize: number;
  blur: number;
  aspectRatio: AspectRatio;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  originalText?: string;
}

export interface AudioMetadata {
  title: string;
  artist: string;
  transcription: TranscriptionSegment[];
  mood: string;
  imagePrompt: string;
}

export interface AppState {
  audioFile: File | null;
  audioUrl: string | null;
  processing: boolean;
  metadata: AudioMetadata | null;
  backgroundImage: string | null;
  backgroundVideoUrl: string | null;
  isPro: boolean;
  videosProduced: number;
}
