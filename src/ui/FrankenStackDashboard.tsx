/**
 * FrankenStack Dashboard
 * Visualizes data flow between AS/400 legacy system, AI agent, and external APIs
 * Now with tabs: Dashboard, Necropsy, and Seance views
 * POWERED BY REAL DATA from Agent Motor (Port 4000)
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Brain, 
  Cloud, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Database, 
  Mail, 
  CloudRain,
  Syringe,
  Cpu
} from 'lucide-react';
import { NecropsyView } from './NecropsyView';
import { SeanceChat } from './SeanceChat';
import { InjectorView } from './InjectorView';
import { SystemTopology } from './SystemTopology';

// --- Interfaces Visuales (Tu diseño original) ---
interface MCPStatus {
  connected: boolean;
  lastCall: string;
  executionTime: number;
  recordsProcessed: number;
  timestamp: Date;
}

interface AgentStatus {
  active: boolean;
  claimsProcessed: number;
  fraudDetected: number;
  avgProcessingTime: number;
}

// --- Interfaces de Datos Reales (Del Motor) ---
interface ValidationResult {
  isValid: boolean;
  fraudRisk: 'low' | 'medium' | 'high';
  decision: 'APPROVE' | 'INVESTIGATE' | 'INVALID_DATA' | 'ERROR';
}

interface ProcessedClaim {
  id: string;
  processingTime: number;
  decision: string;
  validationResult: ValidationResult;
}

interface ApiResponse {
  processedClaims: ProcessedClaim[];
  reportSummary: string;
  totalClaims: number;
  fraudDetected: number;
}

type TabView = 'dashboard' | 'necropsy' | 'seance' | 'inject' | 'topology';

export const FrankenStackDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('topology');
  
  // Estado para cargar los datos reales
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  // Estados visuales (Inicializados vacíos)
  const [as400Status, setAs400Status] = useState<MCPStatus>({
    connected: false,
    lastCall: 'Waiting...',
    executionTime: 0,
    recordsProcessed: 0,
    timestamp: new Date()
  });

  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    active: false,
    claimsProcessed: 0,
    fraudDetected: 0,
    avgProcessingTime: 0
  });

  // --- CONEXIÓN CON EL MOTOR REAL ---
  useEffect(() => {
    const apiUrl = 'http://localhost:4000/api/process-claims'; // URL Correcta (Plural)

    console.log('UI: Conectando al motor...');

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Error conectando al motor');
        return response.json();
      })
      .then((data: ApiResponse) => {
        console.log('UI: Datos reales recibidos', data);
        setApiData(data);
        
        // Calcular tiempo promedio real
        const totalTime = data.processedClaims.reduce((acc, curr) => acc + curr.processingTime, 0);
        const avgTime = data.totalClaims > 0 ? Math.round(totalTime / data.totalClaims) : 0;

        // Actualizar el estado visual del AGENTE con datos reales
        setAgentStatus({
          active: true,
          claimsProcessed: data.totalClaims,
          fraudDetected: data.fraudDetected,
          avgProcessingTime: avgTime
        });

        // Actualizar el estado visual del AS/400 con datos reales
        setAs400Status({
          connected: true,
          lastCall: 'BATCH INSERT',
          executionTime: 1500, // Tiempo promedio simulado del AS/400
          recordsProcessed: data.totalClaims,
          timestamp: new Date()
        });

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('UI: Fallo de conexión', err);
        setError(err.message);
        setAs400Status(prev => ({ ...prev, connected: false, lastCall: 'FAILED' }));
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-500">
          FrankenStack: Legacy Resurrection
        </h1>
        <p className="text-gray-400 text-lg">Bringing AS/400 back from the dead with AI</p>
      </header>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<Server className="w-5 h-5" />}
            label="Dashboard"
          />
          <TabButton
            active={activeTab === 'necropsy'}
            onClick={() => setActiveTab('necropsy')}
            icon={<Activity className="w-5 h-5" />}
            label="Necropsy"
          />
          <TabButton
            active={activeTab === 'seance'}
            onClick={() => setActiveTab('seance')}
            icon={<Brain className="w-5 h-5" />}
            label="Séance"
          />
          <TabButton
            active={activeTab === 'inject'}
            onClick={() => setActiveTab('inject')}
            icon={<Syringe className="w-5 h-5" />}
            label="Inject"
          />
          <TabButton
            active={activeTab === 'topology'}
            onClick={() => setActiveTab('topology')}
            icon={<Cpu className="w-5 h-5" />}
            label="Topology"
          />
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div className="text-center text-yellow-400 animate-pulse mb-4">
          Conectando con el Motor Neural (localhost:4000)...
        </div>
      )}
      {error && (
        <div className="text-center text-red-400 mb-4 bg-red-900/20 p-2 rounded border border-red-800">
          Error: No se pudo conectar al Agente. ¿Está encendido el servidor? ({error})
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardView 
          as400Status={as400Status} 
          agentStatus={agentStatus} 
        />
      )}
      
      {/* Pasamos el último reclamo procesado para hacerle la "autopsia" real */}
      {activeTab === 'necropsy' && (
        <NecropsyView 
          lastClaim={apiData?.processedClaims[apiData.processedClaims.length - 1]} 
        />
      )}
      
      {activeTab === 'seance' && <SeanceChat />}
      
      {activeTab === 'inject' && <InjectorView />}
      
      {activeTab === 'topology' && (
        <SystemTopology 
          state={
            isLoading ? 'processing' : 
            error ? 'error' : 
            apiData ? 'success' : 
            'idle'
          } 
        />
      )}
    </div>
  );
};

