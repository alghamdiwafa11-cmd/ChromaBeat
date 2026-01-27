
import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types.ts";

export class GeminiService {
  private getAI() {
    // Try browser-injected process first, then standard environment
    const apiKey = (window as any).process?.env?.API_KEY || process.env?.API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("API_KEY_NOT_FOUND: Please connect your Google AI account via the Link button.");
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
      console.error("Gemini API Error Detail:", error);
      if (error.message?.includes("entity was not found") || error.message?.toLowerCase().includes("key")) {
        throw new Error("The API key provided is invalid or has been disabled. Please check your AI Studio settings.");
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
            { text: `Extract lyrics with decimal timestamps, emotional mood, and title. Suggest a high-quality 4K visual prompt based on the song's context. Return JSON.` }
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
      const parsed = JSON.parse(response.text || "{}");
      return parsed;
    } catch (e) {
      throw new Error("AI Synthesis Error: Could not parse audio structure.");
    }
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Initiating Veo Render Engine...");
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic slow motion visual: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("AI is hallucinating motion pixels...");
        await new Promise(r => setTimeout(r, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      const apiKey = (window as any).process?.env?.API_KEY || process.env?.API_KEY;
      const res = await fetch(`${link}&key=${apiKey}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e: any) {
      throw new Error(`Veo Engine Offline: ${e.message}`);
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const response = await this.callModel({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `High-fidelity digital art, cinematic lighting: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Visual Generator failed to produce frames.");
  }
}

export const gemini = new GeminiService();
