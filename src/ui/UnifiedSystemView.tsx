/**
 * Unified System View - Combines System Topology with Agent Step Visualization
 * Preserves p5.js neural network animation while adding React overlay for agent steps
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import Sketch from 'react-p5';
import { Mail, Database, Shield, Brain, Zap, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface ProcessedClaim {
  id: string;
  decision: string;
  validationResult: {
    fraudRisk: string;
  };
  processingTime: number;
  status?: string;
}

interface UnifiedSystemViewProps {
  lastClaim?: ProcessedClaim;
}

// Node in the system
interface Node {
  x: number;
  y: number;
  label: string;
  color: [number, number, number];
  isAI?: boolean;
}

// Neuron for neural network
interface Neuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Background particle for electrical effect
interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

// Electric bolt/lightning
interface ElectricBolt {
  points: { x: number; y: number }[];
  alpha: number;
  active: boolean;
  duration: number;
  maxDuration: number;
}

// Agent step with node mapping
interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  duration?: number;
  nodeIndex: number;
  description: string;
  icon: React.ReactNode;
}

// Step-to-node mapping constant
const STEP_NODE_MAPPING: Record<string, number> = {
  'EXTRACT': 0,    // Dashboard/Injector
  'PARSE': 1,      // Express API
  'VALIDATE': 2,   // AI Brain
  'DECISION': 2,   // AI Brain
  'SUBMIT': 3      // Legacy System
};

// Step icon mapping
const STEP_ICON_MAPPING: Record<string, React.ReactNode> = {
  'EXTRACT': <Mail className="w-4 h-4" />,
  'PARSE': <Zap className="w-4 h-4" />,
  'QUERY': <Database className="w-4 h-4" />,
  'VALIDATE': <Shield className="w-4 h-4" />,
  'DECISION': <Brain className="w-4 h-4" />,
  'SUBMIT': <Database className="w-4 h-4" />
};

// Status colors for step indicators
const STATUS_COLORS = {
  pending: { 
    bg: 'bg-gray-600', 
    border: 'border-gray-500', 
    text: 'text-gray-300',
    rgb: [100, 100, 100] 
  },
  running: { 
    bg: 'bg-blue-600', 
    border: 'border-blue-400', 
    text: 'text-blue-100',
    rgb: [37, 99, 235] 
  },
  success: { 
    bg: 'bg-green-600', 
    border: 'border-green-400', 
    text: 'text-green-100',
    rgb: [34, 197, 94] 
  },
  error: { 
    bg: 'bg-red-600', 
    border: 'border-red-400', 
    text: 'text-red-100',
    rgb: [239, 68, 68] 
  },
  skipped: { 
    bg: 'bg-yellow-600', 
    border: 'border-yellow-400', 
    text: 'text-yellow-100',
    rgb: [234, 179, 8] 
  }
};

/**
 * Calculate absolute position for a step indicator based on node index
 * Positions the step indicator above the corresponding node
 */
function getStepPosition(nodeIndex: number, nodes: Node[]): { left: string; top: string; transform: string } {
  if (nodeIndex < 0 || nodeIndex >= nodes.length) {
    // Default to center if invalid index
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    };
  }
  
  const node = nodes[nodeIndex];
  return {
    left: `${node.x}px`,
    top: `${node.y - 120}px`, // Position 120px above the node
    transform: 'translateX(-50%)' // Center horizontally on the node
  };
}

// Data packet traveling through the system
class DataPacket {
  currentSegment: number = 0;
  progress: number = 0;
  speed: number = 0.02;
  nodes: Node[];
  active: boolean = true;
  currentStepId?: string; // NEW: tracks which step is active
  
  constructor(nodes: Node[]) {
    this.nodes = nodes;
    this.updateCurrentStep(); // Initialize step on creation
  }
  
  /**
   * Update current step based on segment
   * Maps segment index to corresponding agent step
   */
  updateCurrentStep() {
    // Map segment to step ID
    const stepMap = ['EXTRACT', 'PARSE', 'VALIDATE', 'SUBMIT'];
    if (this.currentSegment >= 0 && this.currentSegment < stepMap.length) {
      this.currentStepId = stepMap[this.currentSegment];
    } else {
      this.currentStepId = undefined;
    }
  }
  
  update() {
    if (!this.active) return;
    
    this.progress += this.speed;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.currentSegment++;
      
      // NEW: Update current step when segment changes
      this.updateCurrentStep();
      
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
    
    // Intense glow
    (p5.drawingContext as any).shadowBlur = 35;
    (p5.drawingContext as any).shadowColor = 'rgba(6, 182, 212, 0.9)';
    
    // Outer halo
    p5.fill(6, 182, 212, 150);
    p5.circle(pos.x, pos.y, 20);
    
    // Bright core
    p5.fill(255, 255, 255, 250);
    p5.circle(pos.x, pos.y, 10);
    
    p5.pop();
  }
  
  isActive() {
    return this.active;
  }
}

// Shockwave effect
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
    
    // Outer ring
    p5.strokeWeight(5);
    p5.stroke(34, 197, 94, this.alpha);
    (p5.drawingContext as any).shadowBlur = 35;
    (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.8)';
    p5.circle(this.x, this.y, this.radius * 2);
    
    // Inner ring
    p5.strokeWeight(2);
    p5.stroke(134, 239, 172, this.alpha * 0.7);
    p5.circle(this.x, this.y, this.radius * 2 - 25);
    
    p5.pop();
  }
  
  isActive() {
    return this.active;
  }
}