/**
 * Dashboard View - Original three column layout
 */
const DashboardView: React.FC<{
  as400Status: MCPStatus;
  agentStatus: AgentStatus;
}> = ({ as400Status, agentStatus }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        
        {/* Column 1: AS/400 Legacy System */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-green-500 shadow-lg shadow-green-500/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-green-400" />
              <h2 className="text-2xl font-bold">AS/400</h2>
            </div>
            {as400Status.connected ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
          </div>

          <div className="space-y-3">
            <StatusItem 
              icon={<Activity className="w-5 h-5" />}
              label="Status"
              value={as400Status.connected ? 'Connected' : 'Disconnected'}
              valueColor={as400Status.connected ? 'text-green-400' : 'text-red-400'}
            />
            <StatusItem 
              icon={<Database className="w-5 h-5" />}
              label="Last Call"
              value={as400Status.lastCall}
            />
            <StatusItem 
              icon={<Clock className="w-5 h-5" />}
              label="Execution Time"
              value={`${as400Status.executionTime}ms`}
            />
            <StatusItem 
              icon={<Zap className="w-5 h-5" />}
              label="Records Processed"
              value={as400Status.recordsProcessed.toString()}
            />
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Last updated: {as400Status.timestamp.toLocaleTimeString()}
          </div>
        </div>

        {/* Column 2: Agent Brain */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-purple-500 shadow-lg shadow-purple-500/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold">Agent Brain</h2>
            </div>
            {agentStatus.active ? (
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
            ) : (
              <div className="w-3 h-3 bg-gray-600 rounded-full" />
            )}
          </div>

          <div className="space-y-3">
            <StatusItem 
              icon={<Activity className="w-5 h-5" />}
              label="Status"
              value={agentStatus.active ? 'Processing' : 'Idle'}
              valueColor={agentStatus.active ? 'text-purple-400' : 'text-gray-400'}
            />
            <StatusItem 
              icon={<CheckCircle className="w-5 h-5" />}
              label="Claims Processed"
              value={agentStatus.claimsProcessed.toString()}
            />
            <StatusItem 
              icon={<XCircle className="w-5 h-5" />}
              label="Fraud Detected"
              value={agentStatus.fraudDetected.toString()}
              valueColor="text-red-400"
            />
            <StatusItem 
              icon={<Clock className="w-5 h-5" />}
              label="Avg Processing"
              value={`${(agentStatus.avgProcessingTime / 1000).toFixed(1)}s`}
              valueColor={agentStatus.avgProcessingTime < 5000 ? 'text-green-400' : 'text-yellow-400'}
            />
          </div>

          <div className="mt-4 p-2 bg-purple-900/30 rounded text-xs text-center">
            Target: &lt;5min per claim
          </div>
        </div>

        {/* Column 3: External APIs */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-500 shadow-lg shadow-blue-500/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Cloud className="w-8 h-8 text-blue-400" />
              <h2 className="text-2xl font-bold">External APIs</h2>
            </div>
            <CheckCircle className="w-6 h-6 text-blue-400" />
          </div>

          <div className="space-y-4">
            <APICard 
              icon={<Mail className="w-6 h-6 text-yellow-400" />}
              name="Gmail API"
              status="Active"
              latency="300ms"
            />
            <APICard 
              icon={<CloudRain className="w-6 h-6 text-cyan-400" />}
              name="NOAA Weather"
              status="Active"
              latency="400ms"
            />
          </div>
        </div>
      </div>

  );
};

/**
 * Tab Button Component
 */
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
      transition-all duration-200
      ${active 
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50' 
        : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Helper component for status items
const StatusItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}> = ({ icon, label, value, valueColor = 'text-white' }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-gray-400">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className={`font-mono text-sm ${valueColor}`}>{value}</span>
  </div>
);

// Helper component for API cards
const APICard: React.FC<{
  icon: React.ReactNode;
  name: string;
  status: string;
  latency: string;
}> = ({ icon, name, status, latency }) => (
  <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-semibold">{name}</span>
    </div>
    <div className="flex justify-between text-xs text-gray-400">
      <span>Status: <span className="text-green-400">{status}</span></span>
      <span>Latency: <span className="text-blue-400">{latency}</span></span>
    </div>
  </div>
);
