/**
 * System Topology - Realistic Data Flow Visualization
 * Single-shot processing with neural network visualization
 * 
 * @deprecated This component has been superseded by UnifiedSystemView.
 * UnifiedSystemView combines the topology visualization from this component
 * with the agent step timeline from NecropsyView into a single unified interface.
 * 
 * Migration: Replace <SystemTopology /> with <UnifiedSystemView lastClaim={claim} />
 * 
 * This component will be removed in a future version.
 * Last updated: 2025-12-01
 */

import React, { useRef, useEffect, useCallback } from 'react';
import Sketch from 'react-p5';

type SystemState = 'idle' | 'processing' | 'error' | 'success';

interface SystemTopologyProps {
  state?: SystemState;
}

// Nodo del sistema
interface Node {
  x: number;
  y: number;
  label: string;
  color: [number, number, number];
  isAI?: boolean;
}

// Neurona para la red neuronal
interface Neuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Paquete de datos único
class DataPacket {
  currentSegment: number = 0;
  progress: number = 0;
  speed: number = 0.02;
  nodes: Node[];
  active: boolean = true;
  
  constructor(nodes: Node[]) {
    this.nodes = nodes;
  }
  
  update() {
    if (!this.active) return;
    
    this.progress += this.speed;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.currentSegment++;
      
      if (this.currentSegment >= this.nodes.length - 1) {
        this.active = false;
      }
    }
  }
  
  getCurrentPosition(p5: any) {
    if (!this.active || this.currentSegment >= this.nodes.length - 1) {
      return null;
    }
    
    const from = this.nodes[this.currentSegment];
    const to = this.nodes[this.currentSegment + 1];
    
    return {
      x: p5.lerp(from.x, to.x, this.progress),
      y: p5.lerp(from.y, to.y, this.progress),
      segment: this.currentSegment
    };
  }
  
  draw(p5: any) {
    const pos = this.getCurrentPosition(p5);
    if (!pos) return;
    
    p5.push();
    p5.noStroke();
    
    // Glow intenso
    (p5.drawingContext as any).shadowBlur = 35;
    (p5.drawingContext as any).shadowColor = 'rgba(6, 182, 212, 0.9)';
    
    // Halo exterior
    p5.fill(6, 182, 212, 150);
    p5.circle(pos.x, pos.y, 20);
    
    // Núcleo brillante
    p5.fill(255, 255, 255, 250);
    p5.circle(pos.x, pos.y, 10);
    
    p5.pop();
  }
  
  isActive() {
    return this.active;
  }
}

// Onda expansiva
class Shockwave {
  x: number;
  y: number;
  radius: number = 0;
  maxRadius: number = 700;
  speed: number = 18;
  alpha: number = 255;
  active: boolean = true;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  
  update() {
    if (this.active) {
      this.radius += this.speed;
      this.alpha = 255 * (1 - this.radius / this.maxRadius);
      
      if (this.radius >= this.maxRadius) {
        this.active = false;
      }
    }
  }
  
  draw(p5: any) {
    if (!this.active) return;
    
    p5.push();
    p5.noFill();
    
    // Anillo exterior
    p5.strokeWeight(5);
    p5.stroke(34, 197, 94, this.alpha);
    (p5.drawingContext as any).shadowBlur = 35;
    (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.8)';
    p5.circle(this.x, this.y, this.radius * 2);
    
    // Anillo interior
    p5.strokeWeight(2);
    p5.stroke(134, 239, 172, this.alpha * 0.7);
    p5.circle(this.x, this.y, this.radius * 2 - 25);
    
    p5.pop();
  }
  
  isActive() {
    return this.active;
  }
}

// Función para dibujar cables
function drawCable(p5: any, from: Node, to: Node, isActive: boolean, intensity: number = 0.3) {
  p5.push();
  
  const color = isActive ? [6, 182, 212] : [60, 60, 60];
  const alpha = isActive ? 200 : 100;
  
  p5.stroke(...color, alpha);
  p5.strokeWeight(isActive ? 3 : 2);
  
  if (isActive) {
    (p5.drawingContext as any).shadowBlur = 15 * intensity;
    (p5.drawingContext as any).shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
  }
  
  p5.line(from.x, from.y, to.x, to.y);
  p5.pop();
}

