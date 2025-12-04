/**
 * NecropsyView Component
 * Visual timeline showing agent execution steps as "organs"
 * POWERED BY REAL DATA
 * 
 * @deprecated This component has been superseded by UnifiedSystemView.
 * UnifiedSystemView combines the agent step timeline from this component
 * with the system topology visualization into a single unified interface.
 * The new component displays step indicators directly on the topology nodes,
 * providing better spatial context for where each operation occurs.
 * 
 * Migration: Replace <NecropsyView lastClaim={claim} /> with <UnifiedSystemView lastClaim={claim} />
 * 
 * This component will be removed in a future version.
 * Last updated: 2025-12-01
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Database,
  Shield,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Zap
} from 'lucide-react';

// Definimos la forma de los datos que vienen del Dashboard
interface ProcessedClaim {
  id: string;
  decision: string;
  validationResult: {
    fraudRisk: string;
  };
  processingTime: number;
  status?: string;
}

interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  duration?: number;
  specFile: string;
  description: string;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  EXTRACT: <Mail className="w-6 h-6" />,
  QUERY: <Database className="w-6 h-6" />,
  VALIDATE: <Shield className="w-6 h-6" />,
  DECISION: <Brain className="w-6 h-6" />,
  SUBMIT: <Zap className="w-6 h-6" />,
  NOTIFY: <FileText className="w-6 h-6" />
};

const STATUS_COLORS = {
  pending: 'bg-gray-600 border-gray-500',
  running: 'bg-blue-600 border-blue-400 animate-pulse',
  success: 'bg-green-600 border-green-400',
  error: 'bg-red-600 border-red-400',
  skipped: 'bg-yellow-600 border-yellow-400'
};

// --- COMPONENTE PRINCIPAL ---
/**
 * @deprecated Use UnifiedSystemView instead. This component will be removed in a future version.
 * @see UnifiedSystemView
 */
export const NecropsyView: React.FC<{ lastClaim?: ProcessedClaim }> = ({ lastClaim }) => {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);

  // Transformamos el Reclamo Real en Pasos Visuales
  useEffect(() => {
    if (!lastClaim) return;

    // Simulamos tiempos parciales basados en el tiempo total real
    // (Ya que el backend nos da el total, lo distribuimos proporcionalmente para la visualización)
    const totalTime = lastClaim.processingTime;
    const t = (pct: number) => Math.round(totalTime * pct);

    const realSteps: AgentStep[] = [
      {
        id: 'extract',
        name: 'EXTRACT',
        status: 'success', // Siempre exitoso si llegamos aquí
        duration: t(0.1),
        specFile: 'src/utils/parser.ts',
        description: `Extracted claim ${lastClaim.id} from email`
      },
      {
        id: 'query',
        name: 'QUERY',
        status: lastClaim.status === 'ERROR' ? 'error' : 'success',
        duration: t(0.3),
        specFile: 'src/mcp/as400-mcp-server.ts',
        description: 'Connection to AS/400 Legacy System'
      },
      {
        id: 'validate',
        name: 'VALIDATE',
        status: 'success',
        duration: t(0.4), // La IA toma más tiempo
        specFile: 'src/utils/validator.ts',
        description: `AI Analysis: Risk is ${lastClaim.validationResult.fraudRisk.toUpperCase()}`
      },
      {
        id: 'decision',
        name: 'DECISION',
        status: 'success',
        duration: t(0.05),
        specFile: 'src/agents/claim-revenant-agent.ts',
        description: `Agent decided to ${lastClaim.decision}`
      },
      {
        id: 'submit',
        name: 'SUBMIT',
        // Aquí está la lógica real: Si es INVESTIGATE, se salta. Si falla el envío, es error.
        status: lastClaim.decision === 'INVESTIGATE' || lastClaim.decision === 'INVALID_DATA' 
                ? 'skipped' 
                : lastClaim.status === 'SUBMIT_FAILED' ? 'error' : 'success',
        duration: t(0.15),
        specFile: 'src/mcp/as400-mcp-server.ts',
        description: lastClaim.decision === 'APPROVE' 
                     ? 'Injecting SQL into AS/400 DB2' 
                     : 'Submission skipped due to risk flag'
      }
    ];

    setSteps(realSteps);
  }, [lastClaim]);

  if (!lastClaim) {
    return (
      <div className="text-center p-10 text-gray-400">
        <p>Waiting for live data from the Agent...</p>
        <p className="text-sm mt-2">Check if the server is running.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          🧟 Agent Necropsy View
        </h1>
        <p className="text-gray-400">
          Dissecting execution flow for <span className="text-white font-mono">{lastClaim.id}</span>
        </p>
      </header>

      {/* Timeline Container */}
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-purple-500 via-pink-500 to-purple-500 opacity-30" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="relative"
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div className={`
                  flex items-center justify-center gap-8
                  ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}
                `}>
                  <div className={`
                    flex-1 
                    ${index % 2 === 0 ? 'text-right' : 'text-left'}
                  `}>
                    <div className="inline-block">
                      <h3 className="text-xl font-bold mb-1">{step.name}</h3>
                      <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                      {step.duration && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>~{step.duration}ms</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className={`
                      w-20 h-20 rounded-full border-4 
                      flex items-center justify-center
                      transition-all duration-300 transform
                      ${STATUS_COLORS[step.status]}
                      ${hoveredStep === step.id ? 'scale-125 shadow-2xl' : 'scale-100'}
                    `}>
                      <div className="text-white">
                        {STEP_ICONS[step.name]}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      {step.status === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {step.status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                      {step.status === 'skipped' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                    </div>
                  </div>
                  <div className="flex-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};