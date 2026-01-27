import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types.ts";

export class GeminiService {
  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return new GoogleGenAI({ apiKey });
  }

  async processAudio(audioBase64: string, mimeType: string): Promise<AudioMetadata> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType } },
            { text: `Analyze this audio. Return JSON with 'title', 'artist', 'mood', 'imagePrompt' (cinematic description for video generation), and 'transcription' (array of {text, start, end} segments).` }
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
      return JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Failed to interpret AI response data.");
    }
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Contacting Render Farm...");
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic visualization: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("Rendering frames...");
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!link) throw new Error("Video link not found.");
      
      const res = await fetch(`${link}&key=${process.env.API_KEY}`);
      if (!res.ok) throw new Error("Video download failed.");
      
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e: any) {
      if (e.message?.includes("not found")) {
        throw new Error("RE_SELECT_KEY");
      }
      throw new Error(`Veo Error: ${e.message}`);
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Cinematic high-detail masterpiece: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate background image.");
  }
}

export const gemini = new GeminiService();