// Función para dibujar red neuronal (AI Brain)
function drawNeuralNetwork(p5: any, x: number, y: number, neurons: Neuron[], frameCount: number) {
  const size = 50;
  
  p5.push();
  
  // Actualizar posiciones de neuronas (movimiento suave)
  neurons.forEach((neuron, i) => {
    neuron.x += neuron.vx;
    neuron.y += neuron.vy;
    
    // Mantener dentro del área
    if (neuron.x < x - size || neuron.x > x + size) neuron.vx *= -1;
    if (neuron.y < y - size || neuron.y > y + size) neuron.vy *= -1;
  });
  
  // Dibujar conexiones
  p5.stroke(34, 197, 94, 80);
  p5.strokeWeight(1);
  (p5.drawingContext as any).shadowBlur = 5;
  (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.5)';
  
  for (let i = 0; i < neurons.length; i++) {
    for (let j = i + 1; j < neurons.length; j++) {
      const dist = Math.sqrt((neurons[i].x - neurons[j].x) ** 2 + (neurons[i].y - neurons[j].y) ** 2);
      if (dist < 60) {
        p5.line(neurons[i].x, neurons[i].y, neurons[j].x, neurons[j].y);
      }
    }
  }
  
  // Dibujar neuronas
  neurons.forEach((neuron) => {
    p5.noStroke();
    p5.fill(34, 197, 94, 200);
    (p5.drawingContext as any).shadowBlur = 10;
    (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.8)';
    p5.circle(neuron.x, neuron.y, 6);
    
    // Núcleo
    p5.fill(134, 239, 172);
    p5.circle(neuron.x, neuron.y, 3);
  });
  
  p5.pop();
}

// Función para dibujar nodo
function drawNode(p5: any, node: Node, state: SystemState, shockwaveRadius: number, neurons?: Neuron[], frameCount?: number) {
  const { x, y, label, color } = node;
  
  const width = 140;
  const height = 90;
  
  // Brillo extra si la onda pasa cerca
  let glowIntensity = 20;
  const distToShockwave = Math.abs(Math.sqrt((x - 600) ** 2 + (y - 250) ** 2) - shockwaveRadius);
  if (distToShockwave < 50 && shockwaveRadius > 0) {
    glowIntensity = 70;
  }
  
  p5.push();
  
  // Glow del nodo
  (p5.drawingContext as any).shadowBlur = glowIntensity;
  (p5.drawingContext as any).shadowColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  
  // Fondo
  p5.fill(color[0], color[1], color[2], 30);
  p5.stroke(color[0], color[1], color[2], 180);
  p5.strokeWeight(2);
  p5.rect(x - width / 2, y - height / 2, width, height, 8);
  
  // Esquinas holográficas
  p5.noFill();
  p5.stroke(color[0], color[1], color[2], 255);
  p5.strokeWeight(1.5);
  
  const cornerSize = 12;
  // Top-left
  p5.line(x - width / 2, y - height / 2 + cornerSize, x - width / 2, y - height / 2);
  p5.line(x - width / 2, y - height / 2, x - width / 2 + cornerSize, y - height / 2);
  // Top-right
  p5.line(x + width / 2 - cornerSize, y - height / 2, x + width / 2, y - height / 2);
  p5.line(x + width / 2, y - height / 2, x + width / 2, y - height / 2 + cornerSize);
  // Bottom-left
  p5.line(x - width / 2, y + height / 2 - cornerSize, x - width / 2, y + height / 2);
  p5.line(x - width / 2, y + height / 2, x - width / 2 + cornerSize, y + height / 2);
  // Bottom-right
  p5.line(x + width / 2 - cornerSize, y + height / 2, x + width / 2, y + height / 2);
  p5.line(x + width / 2, y + height / 2, x + width / 2, y + height / 2 - cornerSize);
  
  // Si es AI Brain, dibujar red neuronal
  if (node.isAI && neurons && frameCount !== undefined) {
    drawNeuralNetwork(p5, x, y, neurons, frameCount);
  }
  
  // Texto del label
  p5.noStroke();
  p5.fill(255, 255, 255, 240);
  p5.textAlign(p5.CENTER, p5.CENTER);
  p5.textSize(13);
  p5.textFont('monospace');
  
  (p5.drawingContext as any).shadowBlur = 8;
  (p5.drawingContext as any).shadowColor = 'rgba(255, 255, 255, 0.6)';
  
  p5.text(label.toUpperCase(), x, y + height / 2 - 15);
  
  p5.pop();
}

