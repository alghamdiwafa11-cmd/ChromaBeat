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
    // Remove markdown code blocks if present
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
  }

  async processAudio(audioBase64: string, mimeType: string): Promise<AudioMetadata> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType } },
            { text: `Analyze this audio file carefully. Output a raw JSON object only. Structure: { "title": string, "artist": string, "mood": string, "imagePrompt": "vivid cinematic description", "transcription": [{"text": string, "start": number, "end": number}] }. Ensure transcription timestamps are accurate based on the audio content.` }
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
      const rawText = response.text;
      if (!rawText) throw new Error("Empty response");
      const cleaned = this.cleanJson(rawText);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("AI Response Parse Error:", response.text);
      throw new Error("AI data synthesis failed. The model returned an invalid format. Please try another track.");
    }
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Contacting Render Farm...");
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Dynamic cinematic visualization: ${prompt}`,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });

      while (!operation.done) {
        onProgress?.("Rendering cinematic sequence...");
        await new Promise(r => setTimeout(r, 10000));
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
      throw new Error(`Visual Render Failed: ${e.message}`);
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Masterpiece cinematic 8K digital art: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Static visual generation failed.");
  }
}

export const gemini = new GeminiService();