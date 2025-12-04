/**
 * Laboratory View - Dr. Frankenstein's Steampunk Computer
 * Computadora victoriana 3D que muestra el estado del sistema
 * Powered by Three.js
 */

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FrankensteinTerminal } from './FrankensteinTerminal';

interface ProcessedClaim {
  id: string;
  processingTime: number;
  decision: string;
  validationResult: {
    fraudRisk: string;
  };
}

interface LaboratoryViewProps {
  lastClaim?: ProcessedClaim;
  isProcessing?: boolean;
  as400Connected?: boolean;
  agentActive?: boolean;
}

// Componente de contenido de la pantalla
interface ScreenContentProps {
  isProcessing: boolean;
  as400Connected: boolean;
  agentActive: boolean;
}

const ScreenContent: React.FC<ScreenContentProps> = ({ isProcessing, as400Connected, agentActive }) => {
  return (
    <div 
      className="bg-black/95 border-2 border-green-500/30 rounded p-3 relative overflow-hidden" 
      style={{ 
        width: '320px',
        boxShadow: '0 0 40px rgba(34, 197, 94, 0.6), inset 0 0 20px rgba(34, 197, 94, 0.2)'
      }}
    >
      {/* Efecto de escaneo CRT */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)',
          animation: 'scan 8s linear infinite'
        }}
      />
      
      <div className="space-y-2 relative z-10">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Frontend */}
          <div className="bg-cyan-950/60 border border-cyan-500/50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-cyan-400 font-mono">FRONTEND</span>
              <div className={`w-1.5 h-1.5 rounded-full ${agentActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            </div>
            <p className="text-sm font-bold text-cyan-300 font-mono">ONLINE</p>
          </div>

          {/* Gateway */}
          <div className="bg-purple-950/60 border border-purple-500/50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-purple-400 font-mono">GATEWAY</span>
              <div className={`w-1.5 h-1.5 rounded-full ${agentActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            </div>
            <p className="text-sm font-bold text-purple-300 font-mono">ACTIVE</p>
          </div>

          {/* AI Brain */}
          <div className="bg-green-950/60 border border-green-500/50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-green-400 font-mono">AI BRAIN</span>
              <div className={`w-1.5 h-1.5 rounded-full ${agentActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            </div>
            <p className="text-sm font-bold text-green-300 font-mono">THINKING</p>
          </div>

          {/* Legacy */}
          <div className="bg-orange-950/60 border border-orange-500/50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-orange-400 font-mono">AS/400</span>
              <div className={`w-1.5 h-1.5 rounded-full ${as400Connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <p className="text-sm font-bold text-orange-300 font-mono">
              {as400Connected ? 'CONNECTED' : 'OFFLINE'}
            </p>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-yellow-950/60 border-2 border-yellow-500 rounded p-2 animate-pulse">
            <p className="text-center text-yellow-300 font-mono font-bold text-xs">
              ⚡ PROCESSING ⚡
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Hélice DNA alrededor de las bobinas
interface DNAHelixProps {
  position: [number, number, number];
  isActive: boolean;
}

const DNAHelix: React.FC<DNAHelixProps> = ({ position, isActive }) => {
  const helixRef = useRef<THREE.Points>(null);
  const particleCount = 200;
  const radius = 0.6;
  const height = 2.5;
  const turns = 3;

  // Crear geometría de hélice DNA
  const helixGeometry = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = (i / particleCount) * Math.PI * 2 * turns;
      const y = (i / particleCount - 0.5) * height;
      const strand = Math.floor(i / (particleCount / 2));
      const phase = strand * Math.PI;
      
      positions[i * 3] = Math.cos(t + phase) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(t + phase) * radius;
      
      // Color cyan brillante
      const color = new THREE.Color(0x00ffff);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  // Animar rotación de la hélice
  useFrame((state) => {
    if (helixRef.current && isActive) {
      helixRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  if (!isActive) return null;

  return (
    <points ref={helixRef} position={position} geometry={helixGeometry}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Componente de Chispas Ocasionales (siempre activas)
interface IdleSparkProps {
  position: [number, number, number];
}

const IdleSparks: React.FC<IdleSparkProps> = ({ position }) => {
  const [sparks, setSparks] = useState<Array<{ 
    id: number; 
    x: number; 
    y: number; 
    z: number; 
    vx: number; 
    vy: number; 
    vz: number;
    life: number;
  }>>([]);
  const sparkIdRef = useRef(0);

  // Generar chispas ocasionales
  useEffect(() => {
    const interval = setInterval(() => {
      // Generar 1-3 chispas aleatorias
      const sparkCount = Math.floor(Math.random() * 3) + 1;
      const newSparks = [];
      
      for (let i = 0; i < sparkCount; i++) {
        newSparks.push({
          id: sparkIdRef.current++,
          x: (Math.random() - 0.5) * 0.2,
          y: 0.8 + Math.random() * 0.2,
          z: (Math.random() - 0.5) * 0.2,
          vx: (Math.random() - 0.5) * 0.02,
          vy: Math.random() * 0.03 + 0.01,
          vz: (Math.random() - 0.5) * 0.02,
          life: 1
        });
      }
      
      setSparks(prev => [...prev, ...newSparks]);
    }, 1500 + Math.random() * 1000); // Entre 1.5 y 2.5 segundos

    return () => clearInterval(interval);
  }, []);

  // Animar chispas
  useFrame(() => {
    setSparks(prev => 
      prev
        .map(spark => ({
          ...spark,
          x: spark.x + spark.vx,
          y: spark.y + spark.vy,
          z: spark.z + spark.vz,
          vy: spark.vy - 0.001, // Gravedad
          life: spark.life - 0.02
        }))
        .filter(spark => spark.life > 0)
    );
  });

  return (
    <group position={position}>
      {sparks.map(spark => (
        <mesh key={spark.id} position={[spark.x, spark.y, spark.z]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={spark.life * 0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

// Componente de Partículas Eléctricas
interface ElectricParticlesProps {
  position: [number, number, number];
  isActive: boolean;
}

const ElectricParticles: React.FC<ElectricParticlesProps> = ({ position, isActive }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 50;

  // Crear geometría de partículas
  const particles = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.03 + 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    
    return { positions, velocities };
  }, []);

  // Animar partículas
  useFrame(() => {
    if (particlesRef.current && isActive) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        // Mover partículas hacia arriba
        positions[i * 3] += particles.velocities[i * 3];
        positions[i * 3 + 1] += particles.velocities[i * 3 + 1];
        positions[i * 3 + 2] += particles.velocities[i * 3 + 2];
        
        // Reset si salen muy arriba
        if (positions[i * 3 + 1] > 2) {
          positions[i * 3] = (Math.random() - 0.5) * 0.3;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!isActive) return null;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00ffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Componente de Anillos de Energía
interface EnergyRingsProps {
  position: [number, number, number];
  isActive: boolean;
}

const EnergyRings: React.FC<EnergyRingsProps> = ({ position, isActive }) => {
  const [rings, setRings] = useState<Array<{ id: number; scale: number; opacity: number }>>([]);
  const ringIdRef = useRef(0);

  // Generar nuevos anillos periódicamente
  useEffect(() => {
    if (!isActive) {
      setRings([]);
      return;
    }

    const interval = setInterval(() => {
      setRings(prev => [...prev, { id: ringIdRef.current++, scale: 0.5, opacity: 1 }]);
    }, 800);

    return () => clearInterval(interval);
  }, [isActive]);

  // Animar anillos
  useFrame(() => {
    setRings(prev => 
      prev
        .map(ring => ({
          ...ring,
          scale: ring.scale + 0.03,
          opacity: ring.opacity - 0.015
        }))
        .filter(ring => ring.opacity > 0)
    );
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {rings.map(ring => (
        <mesh key={ring.id} rotation={[Math.PI / 2, 0, 0]} scale={ring.scale}>
          <torusGeometry args={[1, 0.05, 16, 32]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

// Componente de Bobina de Tesla
interface TeslaCoilProps {
  position: [number, number, number];
  isActive: boolean;
  modelPath: string;
}

const TeslaCoil: React.FC<TeslaCoilProps> = ({ position, isActive, modelPath }) => {
  const coilRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const { scene } = useGLTF(modelPath);

  // Aplicar efecto glow (emisivo) cuando está activa
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material) {
            if (isActive) {
              // Activar glow cyan brillante
              material.emissive = new THREE.Color(0x00ffff);
              material.emissiveIntensity = 0.8;
            } else {
              // Apagar glow
              material.emissive = new THREE.Color(0x000000);
              material.emissiveIntensity = 0;
            }
          }
        }
      });
    }
  }, [scene, isActive]);

  // Efecto de pulso de luz cuando está activa
  useFrame((state) => {
    if (lightRef.current && isActive) {
      const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.5 + 1.5;
      lightRef.current.intensity = pulse;
    }

    // Pulso del glow en los materiales
    if (scene && isActive) {
      const glowPulse = Math.sin(state.clock.elapsedTime * 8) * 0.3 + 0.7;
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material && material.emissive) {
            material.emissiveIntensity = glowPulse;
          }
        }
      });
    }
  });

  return (
    <group ref={coilRef} position={position} scale={1.5}>
      <primitive object={scene.clone()} />
      
      {/* Luz cuando está activa */}
      {isActive && (
        <>
          <pointLight 
            ref={lightRef}
            position={[0, 1, 0]} 
            color="#00ffff" 
            intensity={2} 
            distance={8}
            decay={2}
          />
          {/* Luz adicional para más brillo */}
          <pointLight 
            position={[0, 0.5, 0]} 
            color="#ffffff" 
            intensity={1.5} 
            distance={5}
          />
        </>
      )}
      
      {/* Hélice DNA envolviendo la bobina (solo cuando está activa) */}
      <DNAHelix position={[0, 0.5, 0]} isActive={isActive} />
      
      {/* Chispas ocasionales (siempre activas) */}
      <IdleSparks position={[0, 0, 0]} />
      
      {/* Partículas eléctricas (solo cuando está activa) */}
      <ElectricParticles position={[0, 0, 0]} isActive={isActive} />
      
      {/* Anillos de energía (solo cuando está activa) */}
      <EnergyRings position={[0, 0.5, 0]} isActive={isActive} />
    </group>
  );
};

// Componente del modelo 3D de la computadora
interface ComputerModelProps {
  isProcessing: boolean;
  as400Connected: boolean;
  agentActive: boolean;
  isReanimating: boolean;
}

const ComputerModel: React.FC<ComputerModelProps> = ({ isProcessing, as400Connected, agentActive, isReanimating }) => {
  const modelRef = useRef<THREE.Group>(null);
  
  // Cargar el modelo 3D local
  const { scene } = useGLTF('/model3d/Abandoned_vintage_com_1203160142_texture.glb');

  // Mantener materiales originales del modelo
  useEffect(() => {
    if (scene) {
      // No modificar los materiales, mantener el aspecto original del modelo
      console.log('Modelo 3D cargado correctamente');
    }
  }, [scene]);

  // Animación sutil de rotación
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={modelRef} position={[0, -1, 0]} scale={3}>
      <primitive object={scene} />
      
      {/* Bobina de Tesla Izquierda */}
      <TeslaCoil 
        position={[-1.5, 0, 0]} 
        isActive={isReanimating}
        modelPath="/model3d/Bobina_de_Tesla_vinta_1203174451_texture.glb"
      />
      
      {/* Bobina de Tesla Derecha */}
      <TeslaCoil 
        position={[1.5, 0, 0]} 
        isActive={isReanimating}
        modelPath="/model3d/Bobina_de_Tesla_vinta_1203174914_texture.glb"
      />
    </group>
  );
};

// Componente de controles de cámara animados
interface AnimatedControlsProps {
  isZoomed: boolean;
  controlsRef: React.MutableRefObject<any>;
}

const AnimatedControls: React.FC<AnimatedControlsProps> = ({ isZoomed, controlsRef }) => {
  useFrame((state) => {
    if (!controlsRef.current) return;

    const camera = state.camera;
    const controls = controlsRef.current;

    if (isZoomed) {
      // Posición de zoom (cerca de la pantalla)
      const targetPosition = new THREE.Vector3(-1, 0.5, 2);
      const targetLookAt = new THREE.Vector3(-1, 0.5, 0);

      // Interpolar MUY suavemente (zoom lento y cinematográfico)
      camera.position.lerp(targetPosition, 0.02);
      controls.target.lerp(targetLookAt, 0.02);
    } else {
      // Posición normal (vista general)
      const targetPosition = new THREE.Vector3(0, 1, 8);
      const targetLookAt = new THREE.Vector3(0, 0, 0);

      // Interpolar suavemente
      camera.position.lerp(targetPosition, 0.05);
      controls.target.lerp(targetLookAt, 0.05);
    }

    controls.update();
  });

  return null;
};

// Componente del Skybox del Laboratorio
const LaboratorySkybox = () => {
  const { scene } = useThree();
  
  useEffect(() => {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      '/assets/skybox/px.png', // right
      '/assets/skybox/nx.png', // left
      '/assets/skybox/py.png', // top
      '/assets/skybox/ny.png', // bottom
      '/assets/skybox/pz.png', // front
      '/assets/skybox/nz.png', // back
    ]);
    
    scene.background = texture;
    
    return () => {
      scene.background = null;
    };
  }, [scene]);
  
  return null;
};



// Componente de luces con efectos Frankenstein
const FrankensteinLights = () => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      // Efecto de pulso eléctrico
      lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight ref={lightRef} position={[0, 3, 0]} color="#22c55e" intensity={2} />
      <pointLight position={[-3, 2, 3]} color="#a855f7" intensity={1.5} />
      <pointLight position={[3, 2, -3]} color="#06b6d4" intensity={1.5} />
      <spotLight
        position={[0, 5, 0]}
        angle={0.6}
        penumbra={1}
        intensity={1}
        color="#f97316"
        castShadow
      />
    </>
  );
};

export const LaboratoryView: React.FC<LaboratoryViewProps> = ({
  lastClaim,
  isProcessing = false,
  as400Connected = false,
  agentActive = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isReanimating, setIsReanimating] = useState(false);
  const controlsRef = useRef<any>(null);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-950 overflow-hidden">
      
      {/* Botón RESUCITAR SISTEMA - Estilo Interruptor Industrial */}
      {!isZoomed && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={() => {
              setIsReanimating(true);
              setTimeout(() => {
                setIsZoomed(true);
              }, 100);
              setTimeout(() => {
                setIsReanimating(false);
              }, 3000);
            }}
            className="group relative"
          >
            {/* Marco metálico exterior */}
            <div className="absolute -inset-2 bg-gradient-to-b from-gray-600 to-gray-800 rounded-xl" />
            <div className="absolute -inset-1 bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg" />
            
            {/* Contenedor principal */}
            <div className="relative px-12 py-6 bg-gray-900 rounded-lg border-2 border-gray-600 overflow-hidden">
              
              {/* Líneas de circuito decorativas */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-4 w-px h-full bg-green-500" />
                <div className="absolute top-0 right-4 w-px h-full bg-green-500" />
                <div className="absolute top-4 left-0 w-full h-px bg-green-500" />
                <div className="absolute bottom-4 left-0 w-full h-px bg-green-500" />
              </div>
              
              {/* LED indicadores superiores */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
              </div>
              
              {/* Texto principal */}
              <div className="relative z-10 text-center mt-4">
                <p className="text-2xl font-bold text-green-400 font-mono tracking-widest 
                            group-hover:text-green-300 transition-colors duration-300"
                   style={{ textShadow: '0 0 20px rgba(34, 197, 94, 0.8)' }}>
                  RESUCITAR SISTEMA
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1 group-hover:text-gray-400">
                  REANIMAR AS/400
                </p>
              </div>
              
              {/* Barra de energía inferior */}
              <div className="absolute bottom-2 left-4 right-4 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-600 via-green-400 to-green-600 
                              group-hover:animate-pulse transition-all duration-300"
                     style={{ 
                       width: '100%',
                       boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)'
                     }} />
              </div>
              
              {/* Efecto hover - resplandor */}
              <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/10 
                            transition-all duration-300 rounded-lg" />
            </div>
            
            {/* Tornillos decorativos */}
            <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-gray-600 border border-gray-500 
                          flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-gray-400 rotate-45" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gray-600 border border-gray-500 
                          flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-gray-400 -rotate-45" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-gray-600 border border-gray-500 
                          flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-gray-400 -rotate-45" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-gray-600 border border-gray-500 
                          flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-gray-400 rotate-45" />
            </div>
          </button>
        </div>
      )}



      {/* Botón VOLVER (solo visible cuando está en zoom) */}
      {isZoomed && (
        <div className="absolute top-24 left-6 z-20">
          <button
            onClick={() => setIsZoomed(false)}
            className="px-6 py-3 bg-gray-800/90 hover:bg-gray-700 border-2 border-cyan-500 rounded-lg 
                     shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
            style={{
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
            }}
          >
            <span className="text-xl">←</span>
            <span className="text-white font-mono font-bold">VOLVER AL LABORATORIO</span>
          </button>
        </div>
      )}

      {/* Loader */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-30">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🔬</div>
            <p className="text-cyan-400 font-mono text-xl">Loading Laboratory...</p>
          </div>
        </div>
      )}

      {/* Canvas 3D */}
      <div className="w-full h-full">
        <Canvas
          camera={{ position: [0, 1, 8], fov: 45 }}
          onCreated={() => setIsLoading(false)}
          gl={{ 
            antialias: true, 
            alpha: true,
            outputEncoding: THREE.sRGBEncoding 
          }}
        >
          <LaboratorySkybox />
          <FrankensteinLights />
          
          <React.Suspense fallback={null}>
            <ComputerModel 
              isProcessing={isProcessing}
              as400Connected={as400Connected}
              agentActive={agentActive}
              isReanimating={isReanimating}
            />
          </React.Suspense>

          <OrbitControls
            ref={controlsRef}
            enableDamping
            enableZoom={!isZoomed}
            enablePan={!isZoomed}
            enableRotate={!isZoomed}
            minDistance={5}
            maxDistance={20}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
            target={[0, 0, 0]}
          />

          <AnimatedControls isZoomed={isZoomed} controlsRef={controlsRef} />
        </Canvas>
      </div>



      {/* Vista fullscreen cuando está en zoom - TERMINAL INTERACTIVA */}
      {isZoomed && !isReanimating && (
        <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
          <div className="w-[90%] max-w-5xl h-[70vh] pointer-events-auto">
            <FrankensteinTerminal
              as400Connected={as400Connected}
              agentActive={agentActive}
              isProcessing={isProcessing}
              claimsCount={42}
              fraudCount={3}
            />
          </div>
        </div>
      )}

      {/* Panel inferior con último claim */}
      {lastClaim && !isZoomed && (
        <div className="absolute bottom-6 left-6 right-6 bg-gray-900/90 backdrop-blur border-2 border-green-500/50 rounded-lg p-4 z-20">
          <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2 text-sm">
            📋 ÚLTIMO EXPERIMENTO COMPLETADO
          </h3>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Claim ID:</span>
              <p className="text-white font-mono">{lastClaim.id}</p>
            </div>
            <div>
              <span className="text-gray-400">Decision:</span>
              <p className={`font-bold ${
                lastClaim.decision === 'APPROVE' ? 'text-green-400' :
                lastClaim.decision === 'INVESTIGATE' ? 'text-yellow-400' :
                'text-red-400'
              }`}>{lastClaim.decision}</p>
            </div>
            <div>
              <span className="text-gray-400">Fraud Risk:</span>
              <p className={`font-bold ${
                lastClaim.validationResult.fraudRisk === 'low' ? 'text-green-400' :
                lastClaim.validationResult.fraudRisk === 'medium' ? 'text-yellow-400' :
                'text-red-400'
              }`}>{lastClaim.validationResult.fraudRisk.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-gray-400">Processing Time:</span>
              <p className="text-purple-400 font-mono">{lastClaim.processingTime}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Efectos de partículas flotantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full opacity-50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
            opacity: 0;
          }
        }
        
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
};
