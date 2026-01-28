import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types.ts";

export class GeminiService {
  private getApiKey(): string {
    // Check all possible locations for the injected API_KEY
    const key = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
    
    if (!key || key === 'undefined' || key === 'null') {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return key;
  }

  private getAI() {
    return new GoogleGenAI({ apiKey: this.getApiKey() });
  }

  async processAudio(audioBase64: string, mimeType: string): Promise<AudioMetadata> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType } },
            { text: `Analyze this audio track. Return a JSON object with: 'title', 'artist', 'mood', 'imagePrompt' (a cinematic visual description for background generation), and 'transcription' (array of segments with 'text', 'start', and 'end' in seconds).` }
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
    
    try {
      const text = response.text;
      if (!text) throw new Error("Empty response from AI engine.");
      return JSON.parse(text);
    } catch (e) {
      console.error("Parse Error:", response.text);
      throw new Error("Failed to interpret AI response. Please try again.");
    }
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Contacting Render Farm...");
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic high-detail motion visualization: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("Rendering cinematic frames...");
        await new Promise(r => setTimeout(r, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!link) throw new Error("Video link not generated.");
      
      const res = await fetch(`${link}&key=${this.getApiKey()}`);
      if (!res.ok) throw new Error("Video download failed.");
      
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e: any) {
      if (e.message?.includes("not found")) {
        throw new Error("RE_SELECT_KEY");
      }
      throw new Error(`Veo Generation Failed: ${e.message}`);
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Masterpiece cinematic digital art, 8K resolution: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Image generation failed.");
  }
}

export const gemini = new GeminiService();