/**
 * FrankenStack Dashboard - Laboratory Full Screen Mode
 * El laboratorio 3D es ahora el componente principal
 * POWERED BY REAL DATA from Agent Motor (Port 4000)
 */

import React, { useState, useEffect } from 'react';
import { LaboratoryView } from './LaboratoryView';

// Imports comentados - componentes ocultos pero disponibles para uso futuro
// import { Server, Brain, Cloud, Activity, CheckCircle, XCircle, Clock, Zap, Database, Mail, CloudRain, X } from 'lucide-react';
// import { SeanceChat } from './SeanceChat';
// import { InjectorView } from './InjectorView';
// import { UnifiedSystemView } from './UnifiedSystemView';
// import { ECGMonitor } from './ECGMonitor';
// import { TabNavigation, TabId } from './TabNavigation';
// import { NecropsyView } from './NecropsyView';

// --- Interfaces ---
interface ProcessedClaim {
  id: string;
  processingTime: number;
  decision: string;
  validationResult: {
    isValid: boolean;
    fraudRisk: 'low' | 'medium' | 'high';
    decision: 'APPROVE' | 'INVESTIGATE' | 'INVALID_DATA' | 'ERROR';
  };
}

interface ApiResponse {
  processedClaims: ProcessedClaim[];
  reportSummary: string;
  totalClaims: number;
  fraudDetected: number;
}

export const FrankenStackDashboard: React.FC = () => {
  // Estados de datos
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  // Estados del sistema
  const [as400Connected, setAs400Connected] = useState(false);
  const [agentActive, setAgentActive] = useState(false);

  // Conexión con el motor
  useEffect(() => {
    const apiUrl = 'http://localhost:4000/api/process-claims';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Error conectando al motor');
        return response.json();
      })
      .then((data: ApiResponse) => {
        setApiData(data);
        setAs400Connected(true);
        setAgentActive(true);
        setIsLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.warn('⚠️ Backend no disponible');
        setError(err.message);
        setAs400Connected(false);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 overflow-hidden">
      {/* Laboratorio 3D - Pantalla Completa */}
      <LaboratoryView 
        lastClaim={apiData?.processedClaims[apiData.processedClaims.length - 1]}
        isProcessing={isLoading}
        as400Connected={as400Connected}
        agentActive={agentActive}
      />
    </div>
  );
};
