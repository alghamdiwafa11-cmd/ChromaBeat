
import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types.ts";

export class GeminiService {
  private getAI() {
    // Standardized access for the injected API_KEY
    const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("API_KEY_NOT_FOUND: Please ensure your Gemini API key is configured correctly.");
    }
    return new GoogleGenAI({ apiKey });
  }

  private async callModel(params: any) {
    try {
      const ai = this.getAI();
      const result = await ai.models.generateContent({
        model: params.model || "gemini-3-pro-preview",
        contents: params.contents,
        config: params.config
      });
      return result;
    } catch (error: any) {
      console.error("Gemini SDK Error:", error);
      if (error.message?.includes("403") || error.message?.toLowerCase().includes("key")) {
        throw new Error("Authentication Failed: The provided API key is invalid or lacks necessary permissions.");
      }
      throw error;
    }
  }

  async processAudio(audioBase64: string, mimeType: string): Promise<AudioMetadata> {
    const response = await this.callModel({
      contents: [
        {
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType } },
            { text: `Extract song title, artist, mood, and lyrics with decimal timestamps. Also provide a visual prompt for a 4K background image. Return JSON.` }
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
          }
        }
      }
    });
    
    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Failed to synthesize audio metadata.");
    }
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Waking up Veo Engine...");
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic high-detail motion: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("AI is weaving pixels into motion...");
        await new Promise(r => setTimeout(r, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
      const res = await fetch(`${link}&key=${apiKey}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e: any) {
      throw new Error(`Veo Generation Error: ${e.message}`);
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const response = await this.callModel({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Exquisite digital art, masterpiece, high fidelity: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate cinematic background.");
  }
}

export const gemini = new GeminiService();
