
import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types.ts";

export class GeminiService {
  private getAI() {
    // Robust check for the API_KEY
    const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("API_KEY_NOT_FOUND: Please check your environment variables or Link your account.");
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
      console.error("Gemini API Error Context:", {
        model: params.model,
        error: error.message,
        stack: error.stack
      });
      
      if (error.message?.includes("403") || error.message?.toLowerCase().includes("key")) {
        throw new Error("Authentication Failed: Your API key is invalid or lacks access to the Generative Language API.");
      }
      if (error.message?.includes("500")) {
        throw new Error("AI Server Error: The model is currently overloaded. Please try again in a few seconds.");
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
            { text: `Analyze this audio. Return JSON with 'title', 'artist', 'mood', 'imagePrompt' (for background generation), and 'transcription' (array of {text, start, end} segments).` }
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
      console.error("Parse Error:", response.text);
      throw new Error("Failed to interpret AI response data.");
    }
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Contacting Veo Render Farm...");
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Hyper-realistic cinematic slow motion: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("Veo is painting frames with light...");
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : null);
      
      const res = await fetch(`${link}&key=${apiKey}`);
      if (!res.ok) throw new Error("Video download failed.");
      
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e: any) {
      throw new Error(`Veo Engine: ${e.message}`);
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const response = await this.callModel({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Masterpiece digital illustration, 8K, cinematic: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Visual synthesizer failed to generate background.");
  }
}

export const gemini = new GeminiService();
