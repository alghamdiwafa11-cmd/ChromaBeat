
import { GoogleGenAI, Type } from "@google/genai";
import { AudioMetadata, TranscriptionSegment } from "../types";

export class GeminiService {
  private getAI() {
    // Create fresh instance to pick up any newly selected API key
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async handleApiError(error: any) {
    console.error("Gemini API Error Detail:", error);
    const message = error.message || "";
    const isPermissionError = message.includes("permission") || message.includes("403");
    const isNotFoundError = message.includes("Requested entity was not found") || message.includes("404");
    
    if (isPermissionError || isNotFoundError) {
      if (typeof (window as any).aistudio?.openSelectKey === 'function') {
        // Guidelines: If these errors occur, prompt the user to re-select a key
        await (window as any).aistudio.openSelectKey();
        
        if (isPermissionError) {
          throw new Error("BILLING_REQUIRED: The selected project lacks permission for Veo. Please ensure you select a key from a project with an active billing account (Pay-as-you-go).");
        } else {
          throw new Error("MODEL_UNAVAILABLE: This model (Veo) might not be available in your region or project yet.");
        }
      }
    }
    throw error;
  }

  private async callModel(params: any) {
    const ai = this.getAI();
    try {
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
            { text: `Analyze this audio for video production. Provide: 1. Accurate lyrics with decimal timestamps. 2. Mood. 3. Title/Artist. 4. A 4K visual prompt for a looping background. Return JSON.` }
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
    const ai = this.getAI();
    onProgress?.("Initializing Veo Cinematic Engine...");
    
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic atmospheric loop, 8k detail, slow motion: ${prompt}`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      const loadingStates = [
        "Analyzing visual composition...",
        "Rendering temporal motion...",
        "Synthesizing light rays...",
        "Finalizing cinematic sequence..."
      ];
      let i = 0;

      while (!operation.done) {
        onProgress?.(loadingStates[i % loadingStates.length]);
        i++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation completed but no URL was returned.");
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error(`Video download failed: ${response.statusText}`);
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
      contents: { parts: [{ text: `Cinematic 8k nature landscape: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate image.");
  }
}

export const gemini = new GeminiService();
