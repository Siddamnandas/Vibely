"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  audioFeatures: {
    energy: number;
    valence: number;
    tempo: number;
    danceability: number;
    mode: number;
  };
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({ audioFeatures, isPlaying, className = "" }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { energy, valence, tempo, danceability, mode } = audioFeatures;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Create gradient based on energy and mode (major vs minor)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) / 2);
    if (mode === 1) { // Major key - warm tones
      gradient.addColorStop(0, `rgba(${255 * valence}, ${200 * energy}, ${100 * danceability}, 0.8)`);
      gradient.addColorStop(1, `rgba(${255 * valence}, ${150 * energy}, ${50 * danceability}, 0.2)`);
    } else { // Minor key - cool tones
      gradient.addColorStop(0, `rgba(${100 * valence}, ${150 * energy}, ${255 * danceability}, 0.8)`);
      gradient.addColorStop(1, `rgba(${50 * valence}, ${200 * energy}, ${255 * danceability}, 0.2)`);
    }

    const drawWaveform = (timestamp: number) => {
      if (!isPlaying) {
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        return;
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw energy-based visualization
      const baseRadius = energy * 100;
      const amplitude = baseRadius * (0.5 + 0.5 * Math.sin(timestamp / 1000));
      const waveCount = Math.max(3, Math.floor(tempo / 20)); // More waves for faster tempo

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + 0.4 * danceability})`;
      ctx.lineWidth = 2;

      for (let wave = 0; wave < waveCount; wave++) {
        ctx.beginPath();
        const angleOffset = (wave / waveCount) * Math.PI * 2;
        const radius = baseRadius + wave * 20;

        for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
          const x = centerX + Math.cos(angle + angleOffset) * (radius + amplitude * Math.sin(angle * 3 + timestamp / 500));
          const y = centerY + Math.sin(angle + angleOffset) * (radius + amplitude * Math.cos(angle * 3 + timestamp / 500));

          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Add valence-based glow effect
        ctx.shadowColor = valence > 0.5 ? "rgba(255, 255, 0, 0.5)" : "rgba(0, 0, 255, 0.5)";
        ctx.shadowBlur = valence * 20;
        ctx.stroke();

        // Reset shadow for next wave
        ctx.shadowBlur = 0;
      }

      // Draw tempo dots in the center
      const dotCount = Math.floor(tempo / 30);
      const dotRadius = 3;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";

      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2 + timestamp / 2000;
        const x = centerX + Math.cos(angle) * (amplitude / 2);
        const y = centerY + Math.sin(angle) * (amplitude / 2);
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(drawWaveform);
    };

    const animationId = requestAnimationFrame(drawWaveform);

    return () => cancelAnimationFrame(animationId);
  }, [audioFeatures, isPlaying]);

  return (
    <motion.canvas
      ref={canvasRef}
      width={200}
      height={200}
      className={`rounded-full border border-white/20 ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
}

// Additional visualizer components
export function SpectrumBars({ audioFeatures }: { audioFeatures: AudioVisualizerProps["audioFeatures"] }) {
  const bars = Array.from({ length: 8 }, (_, i) => {
    const frequency = audioFeatures.energy * (i + 1) / 8;
    const height = (audioFeatures.valence * frequency) * 100;

    return (
      <motion.div
        key={i}
        className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-md"
        animate={{
          height: audioFeatures.tempo > 120 ? height + Math.random() * 20 : height,
        }}
        transition={{
          duration: 0.1,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{
          width: "8px",
          minHeight: "20px",
        }}
      />
    );
  });

  return (
    <div className="flex items-end justify-center gap-1 h-20">
      {bars}
    </div>
  );
}

export function RadialProgress({
  progress,
  label,
  color = "primary"
}: {
  progress: number;
  label: string;
  color?: "primary" | "secondary" | "success";
}) {
  const radius = 40;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colorClasses = {
    primary: "text-blue-600",
    secondary: "text-purple-600",
    success: "text-green-600",
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-300 ${colorClasses[color]}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold">{Math.round(progress)}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

// Feature display component
export function AudioFeatureGauge({
  title,
  value,
  max = 1,
  color = "blue",
  unit = ""
}: {
  title: string;
  value: number;
  max?: number;
  color?: "blue" | "green" | "red" | "purple";
  unit?: string;
}) {
  const percentage = (value / max) * 100;
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-gray-600">
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${colorClasses[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export function AudioFeatureGrid({ audioFeatures }: { audioFeatures: AudioVisualizerProps["audioFeatures"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <AudioFeatureGauge
        title="Energy"
        value={audioFeatures.energy}
        color="red"
        unit="/1.0"
      />
      <AudioFeatureGauge
        title="Valence"
        value={audioFeatures.valence}
        color="green"
        unit="/1.0"
      />
      <AudioFeatureGauge
        title="Danceability"
        value={audioFeatures.danceability}
        color="purple"
        unit="/1.0"
      />
      <AudioFeatureGauge
        title="Tempo"
        value={audioFeatures.tempo}
        max={200}
        color="blue"
        unit=" BPM"
      />
    </div>
  );
}
