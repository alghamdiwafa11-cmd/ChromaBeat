
import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata } from "../types";

export class GeminiService {
  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("MISSING_API_KEY: Please connect your Google Gemini API key via the settings icon.");
    }
    // Create fresh instance as per guidelines for Veo/Pro models
    return new GoogleGenAI({ apiKey });
  }

  private async handleApiError(error: any) {
    console.error("Gemini API Error Detail:", error);
    const message = error.message || "";
    
    // Check for specific error patterns as per guidelines
    if (message.includes("Requested entity was not found") || message.includes("404") || message.includes("permission")) {
      // These usually indicate key/project selection issues
      throw new Error("API_SELECTION_REQUIRED: Please select a valid, billing-enabled API key from Google AI Studio.");
    }
    throw error;
  }

  private async callModel(params: any) {
    try {
      const ai = this.getAI();
      const modelName = params.model || "gemini-3-pro-preview";
      const result = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config
      });
      return result;
    } catch (error: any) {
      await this.handleApiError(error);
      throw error;
    }
  }

  async processAudio(audioBase64: string, mimeType: string): Promise<AudioMetadata> {
    const response = await this.callModel({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType } },
            { text: `Analyze this audio for video production. Provide: 1. Accurate lyrics with decimal timestamps. 2. Emotional mood. 3. Title/Artist. 4. A 4K cinematic visual prompt. Return JSON.` }
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
                },
                required: ["text", "start", "end"]
              }
            }
          },
          required: ["title", "artist", "mood", "imagePrompt", "transcription"]
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateBackgroundVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.("Initializing AI Engine...");
    
    try {
      const ai = this.getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic loop: ${prompt}`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      const phases = ["Analyzing...", "Rendering...", "Lighting...", "Finalizing..."];
      let i = 0;

      while (!operation.done) {
        onProgress?.(phases[i % phases.length]);
        i++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed: No URL returned.");
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      await this.handleApiError(error);
      throw error;
    }
  }

  async generateBackgroundImage(prompt: string): Promise<string> {
    const response = await this.callModel({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Cinematic 8k: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate art.");
  }
}

export const gemini = new GeminiService();
