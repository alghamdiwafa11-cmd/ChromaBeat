import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types.ts";

export class GeminiService {
  private getApiKey(): string {
    const key = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
    if (!key || key === 'undefined' || key === 'null') {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return key;
  }

  private getAI() {
    return new GoogleGenAI({ apiKey: this.getApiKey() });
  }

  private cleanJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : text.trim();
  }

  // Robust retry mechanism for 503 and 429 errors
  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = error.message?.includes("503") || error.message?.includes("overloaded") || error.message?.includes("429");
      if (isRetryable && retries > 0) {
        console.warn(`Model busy, retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(r => setTimeout(r, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async processAudio(audioBase64: string, mimeType: string): Promise<AudioMetadata> {
    const ai = this.getAI();
    return this.callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: audioBase64, mimeType: mimeType } },
              { text: `Analyze this audio file. Output ONLY a valid JSON object. 
              Schema: { 
                "title": string, 
                "artist": string, 
                "mood": string, 
                "imagePrompt": "vivid cinematic description", 
                "transcription": [{"text": string, "start": number, "end": number}] 
              }. Ensure timestamps are precise.` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              mood: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              transcription: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER }
                  }
                }
              }
            },
            required: ["title", "artist", "transcription", "imagePrompt"]
          }
        }
      });
      
      const rawText = response.text;
      if (!rawText) throw new Error("Empty response");
      const cleaned = this.cleanJson(rawText);
      return JSON.parse(cleaned);
    });
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Waking up Render Engine...");
    const ai = this.getAI();
    
    return this.callWithRetry(async () => {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Masterpiece cinematic visualization, ultra high detail: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("Synthesizing cinematic pixels...");
        await new Promise(r => setTimeout(r, 6000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!link) throw new Error("Video link generation failed.");
      
      const res = await fetch(`${link}&key=${this.getApiKey()}`);
      if (!res.ok) throw new Error("Download server unreachable.");
      
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    });
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    return this.callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: `Stunning cinematic 8K wide-angle concept art: ${prompt}` }] },
        config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      throw new Error("Image generation failed.");
    });
  }
}

export const gemini = new GeminiService();