// Energy particle for cable animation
interface EnergyParticle {
  progress: number;
  speed: number;
  size: number;
}

// Function to draw circuit grid background
function drawCircuitGrid(p5: any, frameCount: number) {
  p5.push();
  
  const gridSize = 40;
  const pulseSpeed = 0.02;
  
  // Draw vertical lines
  for (let x = 0; x < p5.width; x += gridSize) {
    const pulse = p5.sin(frameCount * pulseSpeed + x * 0.01) * 0.5 + 0.5;
    const alpha = 20 + pulse * 30;
    p5.stroke(34, 197, 94, alpha);
    p5.strokeWeight(1);
    p5.line(x, 0, x, p5.height);
  }
  
  // Draw horizontal lines
  for (let y = 0; y < p5.height; y += gridSize) {
    const pulse = p5.sin(frameCount * pulseSpeed + y * 0.01) * 0.5 + 0.5;
    const alpha = 20 + pulse * 30;
    p5.stroke(34, 197, 94, alpha);
    p5.strokeWeight(1);
    p5.line(0, y, p5.width, y);
  }
  
  // Draw circuit nodes at intersections
  for (let x = 0; x < p5.width; x += gridSize) {
    for (let y = 0; y < p5.height; y += gridSize) {
      if (p5.random() > 0.95) { // Only 5% of intersections
        const pulse = p5.sin(frameCount * pulseSpeed * 2 + x * 0.02 + y * 0.02) * 0.5 + 0.5;
        p5.noStroke();
        p5.fill(34, 197, 94, 100 + pulse * 155);
        (p5.drawingContext as any).shadowBlur = 10;
        (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.8)';
        p5.circle(x, y, 3 + pulse * 2);
      }
    }
  }
  
  p5.pop();
}

// Function to draw organic veins overlay
function drawOrganicVeins(p5: any, frameCount: number) {
  p5.push();
  
  p5.noFill();
  p5.strokeWeight(1);
  
  // Draw curved organic lines
  for (let i = 0; i < 5; i++) {
    const yOffset = (i * p5.height / 5) + p5.sin(frameCount * 0.01 + i) * 20;
    const pulse = p5.sin(frameCount * 0.03 + i * 0.5) * 0.5 + 0.5;
    
    p5.stroke(6, 182, 212, 30 + pulse * 20);
    (p5.drawingContext as any).shadowBlur = 5;
    (p5.drawingContext as any).shadowColor = 'rgba(6, 182, 212, 0.3)';
    
    p5.beginShape();
    for (let x = 0; x < p5.width; x += 20) {
      const y = yOffset + p5.sin(x * 0.01 + frameCount * 0.02) * 30;
      p5.curveVertex(x, y);
    }
    p5.endShape();
  }
  
  p5.pop();
}

// Function to update and draw background particles
function drawBackgroundParticles(p5: any, particles: BackgroundParticle[]) {
  p5.push();
  
  particles.forEach((particle, index) => {
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.01;
    
    // Wrap around screen
    if (particle.x < 0) particle.x = p5.width;
    if (particle.x > p5.width) particle.x = 0;
    if (particle.y < 0) particle.y = p5.height;
    if (particle.y > p5.height) particle.y = 0;
    
    // Respawn if dead
    if (particle.life <= 0) {
      particle.x = p5.random(p5.width);
      particle.y = p5.random(p5.height);
      particle.life = 1;
    }
    
    // Draw particle
    const alpha = particle.alpha * particle.life;
    p5.noStroke();
    p5.fill(255, 255, 200, alpha * 150);
    (p5.drawingContext as any).shadowBlur = 8;
    (p5.drawingContext as any).shadowColor = `rgba(255, 255, 200, ${alpha * 0.8})`;
    p5.circle(particle.x, particle.y, particle.size);
  });
  
  p5.pop();
}

// Function to create electric bolt
function createElectricBolt(p5: any, startX: number, startY: number, endX: number, endY: number): ElectricBolt {
  const points: { x: number; y: number }[] = [];
  const segments = 15;
  const displacement = 30;
  
  points.push({ x: startX, y: startY });
  
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const x = p5.lerp(startX, endX, t) + p5.random(-displacement, displacement);
    const y = p5.lerp(startY, endY, t) + p5.random(-displacement, displacement);
    points.push({ x, y });
  }
  
  points.push({ x: endX, y: endY });
  
  return {
    points,
    alpha: 255,
    active: true,
    duration: 0,
    maxDuration: 30 // frames
  };
}

// Function to draw electric bolt
function drawElectricBolt(p5: any, bolt: ElectricBolt) {
  if (!bolt.active) return;
  
  p5.push();
  
  // Main bolt
  p5.stroke(255, 255, 255, bolt.alpha);
  p5.strokeWeight(3);
  (p5.drawingContext as any).shadowBlur = 20;
  (p5.drawingContext as any).shadowColor = `rgba(100, 200, 255, ${bolt.alpha / 255})`;
  
  p5.beginShape();
  bolt.points.forEach(point => {
    p5.vertex(point.x, point.y);
  });
  p5.endShape();
  
  // Outer glow
  p5.stroke(100, 200, 255, bolt.alpha * 0.5);
  p5.strokeWeight(6);
  p5.beginShape();
  bolt.points.forEach(point => {
    p5.vertex(point.x, point.y);
  });
  p5.endShape();
  
  // Update bolt
  bolt.duration++;
  bolt.alpha = 255 * (1 - bolt.duration / bolt.maxDuration);
  
  if (bolt.duration >= bolt.maxDuration) {
    bolt.active = false;
  }
  
  p5.pop();
}