/**
 * @deprecated Use UnifiedSystemView instead. This component will be removed in a future version.
 * @see UnifiedSystemView
 */
export const SystemTopology: React.FC<SystemTopologyProps> = ({ state = 'idle' }) => {
  const nodesRef = useRef<Node[]>([]);
  const dataPacketRef = useRef<DataPacket | null>(null);
  const shockwaveRef = useRef<Shockwave | null>(null);
  const neuronsRef = useRef<Neuron[]>([]);
  const prevStateRef = useRef<SystemState>(state);
  const successTimerRef = useRef<number>(0);
  const autoResetRef = useRef<boolean>(false);
  const isSetupRef = useRef<boolean>(false);
  
  // ✅ Memoizamos setup para que no se recree en cada render
  const setup = useCallback((p5: any, canvasParentRef: Element) => {
    // Limpiar TODOS los canvas existentes en el contenedor
    const allCanvases = canvasParentRef.querySelectorAll('canvas');
    allCanvases.forEach(canvas => canvas.remove());
    
    // Limpiar también por ID global
    const globalCanvas = document.querySelector('#system-topology-canvas');
    if (globalCanvas) {
      globalCanvas.remove();
    }
    
    const canvas = p5.createCanvas(1200, 500).parent(canvasParentRef);
    canvas.id('system-topology-canvas');
    
    // Definir nodos solo si no existen
    if (nodesRef.current.length === 0) {
      nodesRef.current = [
        { x: 200, y: 250, label: 'Frontend', color: [6, 182, 212] },
        { x: 450, y: 250, label: 'Gateway', color: [168, 85, 247] },
        { x: 750, y: 250, label: 'AI Brain', color: [34, 197, 94], isAI: true },
        { x: 1000, y: 250, label: 'Legacy', color: [249, 115, 22] }
      ];
    }
    
    // Inicializar neuronas para AI Brain solo si no existen
    if (neuronsRef.current.length === 0) {
      const aiNode = nodesRef.current[2];
      for (let i = 0; i < 6; i++) {
        neuronsRef.current.push({
          x: aiNode.x + p5.random(-40, 40),
          y: aiNode.y + p5.random(-30, 30),
          vx: p5.random(-0.3, 0.3),
          vy: p5.random(-0.3, 0.3)
        });
      }
    }
    
    isSetupRef.current = true;
  }, []); // No dependencias, solo se ejecuta una vez
  
  // ✅ Memoizamos draw con sus dependencias
  const draw = useCallback((p5: any) => {
    // Fondo con gradiente que coincide con el dashboard
    // Crear gradiente de izquierda a derecha: gray-900 → purple-900 → gray-950
    const ctx = p5.drawingContext;
    const gradient = ctx.createLinearGradient(0, 0, p5.width, p5.height);
    gradient.addColorStop(0, 'rgb(17, 24, 39)');      // gray-900
    gradient.addColorStop(0.5, 'rgb(88, 28, 135)');   // purple-900
    gradient.addColorStop(1, 'rgb(3, 7, 18)');        // gray-950
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, p5.width, p5.height);
    
    // Detectar cambio de estado
    if (state === 'processing' && prevStateRef.current !== 'processing') {
      // Iniciar paquete de datos único
      dataPacketRef.current = new DataPacket(nodesRef.current);
    }
    
    if (state === 'success' && prevStateRef.current !== 'success') {
      // Lanzar shockwave
      shockwaveRef.current = new Shockwave(600, 250);
      successTimerRef.current = p5.frameCount;
      autoResetRef.current = true;
    }
    
    prevStateRef.current = state;
    
    // Auto-reset después de success (2 segundos = 120 frames a 60fps)
    if (autoResetRef.current && state === 'success') {
      if (p5.frameCount - successTimerRef.current > 120) {
        autoResetRef.current = false;
        // Aquí normalmente llamarías a un callback para cambiar el estado a 'idle'
        // Por ahora solo limpiamos referencias
        shockwaveRef.current = null;
      }
    }
    
    // Actualizar paquete de datos
    if (dataPacketRef.current && dataPacketRef.current.isActive()) {
      dataPacketRef.current.update();
    }
    
    // Determinar qué cables están activos
    const packetPos = dataPacketRef.current?.getCurrentPosition(p5);
    const activeSegment = packetPos?.segment ?? -1;
    
    // Dibujar cables
    for (let i = 0; i < nodesRef.current.length - 1; i++) {
      const isActive = activeSegment === i;
      const intensity = isActive ? 2 : 0.3;
      drawCable(p5, nodesRef.current[i], nodesRef.current[i + 1], isActive, intensity);
    }
    
    // Dibujar paquete de datos
    if (dataPacketRef.current) {
      dataPacketRef.current.draw(p5);
    }
    
    // Actualizar y dibujar shockwave
    const shockwaveRadius = shockwaveRef.current?.radius || 0;
    if (shockwaveRef.current && shockwaveRef.current.isActive()) {
      shockwaveRef.current.update();
      shockwaveRef.current.draw(p5);
    }
    
    // Dibujar nodos
    nodesRef.current.forEach((node) => {
      drawNode(p5, node, state, shockwaveRadius, node.isAI ? neuronsRef.current : undefined, p5.frameCount);
    });
    
    // Título
    p5.push();
    p5.noStroke();
    p5.fill(6, 182, 212, 220);
    p5.textAlign(p5.LEFT, p5.TOP);
    p5.textSize(22);
    p5.textFont('monospace');
    (p5.drawingContext as any).shadowBlur = 12;
    (p5.drawingContext as any).shadowColor = 'rgba(6, 182, 212, 0.7)';
    p5.text('[ SYSTEM TOPOLOGY ]', 30, 30);
    
    // Estado
    const stateColors: Record<SystemState, [number, number, number]> = {
      idle: [100, 100, 100],
      processing: [6, 182, 212],
      success: [34, 197, 94],
      error: [239, 68, 68]
    };
    const stateColor = stateColors[state];
    
    p5.fill(...stateColor);
    p5.textSize(12);
    (p5.drawingContext as any).shadowColor = `rgb(${stateColor[0]}, ${stateColor[1]}, ${stateColor[2]})`;
    p5.text(`> STATUS: ${state.toUpperCase()}`, 30, 62);
    
    p5.pop();
  }, [state]); // ✅ Dependencia: solo se recrea si 'state' cambia
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      isSetupRef.current = false;
      
      // Limpiar todos los canvas relacionados
      const canvas = document.querySelector('#system-topology-canvas');
      if (canvas) {
        canvas.remove();
      }
      
      // Limpiar todos los canvas huérfanos
      const allCanvases = document.querySelectorAll('canvas');
      allCanvases.forEach(c => {
        if (c.id === 'system-topology-canvas' || c.parentElement?.querySelector('canvas') === c) {
          c.remove();
        }
      });
      
      // Resetear refs
      nodesRef.current = [];
      neuronsRef.current = [];
      dataPacketRef.current = null;
      shockwaveRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------
  // 👇 MODIFICA EL RETURN FINAL ASÍ:
  // ---------------------------------------------------------
  
  return (
    // @ts-ignore: react-p5 types are missing 'remove' property
    <Sketch 
      setup={setup} 
      draw={draw} 
      
    />
  );
};

