
import React, { useEffect, useRef, useState } from 'react';
import { VisualizerSettings } from '../types';

interface VisualizerCanvasProps {
  analyser: AnalyserNode | null;
  settings: VisualizerSettings;
  backgroundImage: string | null;
  backgroundVideoUrl: string | null;
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ analyser, settings, backgroundImage, backgroundVideoUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Sync background assets to internal refs for canvas drawing
  useEffect(() => {
    if (backgroundVideoUrl) {
      const vid = document.createElement('video');
      vid.src = backgroundVideoUrl;
      vid.loop = true;
      vid.muted = true;
      vid.play().catch(() => {});
      videoRef.current = vid;
      imageRef.current = null;
    } else if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      imageRef.current = img;
      videoRef.current = null;
    }
  }, [backgroundImage, backgroundVideoUrl]);

  const getStyle = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    if (!settings.gradientEnabled) return settings.color;
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, settings.color);
    gradient.addColorStop(1, settings.colorSecondary);
    return gradient;
  };

  const draw = () => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const lowFreqs = dataArray.slice(0, 10);
    const avgLow = lowFreqs.reduce((a, b) => a + b) / 10;
    const beatPulse = (avgLow / 255) * 0.04;
    const scale = 1 + beatPulse;
    
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // 1. Draw Background (Image or Video)
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    if (videoRef.current && videoRef.current.readyState >= 2) {
      const vid = videoRef.current;
      const vidRatio = vid.videoWidth / vid.videoHeight;
      const canvasRatio = width / height;
      let dWidth, dHeight, dx, dy;

      if (canvasRatio > vidRatio) {
        dWidth = width;
        dHeight = width / vidRatio;
        dx = 0;
        dy = (height - dHeight) / 2;
      } else {
        dHeight = height;
        dWidth = height * vidRatio;
        dx = (width - dWidth) / 2;
        dy = 0;
      }
      ctx.drawImage(vid, dx, dy, dWidth, dHeight);
    } else if (imageRef.current && imageRef.current.complete) {
      const img = imageRef.current;
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let dWidth, dHeight, dx, dy;

      if (canvasRatio > imgRatio) {
        dWidth = width;
        dHeight = width / imgRatio;
        dx = 0;
        dy = (height - dHeight) / 2;
      } else {
        dHeight = height;
        dWidth = height * imgRatio;
        dx = (width - dWidth) / 2;
        dy = 0;
      }
      ctx.drawImage(img, dx, dy, dWidth, dHeight);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Draw Visualizer
    ctx.save();
    const intensityScale = settings.intensity / 100;

    if (settings.mode === 'bars') {
      const barsToDraw = bufferLength / 2;
      const barWidth = (width / barsToDraw) * settings.barWidth;
      let x = 0;
      for (let i = 0; i < barsToDraw; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.6 * (settings.sensitivity / 50) * intensityScale;
        ctx.fillStyle = getStyle(ctx, x, height, x, height - barHeight);
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    } else if (settings.mode === 'symmetry') {
      const barsToDraw = bufferLength / 4;
      const barWidth = (width / barsToDraw / 2) * settings.barWidth;
      const centerX = width / 2;
      for (let i = 0; i < barsToDraw; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.3 * (settings.sensitivity / 50) * intensityScale;
        ctx.fillStyle = getStyle(ctx, 0, height/2 - barHeight/2, 0, height/2 + barHeight/2);
        ctx.fillRect(centerX + i * barWidth, height/2 - barHeight/2, barWidth - 1, barHeight);
        ctx.fillRect(centerX - i * barWidth - barWidth, height/2 - barHeight/2, barWidth - 1, barHeight);
      }
    } else if (settings.mode === 'waves') {
      analyser.getByteTimeDomainData(dataArray);
      ctx.lineWidth = 6 * intensityScale;
      ctx.strokeStyle = settings.color;
      ctx.beginPath();
      const sliceWidth = width * 1.0 / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    } else if (settings.mode === 'circle') {
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = (Math.min(width, height) / 5);
      const radius = baseRadius + (avgLow / 2);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = 10 * intensityScale;
      ctx.stroke();

      for (let i = 0; i < bufferLength; i += 4) {
        const angle = (i / bufferLength) * Math.PI * 2;
        const barHeight = (dataArray[i] / 255) * 200 * (settings.sensitivity / 50) * intensityScale;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = getStyle(ctx, x1, y1, x2, y2);
        ctx.lineWidth = 4 * intensityScale;
        ctx.stroke();
      }
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    // Determine canvas resolution based on aspect ratio
    if (canvasRef.current) {
        if (settings.aspectRatio === '9:16') {
            canvasRef.current.width = 1080;
            canvasRef.current.height = 1920;
        } else if (settings.aspectRatio === '1:1') {
            canvasRef.current.width = 1080;
            canvasRef.current.height = 1080;
        } else {
            canvasRef.current.width = 1920;
            canvasRef.current.height = 1080;
        }
    }
    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, settings]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain transition-all duration-300 ${settings.filter}`}
      />
    </div>
  );
};

export default VisualizerCanvas;
