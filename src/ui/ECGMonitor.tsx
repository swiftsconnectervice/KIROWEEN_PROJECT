/**
 * ECG Monitor Component - SVG Version
 * Simula un monitor médico de signos vitales con efecto neón CRT
 */

import React, { useState, useEffect } from 'react';

interface ECGMonitorProps {
  isConnected: boolean;
  color?: string;
  height?: number;
}

export const ECGMonitor: React.FC<ECGMonitorProps> = ({ 
  isConnected, 
  color = '#00ff88',
  height = 80 
}) => {
  const [offset, setOffset] = useState(0);
  const width = 300;
  const centerY = height / 2;

  // Animación
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        setOffset(prev => (prev + 2) % 200);
      } else {
        // Forzar re-render para flatline
        setOffset(0);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isConnected]);

  // Generar path de ECG
  const generateECGPath = (): string => {
    if (!isConnected) {
      // Flatline: línea horizontal simple
      return `M 0 ${centerY} L ${width} ${centerY}`;
    }

    const points: string[] = [];
    
    for (let x = 0; x < width; x++) {
      const waveX = (x + offset) % 200;
      let y = centerY;

      // P wave
      if (waveX < 30) {
        y = centerY - Math.sin((waveX / 30) * Math.PI) * 8;
      }
      // QRS complex
      else if (waveX >= 50 && waveX < 70) {
        const qrsPos = (waveX - 50) / 20;
        if (qrsPos < 0.3) {
          y = centerY + qrsPos * 15;
        } else if (qrsPos < 0.7) {
          y = centerY - ((qrsPos - 0.3) * 80 - 4.5);
        } else {
          y = centerY - (1 - qrsPos) * 80;
        }
      }
      // T wave
      else if (waveX >= 100 && waveX < 140) {
        y = centerY - Math.sin(((waveX - 100) / 40) * Math.PI) * 12;
      }

      points.push(`${x === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  };

  const lineColor = isConnected ? color : '#ff3333';

  return (
    <div className="relative bg-gray-950/80 rounded border border-cyan-500/30 overflow-hidden">
      {/* Grid de fondo */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(0, 255, 136, 0.05) 25%, rgba(0, 255, 136, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 136, 0.05) 75%, rgba(0, 255, 136, 0.05) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(0, 255, 136, 0.05) 25%, rgba(0, 255, 136, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 136, 0.05) 75%, rgba(0, 255, 136, 0.05) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* SVG ECG Line */}
      <svg 
        width="100%" 
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <path
          d={generateECGPath()}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          opacity="1"
        />
        {/* Línea adicional para mejor visibilidad */}
        <path
          d={generateECGPath()}
          fill="none"
          stroke={lineColor}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </svg>

      {/* Indicador de estado */}
      <div className="absolute top-1 right-2 flex items-center gap-1 pointer-events-none">
        <div 
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected 
              ? 'bg-green-400 animate-pulse' 
              : 'bg-red-500'
          }`}
        />
        <span className="text-[8px] font-mono text-gray-400 uppercase">
          {isConnected ? 'LIVE' : 'FLAT'}
        </span>
      </div>
    </div>
  );
};