// Function to draw vignette effect
function drawVignette(p5: any) {
  p5.push();
  
  const ctx = p5.drawingContext;
  const gradient = ctx.createRadialGradient(
    p5.width / 2, p5.height / 2, p5.height * 0.5,  // Radio interno más grande (0.5 en lugar de 0.3)
    p5.width / 2, p5.height / 2, p5.height * 1.0   // Radio externo más grande (1.0 en lugar de 0.8)
  );
  
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');  // Opacidad reducida (0.4 en lugar de 0.7)
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, p5.width, p5.height);
  
  p5.pop();
}

// Function to draw cables with energy particles
function drawCable(p5: any, from: Node, to: Node, isActive: boolean, intensity: number = 0.3, frameCount: number = 0) {
  p5.push();
  
  const color = isActive ? [6, 182, 212] : [60, 60, 60];
  const alpha = isActive ? 200 : 100;
  
  // Main cable
  p5.stroke(...color, alpha);
  p5.strokeWeight(isActive ? 4 : 2);
  
  if (isActive) {
    (p5.drawingContext as any).shadowBlur = 20 * intensity;
    (p5.drawingContext as any).shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
  }
  
  p5.line(from.x, from.y, to.x, to.y);
  
  // Energy particles flowing through cable (only when active)
  if (isActive) {
    const numParticles = 5;
    for (let i = 0; i < numParticles; i++) {
      const offset = (frameCount * 0.02 + i * 0.2) % 1;
      const particleX = p5.lerp(from.x, to.x, offset);
      const particleY = p5.lerp(from.y, to.y, offset);
      
      // Particle glow
      p5.noStroke();
      (p5.drawingContext as any).shadowBlur = 20;
      (p5.drawingContext as any).shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`;
      
      // Outer glow
      p5.fill(...color, 100);
      p5.circle(particleX, particleY, 12);
      
      // Inner bright core
      p5.fill(255, 255, 255, 200);
      p5.circle(particleX, particleY, 6);
    }
  }
  
  p5.pop();
}

// Function to draw Dashboard (Monitor with Email)
function drawDashboard(p5: any, x: number, y: number, frameCount: number) {
  p5.push();
  
  // Monitor frame
  const monitorW = 80;
  const monitorH = 60;
  p5.fill(6, 182, 212, 30);
  p5.stroke(6, 182, 212, 200);
  p5.strokeWeight(3);
  (p5.drawingContext as any).shadowBlur = 20;
  (p5.drawingContext as any).shadowColor = 'rgba(6, 182, 212, 0.6)';
  p5.rect(x - monitorW/2, y - monitorH/2, monitorW, monitorH, 5);
  
  // Screen glow
  p5.fill(6, 182, 212, 50);
  p5.noStroke();
  p5.rect(x - monitorW/2 + 5, y - monitorH/2 + 5, monitorW - 10, monitorH - 10, 3);
  
  // Email icon (animated)
  const emailOffset = p5.sin(frameCount * 0.05) * 5;
  p5.fill(255, 255, 255, 200);
  p5.stroke(6, 182, 212, 255);
  p5.strokeWeight(2);
  const emailSize = 20;
  p5.rect(x - emailSize/2, y - emailSize/2 + emailOffset - 10, emailSize, emailSize * 0.7, 2);
  // Envelope flap
  p5.line(x - emailSize/2, y - emailSize/2 + emailOffset - 10, x, y + emailOffset - 10);
  p5.line(x + emailSize/2, y - emailSize/2 + emailOffset - 10, x, y + emailOffset - 10);
  
  // Label
  p5.noStroke();
  p5.fill(6, 182, 212, 220);
  p5.textAlign(p5.CENTER, p5.CENTER);
  p5.textSize(11);
  p5.textFont('monospace');
  p5.text('DASHBOARD', x, y + 50);
  
  p5.pop();
}

// Function to draw Express API (Server Rack)
function drawServerRack(p5: any, x: number, y: number, frameCount: number) {
  p5.push();
  
  const rackW = 70;
  const rackH = 80;
  
  // Rack frame
  p5.fill(168, 85, 247, 20);
  p5.stroke(168, 85, 247, 200);
  p5.strokeWeight(3);
  (p5.drawingContext as any).shadowBlur = 20;
  (p5.drawingContext as any).shadowColor = 'rgba(168, 85, 247, 0.6)';
  p5.rect(x - rackW/2, y - rackH/2, rackW, rackH, 5);
  
  // Server slots (4 levels)
  for (let i = 0; i < 4; i++) {
    const slotY = y - rackH/2 + 15 + i * 18;
    p5.fill(168, 85, 247, 40);
    p5.stroke(168, 85, 247, 150);
    p5.strokeWeight(1);
    p5.rect(x - rackW/2 + 5, slotY, rackW - 10, 12, 2);
    
    // LEDs (blinking)
    const ledColors = [
      [255, 0, 0],    // Red
      [0, 255, 0],    // Green
      [0, 100, 255]   // Blue
    ];
    
    for (let j = 0; j < 3; j++) {
      const ledX = x - rackW/2 + 15 + j * 8;
      const blink = p5.sin(frameCount * 0.1 + i * 0.5 + j * 0.3) > 0;
      if (blink) {
        p5.noStroke();
        p5.fill(...ledColors[j], 200);
        (p5.drawingContext as any).shadowBlur = 8;
        (p5.drawingContext as any).shadowColor = `rgba(${ledColors[j][0]}, ${ledColors[j][1]}, ${ledColors[j][2]}, 0.8)`;
        p5.circle(ledX, slotY + 6, 4);
      }
    }
  }
  
  // Label
  p5.noStroke();
  p5.fill(168, 85, 247, 220);
  p5.textAlign(p5.CENTER, p5.CENTER);
  p5.textSize(10);
  p5.textFont('monospace');
  (p5.drawingContext as any).shadowBlur = 8;
  (p5.drawingContext as any).shadowColor = 'rgba(168, 85, 247, 0.6)';
  p5.text('EXPRESS API', x, y + 50);
  
  p5.pop();
}

// Function to draw AI Brain (Neural Network with Aura - NO CARD)
function drawAIBrain(p5: any, x: number, y: number, neurons: Neuron[], frameCount: number) {
  const size = 60;
  
  p5.push();
  
  // Pulsating aura (breathing effect)
  const pulseSize = 80 + p5.sin(frameCount * 0.05) * 15;
  const pulseAlpha = 30 + p5.sin(frameCount * 0.05) * 20;
  
  // Outer aura
  p5.noStroke();
  p5.fill(34, 197, 94, pulseAlpha * 0.3);
  (p5.drawingContext as any).shadowBlur = 40;
  (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.6)';
  p5.circle(x, y, pulseSize * 1.5);
  
  // Middle aura
  p5.fill(34, 197, 94, pulseAlpha * 0.5);
  (p5.drawingContext as any).shadowBlur = 30;
  p5.circle(x, y, pulseSize);
  
  // Inner aura
  p5.fill(34, 197, 94, pulseAlpha);
  (p5.drawingContext as any).shadowBlur = 20;
  p5.circle(x, y, pulseSize * 0.7);
  
  // Update neuron positions (smooth movement)
  neurons.forEach((neuron) => {
    neuron.x += neuron.vx;
    neuron.y += neuron.vy;
    
    // Keep within bounds - reverse velocity and clamp position
    if (neuron.x < x - size) {
      neuron.vx *= -1;
      neuron.x = x - size;
    } else if (neuron.x > x + size) {
      neuron.vx *= -1;
      neuron.x = x + size;
    }
    
    if (neuron.y < y - size) {
      neuron.vy *= -1;
      neuron.y = y - size;
    } else if (neuron.y > y + size) {
      neuron.vy *= -1;
      neuron.y = y + size;
    }
  });
  
  // Draw connections
  p5.stroke(34, 197, 94, 120);
  p5.strokeWeight(1.5);
  (p5.drawingContext as any).shadowBlur = 8;
  (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.5)';
  
  for (let i = 0; i < neurons.length; i++) {
    for (let j = i + 1; j < neurons.length; j++) {
      const dist = Math.sqrt((neurons[i].x - neurons[j].x) ** 2 + (neurons[i].y - neurons[j].y) ** 2);
      if (dist < 70) {
        p5.line(neurons[i].x, neurons[i].y, neurons[j].x, neurons[j].y);
      }
    }
  }
  
  // Draw neurons
  neurons.forEach((neuron) => {
    p5.noStroke();
    p5.fill(34, 197, 94, 220);
    (p5.drawingContext as any).shadowBlur = 15;
    (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.9)';
    p5.circle(neuron.x, neuron.y, 8);
    
    // Core
    p5.fill(134, 239, 172, 255);
    (p5.drawingContext as any).shadowBlur = 10;
    p5.circle(neuron.x, neuron.y, 4);
  });
  
  // Label
  p5.noStroke();
  p5.fill(34, 197, 94, 220);
  p5.textAlign(p5.CENTER, p5.CENTER);
  p5.textSize(11);
  p5.textFont('monospace');
  (p5.drawingContext as any).shadowBlur = 10;
  (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.8)';
  p5.text('AI BRAIN', x, y + 80);
  
  p5.pop();
}

// Function to draw AS/400 Terminal (CRT Screen)
function drawAS400Terminal(p5: any, x: number, y: number, frameCount: number) {
  p5.push();
  
  const termW = 90;
  const termH = 70;
  
  // Terminal frame (beige/orange)
  p5.fill(249, 115, 22, 40);
  p5.stroke(249, 115, 22, 200);
  p5.strokeWeight(4);
  (p5.drawingContext as any).shadowBlur = 20;
  (p5.drawingContext as any).shadowColor = 'rgba(249, 115, 22, 0.6)';
  p5.rect(x - termW/2, y - termH/2, termW, termH, 8);
  
  // CRT Screen (curved, green phosphor)
  p5.fill(0, 20, 0, 200);
  p5.stroke(34, 197, 94, 150);
  p5.strokeWeight(2);
  p5.rect(x - termW/2 + 6, y - termH/2 + 6, termW - 12, termH - 20, 5);
  
  // Screen glow
  (p5.drawingContext as any).shadowBlur = 25;
  (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.5)';
  p5.fill(34, 197, 94, 20);
  p5.noStroke();
  p5.rect(x - termW/2 + 8, y - termH/2 + 8, termW - 16, termH - 24, 4);
  
  // Terminal text (scrolling effect)
  p5.fill(34, 197, 94, 200);
  p5.textAlign(p5.LEFT, p5.TOP);
  p5.textSize(6);
  p5.textFont('monospace');
  (p5.drawingContext as any).shadowBlur = 5;
  (p5.drawingContext as any).shadowColor = 'rgba(34, 197, 94, 0.8)';
  
  const lines = ['> CLAIMS DB', '> READY', '> INSERT OK', '> _'];
  const scrollOffset = Math.floor(frameCount * 0.05) % 4;
  for (let i = 0; i < 4; i++) {
    const lineIndex = (i + scrollOffset) % lines.length;
    p5.text(lines[lineIndex], x - termW/2 + 12, y - termH/2 + 12 + i * 8);
  }
  
  // Scanlines effect
  p5.stroke(0, 255, 0, 15);
  p5.strokeWeight(1);
  for (let i = 0; i < termH - 24; i += 2) {
    p5.line(x - termW/2 + 8, y - termH/2 + 8 + i, x + termW/2 - 8, y - termH/2 + 8 + i);
  }
  
  // Label
  p5.noStroke();
  p5.fill(249, 115, 22, 220);
  p5.textAlign(p5.CENTER, p5.CENTER);
  p5.textSize(10);
  p5.textFont('monospace');
  (p5.drawingContext as any).shadowBlur = 8;
  (p5.drawingContext as any).shadowColor = 'rgba(249, 115, 22, 0.6)';
  p5.text('AS/400 + DB', x, y + 50);
  
  p5.pop();
}

// Function to draw node (dispatcher to specialized functions)
function drawNode(p5: any, node: Node, shockwaveRadius: number, neurons?: Neuron[], frameCount?: number) {
  const { x, y, label } = node;
  
  // Dispatch to specialized drawing function based on label
  if (label === 'Dashboard') {
    drawDashboard(p5, x, y, frameCount || 0);
  } else if (label === 'Express API') {
    drawServerRack(p5, x, y, frameCount || 0);
  } else if (label === 'AI Brain' && neurons) {
    drawAIBrain(p5, x, y, neurons, frameCount || 0);
  } else if (label === 'AS/400 + DB') {
    drawAS400Terminal(p5, x, y, frameCount || 0);
  }
}

/**
 * StepIndicator Component - CRT Monitor Style
 * Displays individual agent step as a mini CRT screen
 */
interface StepIndicatorProps {
  step: AgentStep;
  isHovered: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ step, isHovered }) => {
  // Get color based on step name (matching component colors)
  const getStepColor = () => {
    switch (step.name) {
      case 'EXTRACT':
        return { main: '#06B6D4', glow: 'rgba(6, 182, 212, 0.5)', led: 'bg-cyan-400', shadow: 'shadow-cyan-400/50' }; // Cyan - Dashboard
      case 'PARSE':
        return { main: '#A855F7', glow: 'rgba(168, 85, 247, 0.5)', led: 'bg-purple-400', shadow: 'shadow-purple-400/50' }; // Purple - Express API
      case 'VALIDATE':
      case 'DECISION':
        return { main: '#22C55E', glow: 'rgba(34, 197, 94, 0.5)', led: 'bg-green-400', shadow: 'shadow-green-400/50' }; // Green - AI Brain
      case 'SUBMIT':
        return { main: '#F97316', glow: 'rgba(249, 115, 22, 0.5)', led: 'bg-orange-400', shadow: 'shadow-orange-400/50' }; // Orange - AS/400
      default:
        return { main: '#06B6D4', glow: 'rgba(6, 182, 212, 0.5)', led: 'bg-cyan-400', shadow: 'shadow-cyan-400/50' };
    }
  };
  
  const colors = getStepColor();
  
  // Get status badge icon based on step status
  const getStatusBadge = () => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="w-3 h-3" style={{ color: colors.main }} />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'skipped':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'running':
        return null; // Running state uses pulse animation instead
      case 'pending':
        return null; // Pending state has no badge
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={`
        relative
        ${isHovered ? 'scale-110' : 'scale-100'}
        transition-all duration-300 ease-in-out
      `}
      style={{
        filter: isHovered ? `drop-shadow(0 0 20px ${colors.glow})` : `drop-shadow(0 0 10px ${colors.glow})`
      }}
    >
      {/* CRT Monitor Frame */}
      <div 
        className="relative bg-black border-2 px-4 py-3 min-w-[220px]"
        style={{
          borderColor: colors.main,
          boxShadow: `0 0 15px ${colors.glow}, inset 0 0 10px rgba(0, 0, 0, 0.8)`
        }}
      >
        {/* Scanlines effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)'
          }}
        />
        
        {/* LED Indicator */}
        <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${colors.led} ${colors.shadow} ${step.status === 'running' ? 'animate-pulse' : ''}`} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header with icon and title */}
          <div className="flex items-center gap-2 mb-2">
            <div style={{ color: colors.main }}>
              {step.icon}
            </div>
            <span 
              className="font-mono text-sm font-bold tracking-wider"
              style={{ color: colors.main }}
            >
              {step.name}
            </span>
            {getStatusBadge()}
          </div>
          
          {/* Description */}
          <p 
            className="text-xs font-mono leading-relaxed mb-1"
            style={{ color: colors.main, opacity: 0.9 }}
          >
            {step.description}
          </p>
          
          {/* Duration */}
          {step.duration !== undefined && (
            <div className="flex items-center gap-1 text-xs font-mono" style={{ color: colors.main, opacity: 0.7 }}>
              <span>⚡</span>
              <span>~{step.duration}ms</span>
            </div>
          )}
        </div>
        
        {/* CRT Glow effect on hover */}
        {isHovered && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`,
              opacity: 0.3
            }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Helper function to determine the status of the SUBMIT step based on claim data
 */
function getSubmitStatus(claim: ProcessedClaim): AgentStep['status'] {
  // If decision is INVESTIGATE or INVALID_DATA, the submit step is skipped
  if (claim.decision === 'INVESTIGATE' || claim.decision === 'INVALID_DATA') {
    return 'skipped';
  }
  // If status indicates submission failed, mark as error
  if (claim.status === 'SUBMIT_FAILED') {
    return 'error';
  }
  // Otherwise, submission was successful
  return 'success';
}

/**
 * Helper function to generate dynamic description for the SUBMIT step
 */
function getSubmitDescription(claim: ProcessedClaim): string {
  if (claim.decision === 'INVESTIGATE' || claim.decision === 'INVALID_DATA') {
    return `Skipped: ${claim.decision}`;
  }
  if (claim.status === 'SUBMIT_FAILED') {
    return 'Submission failed';
  }
  return 'Submitted to AS/400';
}

export const UnifiedSystemView: React.FC<UnifiedSystemViewProps> = ({ lastClaim }) => {
  const nodesRef = useRef<Node[]>([]);
  const dataPacketRef = useRef<DataPacket | null>(null);
  const shockwaveRef = useRef<Shockwave | null>(null);
  const neuronsRef = useRef<Neuron[]>([]);
  const backgroundParticlesRef = useRef<BackgroundParticle[]>([]);
  const electricBoltsRef = useRef<ElectricBolt[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [hoveredComponentIndex, setHoveredComponentIndex] = useState<number | null>(null);
  
  // Memoize setup to prevent recreation on each render
  const setup = useCallback((p5: any, canvasParentRef: Element) => {
    // Prevent duplicate canvas creation - check if canvas already exists
    const existingCanvas = document.querySelector('#unified-system-canvas');
    if (existingCanvas) {
      console.warn('Canvas already exists, skipping creation');
      return;
    }
    
    // Clean up ALL existing canvases in the container before creating new one
    const allCanvases = canvasParentRef.querySelectorAll('canvas');
    allCanvases.forEach(canvas => {
      console.log('Removing orphaned canvas from container');
      canvas.remove();
    });
    
    // Create new canvas with unique ID
    const canvas = p5.createCanvas(1200, 500).parent(canvasParentRef);
    canvas.id('unified-system-canvas');
    
    // Define nodes only if they don't exist
    if (nodesRef.current.length === 0) {
      nodesRef.current = [
        { x: 200, y: 250, label: 'Dashboard', color: [6, 182, 212] },
        { x: 450, y: 250, label: 'Express API', color: [168, 85, 247] },
        { x: 750, y: 250, label: 'AI Brain', color: [34, 197, 94], isAI: true },
        { x: 1000, y: 250, label: 'AS/400 + DB', color: [249, 115, 22] }
      ];
    }
    
    // Initialize neurons for AI Brain only if they don't exist
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
    
    // Initialize background particles
    if (backgroundParticlesRef.current.length === 0) {
      for (let i = 0; i < 80; i++) {
        backgroundParticlesRef.current.push({
          x: p5.random(p5.width),
          y: p5.random(p5.height),
          vx: p5.random(-0.2, 0.2),
          vy: p5.random(-0.2, 0.2),
          size: p5.random(1, 3),
          alpha: p5.random(0.3, 1),
          life: p5.random(0.5, 1)
        });
      }
    }
  }, []); // No dependencies, only executes once
  
  // Memoize draw with its dependencies
  const draw = useCallback((p5: any) => {
    // Background - Solid dark base
    p5.background(0, 0, 0);
    
    // Layer 1: Circuit grid (bottom layer)
    drawCircuitGrid(p5, p5.frameCount);
    
    // Layer 2: Background particles (floating sparks)
    drawBackgroundParticles(p5, backgroundParticlesRef.current);
    
    // Layer 4: Electric bolts (random lightning)
    // Spawn new bolt randomly (every 3-5 seconds)
    if (p5.frameCount % 180 === 0 && p5.random() > 0.5) {
      const startX = p5.random(p5.width);
      const startY = p5.random(p5.height);
      const endX = p5.random(p5.width);
      const endY = p5.random(p5.height);
      electricBoltsRef.current.push(createElectricBolt(p5, startX, startY, endX, endY));
    }
    
    // Draw and update all active bolts
    electricBoltsRef.current = electricBoltsRef.current.filter(bolt => {
      if (bolt.active) {
        drawElectricBolt(p5, bolt);
        return true;
      }
      return false;
    });
    
    // Update data packet
    if (dataPacketRef.current && dataPacketRef.current.isActive()) {
      dataPacketRef.current.update();
    }
    
    // Determine which cables are active
    const packetPos = dataPacketRef.current?.getCurrentPosition(p5);
    const activeSegment = packetPos?.segment ?? -1;
    
    // Draw cables
    for (let i = 0; i < nodesRef.current.length - 1; i++) {
      const isActive = activeSegment === i;
      const intensity = isActive ? 2 : 0.3;
      drawCable(p5, nodesRef.current[i], nodesRef.current[i + 1], isActive, intensity, p5.frameCount);
    }
    
    // Draw data packet
    if (dataPacketRef.current) {
      dataPacketRef.current.draw(p5);
    }
    
    // Update and draw shockwave
    const shockwaveRadius = shockwaveRef.current?.radius || 0;
    if (shockwaveRef.current && shockwaveRef.current.isActive()) {
      shockwaveRef.current.update();
      shockwaveRef.current.draw(p5);
    }
    
    // Draw nodes
    nodesRef.current.forEach((node) => {
      drawNode(p5, node, shockwaveRadius, node.isAI ? neuronsRef.current : undefined, p5.frameCount);
    });
    
    // Layer 5: Vignette effect (darkens edges)
    drawVignette(p5);
    
    // Title
    p5.push();
    p5.noStroke();
    p5.fill(6, 182, 212, 220);
    p5.textAlign(p5.LEFT, p5.TOP);
    p5.textSize(22);
    p5.textFont('monospace');
    (p5.drawingContext as any).shadowBlur = 12;
    (p5.drawingContext as any).shadowColor = 'rgba(6, 182, 212, 0.7)';
    p5.text('[ UNIFIED SYSTEM VIEW ]', 30, 30);
    
    // Claim ID display
    if (lastClaim) {
      p5.fill(100, 100, 100);
      p5.textSize(12);
      (p5.drawingContext as any).shadowColor = 'rgba(100, 100, 100, 0.5)';
      p5.text(`> Processing: ${lastClaim.id}`, 30, 62);
    } else {
      p5.fill(100, 100, 100);
      p5.textSize(12);
      (p5.drawingContext as any).shadowColor = 'rgba(100, 100, 100, 0.5)';
      p5.text('> Idle', 30, 62);
    }
    
    p5.pop();
  }, [lastClaim]); // Dependency: only recreates if 'lastClaim' changes
  
  // Transform ProcessedClaim to AgentSteps
  useEffect(() => {
    if (!lastClaim) {
      // Clear steps and ensure no active data packet in idle state
      setSteps([]);
      // Deactivate data packet if it exists
      if (dataPacketRef.current) {
        dataPacketRef.current.active = false;
      }
      // Deactivate shockwave if it exists
      if (shockwaveRef.current) {
        shockwaveRef.current.active = false;
      }
      return;
    }
    
    const totalTime = lastClaim.processingTime;
    // Time distribution helper: calculate time for each step based on percentage
    const t = (percentage: number) => Math.round(totalTime * percentage);
    
    const agentSteps: AgentStep[] = [
      {
        id: 'extract',
        name: 'EXTRACT',
        status: 'success',
        duration: t(0.05), // 5% of total time
        nodeIndex: STEP_NODE_MAPPING['EXTRACT'],
        description: `Received claim ${lastClaim.id}`,
        icon: STEP_ICON_MAPPING['EXTRACT']
      },
      {
        id: 'parse',
        name: 'PARSE',
        status: lastClaim.status === 'ERROR' ? 'error' : 'success',
        duration: t(0.15), // 15% of total time
        nodeIndex: STEP_NODE_MAPPING['PARSE'],
        description: 'Agent orchestration',
        icon: STEP_ICON_MAPPING['QUERY']
      },
      {
        id: 'validate',
        name: 'VALIDATE',
        status: 'success',
        duration: t(0.5), // 50% of total time (AI + Weather API)
        nodeIndex: STEP_NODE_MAPPING['VALIDATE'],
        description: `Risk: ${lastClaim.validationResult.fraudRisk}`,
        icon: STEP_ICON_MAPPING['VALIDATE']
      },
      {
        id: 'decision',
        name: 'DECISION',
        status: 'success',
        duration: t(0.05), // 5% of total time
        nodeIndex: STEP_NODE_MAPPING['DECISION'],
        description: `Decision: ${lastClaim.decision}`,
        icon: STEP_ICON_MAPPING['DECISION']
      },
      {
        id: 'submit',
        name: 'SUBMIT',
        status: getSubmitStatus(lastClaim),
        duration: t(0.25), // 25% of total time (AS/400 + DB)
        nodeIndex: STEP_NODE_MAPPING['SUBMIT'],
        description: getSubmitDescription(lastClaim),
        icon: STEP_ICON_MAPPING['SUBMIT']
      }
    ];
    
    setSteps(agentSteps);
    
    // Trigger data packet animation if not already active
    if (!dataPacketRef.current || !dataPacketRef.current.isActive()) {
      dataPacketRef.current = new DataPacket(nodesRef.current);
    }
    
    // Trigger shockwave effect on successful completion
    if (lastClaim.status !== 'ERROR' && lastClaim.status !== 'SUBMIT_FAILED') {
      const centerX = 600; // Center of canvas
      const centerY = 250;
      shockwaveRef.current = new Shockwave(centerX, centerY);
    }
  }, [lastClaim]);
  
  // Enhanced cleanup on unmount - prevent memory leaks
  useEffect(() => {
    return () => {
      // Remove canvas by ID (primary cleanup method)
      const canvas = document.querySelector('#unified-system-canvas');
      if (canvas) {
        console.log('Cleaning up unified-system-canvas on unmount');
        canvas.remove();
      }
      
      // Fallback: Clean up any orphaned canvases that might have been created
      // This handles edge cases where multiple canvases were created
      const allCanvases = document.querySelectorAll('canvas');
      allCanvases.forEach(c => {
        // Only remove canvases that match our ID or are orphaned
        if (c.id === 'unified-system-canvas') {
          console.log('Removing orphaned canvas with matching ID');
          c.remove();
        }
      });
      
      // Clear all refs to prevent memory leaks
      // This ensures no references to p5.js objects remain
      nodesRef.current = [];
      neuronsRef.current = [];
      dataPacketRef.current = null;
      shockwaveRef.current = null;
      backgroundParticlesRef.current = [];
      electricBoltsRef.current = [];
      
      console.log('UnifiedSystemView cleanup complete - all refs cleared');
    };
  }, []);

  // Get AI Brain thoughts (VALIDATE and DECISION steps only)
  const aiThoughts = steps.filter(step => 
    step.nodeIndex === STEP_NODE_MAPPING['VALIDATE'] || 
    step.nodeIndex === STEP_NODE_MAPPING['DECISION']
  );

  return (
    <div className="relative w-full h-[500px]">
      {/* p5.js Canvas Layer */}
      {/* @ts-ignore: react-p5 types are missing 'remove' property */}
      <Sketch 
        setup={setup} 
        draw={draw} 
      />
      
      {/* Invisible hover areas over components - only render if nodes exist */}
      {nodesRef.current.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {nodesRef.current.map((node, index) => (
            <div
              key={`hover-area-${index}`}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${node.x - 70}px`,
                top: `${node.y - 45}px`,
                width: '140px',
                height: '90px',
                // Debug: uncomment to see hover areas
                // backgroundColor: 'rgba(255, 0, 0, 0.2)',
              }}
              onMouseEnter={() => setHoveredComponentIndex(index)}
              onMouseLeave={() => setHoveredComponentIndex(null)}
            />
          ))}
        </div>
      )}

      {/* React Overlay Layer - Step Indicators (only visible on component hover) */}
      {steps.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {steps.map(step => {
            const isVisible = hoveredComponentIndex === step.nodeIndex;
            
            return (
              <div
                key={step.id}
                className={`absolute transition-opacity duration-300 ${
                  isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                style={getStepPosition(step.nodeIndex, nodesRef.current)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <StepIndicator 
                  step={step} 
                  isHovered={hoveredStep === step.id} 
                />
              </div>
            );
          })}
        </div>
      )}

      {/* AI Brain Thoughts - CRT Monitor Style (only visible on AI Brain hover) */}
      {aiThoughts.length > 0 && (
        <div className={`absolute right-20 top-[100px] space-y-3 pointer-events-none max-w-[240px] transition-opacity duration-300 ${
          hoveredComponentIndex === 2 ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="text-xs font-mono text-green-400 mb-3 flex items-center gap-2 px-2">
            <Brain className="w-4 h-4 animate-pulse" />
            <span className="tracking-wider">[ AI BRAIN THOUGHTS ]</span>
          </div>
          {aiThoughts.map((thought, index) => (
            <div
              key={thought.id}
              className="relative"
              style={{ 
                opacity: 0,
                animation: `thoughtAppear 0.5s ease-out ${index * 0.2}s forwards`
              }}
            >
              {/* CRT Monitor Frame */}
              <div 
                className="relative bg-black border-2 px-3 py-2"
                style={{
                  borderColor: '#22C55E',
                  boxShadow: '0 0 15px rgba(34, 197, 94, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.8)'
                }}
              >
                {/* Scanlines effect */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)'
                  }}
                />
                
                {/* LED Indicator */}
                <div className={`absolute top-2 left-2 w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50 ${thought.status === 'running' ? 'animate-pulse' : ''}`} />
                
                {/* Content */}
                <div className="relative z-10 ml-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-green-400">
                      {thought.icon}
                    </div>
                    <span className="font-mono text-xs font-bold text-green-400 tracking-wider">
                      {thought.name}
                    </span>
                    {thought.status === 'success' && <CheckCircle className="w-3 h-3 text-green-400" />}
                    {thought.status === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
                  </div>
                  
                  {/* Description */}
                  <p className="text-[11px] text-green-400 font-mono leading-relaxed opacity-90">
                    {thought.description}
                  </p>
                  
                  {/* Duration */}
                  {thought.duration !== undefined && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-green-400 opacity-70 mt-1">
                      <span>⚡</span>
                      <span>{thought.duration}ms</span>
                    </div>
                  )}
                </div>
                
                {/* CRT Glow effect */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
                    opacity: 0.3
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Idle State Message - Only shown when no claim data */}
      {!lastClaim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-400 text-lg font-mono">
              Waiting for agent data...
            </p>
            <p className="text-gray-500 text-sm font-mono mt-2">
              System topology visible, no active processing
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes thoughtAppear {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
