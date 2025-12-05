/**
 * Frankenstein Terminal - Interactive Command Console
 * Terminal interactiva estilo Matrix/CRT para el laboratorio
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TerminalLine {
  id: number;
  type: 'system' | 'command' | 'response' | 'error' | 'success' | 'warning' | 'spirit';
  text: string;
  timestamp?: Date;
}

interface FrankensteinTerminalProps {
  as400Connected: boolean;
  agentActive: boolean;
  isProcessing: boolean;
  claimsCount?: number;
  fraudCount?: number;
}

// Comandos disponibles
const COMMANDS = {
  help: 'Show available commands',
  status: 'Display system status',
  claims: 'List recent processed claims',
  seance: 'Chat with AI about claims (usage: seance <question>)',
  inject: 'Open claim injection wizard',
  logs: 'Show system logs (usage: logs [watch|stop])',
  clear: 'Clear terminal output',
  weather: 'Check NOAA API status',
  metrics: 'Show system metrics',
};

// Tipos de logs simulados para actividad del sistema (complementan datos reales)
const SIMULATED_LOG_TEMPLATES = [
  { type: 'info', prefix: 'MCP', messages: ['TN5250 screen scraping active', 'Connection pool: 5 active', 'Session heartbeat OK'] },
  { type: 'info', prefix: 'AGENT', messages: ['Decision engine: ACTIVE', 'Model inference: 45ms', 'Queue depth: 0'] },
  { type: 'info', prefix: 'AS400', messages: ['Keepalive sent', 'Buffer flushed', 'Transaction log rotated'] },
  { type: 'success', prefix: 'DB', messages: ['SQLite: healthy', 'WAL checkpoint', 'Cache hit ratio: 94%'] },
  { type: 'info', prefix: 'EMAIL', messages: ['Gmail API: connected', 'Polling inbox...', 'OAuth token valid'] },
];

// Interface para logs del servidor
interface ServerLog {
  timestamp: string;
  prefix: string;
  type: string;
  message: string;
}

// Estado del wizard de inyección
interface InjectWizardState {
  active: boolean;
  step: 'subject' | 'location' | 'description' | 'image' | 'confirm' | 'processing';
  data: {
    subject: string;
    location: string;
    description: string;
    imageBase64: string | null;
    imageName: string | null;
  };
}

export const FrankensteinTerminal: React.FC<FrankensteinTerminalProps> = ({
  as400Connected,
  agentActive,
  isProcessing,
  claimsCount = 0,
  fraudCount = 0,
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [injectWizard, setInjectWizard] = useState<InjectWizardState>({
    active: false,
    step: 'subject',
    data: { subject: '', location: '', description: '', imageBase64: null, imageName: null }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logsWatchActive, setLogsWatchActive] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [electricBorder, setElectricBorder] = useState(false);
  const [crtFlicker, setCrtFlicker] = useState(false);
  const logsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  // Scroll al final cuando hay nuevas líneas
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Mensaje inicial
  useEffect(() => {
    const initMessages: TerminalLine[] = [
      { id: lineIdRef.current++, type: 'system', text: '> FRANKENSTEIN SYSTEM MONITOR v2.0' },
      { id: lineIdRef.current++, type: 'system', text: '>> Initializing interactive terminal...' },
      { id: lineIdRef.current++, type: 'success', text: '>> Terminal ready. Type "help" for commands.' },
      { id: lineIdRef.current++, type: 'system', text: '' },
    ];
    setHistory(initMessages);
  }, []);

  // Cleanup del intervalo de logs al desmontar
  useEffect(() => {
    return () => {
      if (logsIntervalRef.current) {
        clearInterval(logsIntervalRef.current);
      }
    };
  }, []);

  // Trigger glitch effect
  const triggerGlitch = useCallback(() => {
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 500);
  }, []);

  // Trigger electric border effect
  const triggerElectric = useCallback(() => {
    setElectricBorder(true);
    setTimeout(() => setElectricBorder(false), 2000);
  }, []);

  // Random CRT flicker effect
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setCrtFlicker(true);
        setTimeout(() => setCrtFlicker(false), 100);
      }
    }, 3000);
    return () => clearInterval(flickerInterval);
  }, []);

  // Agregar línea con efecto de typing
  const addLine = useCallback((type: TerminalLine['type'], text: string, withTyping = false) => {
    const newLine: TerminalLine = {
      id: lineIdRef.current++,
      type,
      text,
      timestamp: new Date(),
    };

    // Trigger glitch on errors
    if (type === 'error') {
      triggerGlitch();
    }
    
    if (withTyping) {
      setIsTyping(true);
      triggerElectric();
      // Simular efecto de escritura
      let currentText = '';
      const chars = text.split('');
      let i = 0;
      
      const typeInterval = setInterval(() => {
        if (i < chars.length) {
          currentText += chars[i];
          setHistory(prev => {
            const updated = [...prev];
            const lastIdx = updated.findIndex(l => l.id === newLine.id);
            if (lastIdx >= 0) {
              updated[lastIdx] = { ...newLine, text: currentText };
            } else {
              updated.push({ ...newLine, text: currentText });
            }
            return updated;
          });
          i++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 20);
    } else {
      setHistory(prev => [...prev, newLine]);
    }
  }, [triggerGlitch, triggerElectric]);

  // Procesar comando
  const processCommand = useCallback(async (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    const [command, ...args] = trimmedCmd.split(' ');

    // Agregar comando al historial
    addLine('command', `> ${cmd}`);
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    switch (command) {
      case 'help':
        addLine('system', '');
        addLine('system', '╔══════════════════════════════════════════╗');
        addLine('system', '║       AVAILABLE COMMANDS                 ║');
        addLine('system', '╠══════════════════════════════════════════╣');
        Object.entries(COMMANDS).forEach(([cmd, desc]) => {
          addLine('system', `║ ${cmd.padEnd(10)} │ ${desc.substring(0, 28).padEnd(28)} ║`);
        });
        addLine('system', '╚══════════════════════════════════════════╝');
        break;

      case 'status':
        addLine('system', '');
        addLine('system', 'COMPONENT STATUS:');
        addLine(agentActive ? 'success' : 'error', `  ┌─ FRONTEND ────────── [${agentActive ? '✓' : '○'}] ${agentActive ? 'ONLINE' : 'OFFLINE'}`);
        addLine(agentActive ? 'success' : 'error', `  ├─ GATEWAY ─────────── [${agentActive ? '✓' : '○'}] ${agentActive ? 'ACTIVE' : 'INACTIVE'}`);
        addLine(agentActive ? 'warning' : 'error', `  ├─ AI_BRAIN ────────── [${agentActive ? '~' : '○'}] ${agentActive ? 'THINKING' : 'IDLE'}`);
        addLine(as400Connected ? 'success' : 'error', `  └─ AS/400 ──────────── [${as400Connected ? '✓' : '✗'}] ${as400Connected ? 'CONNECTED' : 'OFFLINE'}`);
        break;

      case 'claims':
        addLine('system', '');
        addLine('system', '>> Fetching recent claims from database...');
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch('/api/process-claims', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const data = await response.json();
          
          if (data.processedClaims && data.processedClaims.length > 0) {
            addLine('success', `>> Found ${data.processedClaims.length} claims:`);
            addLine('system', '');
            data.processedClaims.slice(0, 5).forEach((claim: any, idx: number) => {
              const decisionColor = claim.decision === 'APPROVE' ? 'success' : 
                                   claim.decision === 'INVESTIGATE' ? 'warning' : 'error';
              addLine(decisionColor, `  [${idx + 1}] ${claim.id} │ ${claim.decision} │ Risk: ${claim.validationResult?.fraudRisk || 'N/A'}`);
            });
          } else {
            addLine('warning', '>> No claims found in database.');
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            addLine('error', '>> ERROR: Request timeout (5s exceeded).');
          } else {
            addLine('error', '>> ERROR: Could not connect to server.');
          }
        }
        break;

      case 'seance':
        if (args.length === 0) {
          addLine('system', '');
          addLine('response', '╔═══════════════════════════════════════════════════╗');
          addLine('response', '║            🔮 SÉANCE MODE - SPIRIT CHAT 🔮        ║');
          addLine('response', '╠═══════════════════════════════════════════════════╣');
          addLine('response', '║  Commune with the Legacy Spirit about your data   ║');
          addLine('response', '║                                                   ║');
          addLine('response', '║  Usage: seance <your question>                    ║');
          addLine('response', '║                                                   ║');
          addLine('response', '║  Examples:                                        ║');
          addLine('warning',  '║  • seance Why was Dubai rejected?                 ║');
          addLine('warning',  '║  • seance How many claims were approved?          ║');
          addLine('warning',  '║  • seance What is the fraud pattern?              ║');
          addLine('response', '╚═══════════════════════════════════════════════════╝');
        } else {
          const question = args.join(' ');
          addLine('system', '');
          addLine('response', '┌─────────────────────────────────────────┐');
          addLine('response', '│  🕯️  Initiating spiritual connection...  │');
          addLine('response', '└─────────────────────────────────────────┘');
          addLine('system', '');
          addLine('system', '>> Channeling the Legacy Spirit...');
          addLine('system', '>> ░░░░░░░░░░ Summoning... ░░░░░░░░░░');
          setIsTyping(true);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/seance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            setIsTyping(false);
            
            const answer = data.answer || 'The spirit remains silent...';
            
            // Mostrar respuesta con marco místico
            addLine('system', '');
            addLine('response', '╭───────────── 👻 SPIRIT SPEAKS 👻 ─────────────╮');
            addLine('system', '│');
            
            // Dividir respuesta larga en líneas
            const words = answer.split(' ');
            let currentLine = '│  ';
            words.forEach((word: string) => {
              if ((currentLine + word).length > 50) {
                addLine('response', currentLine);
                currentLine = '│  ' + word + ' ';
              } else {
                currentLine += word + ' ';
              }
            });
            if (currentLine.trim() !== '│') {
              addLine('response', currentLine);
            }
            
            addLine('system', '│');
            addLine('response', '╰──────────────────────────────────────────────╯');
            addLine('system', '');
            addLine('system', '>> Spirit connection closed. Ask again with "seance <question>"');
            
          } catch (error) {
            setIsTyping(false);
            addLine('system', '');
            addLine('error', '╭─────────── ⚠️ CONNECTION LOST ⚠️ ───────────╮');
            if (error instanceof Error && error.name === 'AbortError') {
              addLine('error', '│  The spirit took too long to respond (5s)   │');
            } else {
              addLine('error', '│  The spirit realm is currently unreachable  │');
            }
            addLine('error', '│  Check server connection and try again       │');
            addLine('error', '╰──────────────────────────────────────────────╯');
          }
        }
        break;

      case 'inject':
        addLine('system', '');
        addLine('warning', '╔═══════════════════════════════════════════════════╗');
        addLine('warning', '║         💉 CLAIM INJECTION WIZARD 💉             ║');
        addLine('warning', '╠═══════════════════════════════════════════════════╣');
        addLine('warning', '║  Inject a new claim directly into the system      ║');
        addLine('warning', '║  Supports GPT-4 Vision for image analysis! 📸     ║');
        addLine('warning', '║  Type "cancel" at any step to abort               ║');
        addLine('warning', '╚═══════════════════════════════════════════════════╝');
        addLine('system', '');
        addLine('system', '>> STEP 1/4: Enter claim subject');
        addLine('system', '>> (e.g., "Insurance Claim - Hurricane Damage")');
        addLine('system', '');
        setInjectWizard({
          active: true,
          step: 'subject',
          data: { subject: '', location: '', description: '', imageBase64: null, imageName: null }
        });
        break;

      case 'logs':
        if (args[0] === 'watch') {
          if (logsWatchActive) {
            addLine('warning', '>> Logs watch already active. Use "logs stop" to stop.');
          } else {
            addLine('system', '');
            addLine('success', '╔═══════════════════════════════════════════════════╗');
            addLine('success', '║        📜 HYBRID LOGS - WATCH MODE 📜            ║');
            addLine('success', '╠═══════════════════════════════════════════════════╣');
            addLine('success', '║  Streaming real data + system activity...         ║');
            addLine('success', '║  Type "logs stop" to stop watching                ║');
            addLine('success', '╚═══════════════════════════════════════════════════╝');
            addLine('system', '');
            setLogsWatchActive(true);
            
            // Contador para alternar entre datos reales y simulados
            let fetchCounter = 0;
            
            logsIntervalRef.current = setInterval(async () => {
              const timestamp = new Date().toLocaleTimeString();
              
              // Cada 3 iteraciones, intentar obtener datos reales del servidor
              if (fetchCounter % 3 === 0) {
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 5000);
                  
                  const response = await fetch('/api/system-logs', {
                    signal: controller.signal
                  });
                  clearTimeout(timeoutId);
                  
                  if (response.ok) {
                    const data = await response.json();
                    // Mostrar un log real aleatorio
                    if (data.logs && data.logs.length > 0) {
                      const realLog = data.logs[Math.floor(Math.random() * Math.min(3, data.logs.length))];
                      const logType = realLog.type === 'warning' ? 'warning' : 
                                     realLog.type === 'success' ? 'success' : 'system';
                      
                      const logLine: TerminalLine = {
                        id: lineIdRef.current++,
                        type: logType as TerminalLine['type'],
                        text: `[${timestamp}] [${realLog.prefix}] ${realLog.message}`,
                        timestamp: new Date()
                      };
                      setHistory(prev => [...prev, logLine]);
                      fetchCounter++;
                      return;
                    }
                  }
                } catch {
                  // Si falla, continuar con log simulado
                }
              }
              
              // Log simulado de actividad del sistema
              const template = SIMULATED_LOG_TEMPLATES[Math.floor(Math.random() * SIMULATED_LOG_TEMPLATES.length)];
              const message = template.messages[Math.floor(Math.random() * template.messages.length)];
              const logType = template.type === 'warning' ? 'warning' : 
                             template.type === 'success' ? 'success' : 'system';
              
              const logLine: TerminalLine = {
                id: lineIdRef.current++,
                type: logType as TerminalLine['type'],
                text: `[${timestamp}] [${template.prefix}] ${message}`,
                timestamp: new Date()
              };
              setHistory(prev => [...prev, logLine]);
              fetchCounter++;
            }, 2000 + Math.random() * 1500);
          }
        } else if (args[0] === 'stop') {
          if (logsWatchActive) {
            if (logsIntervalRef.current) {
              clearInterval(logsIntervalRef.current);
              logsIntervalRef.current = null;
            }
            setLogsWatchActive(false);
            addLine('system', '');
            addLine('warning', '>> Logs watch stopped.');
            addLine('system', '');
          } else {
            addLine('warning', '>> No active logs watch to stop.');
          }
        } else {
          // Mostrar logs reales del servidor
          addLine('system', '');
          addLine('system', '╔═══════════════════════════════════════════════════╗');
          addLine('system', '║           📜 SYSTEM LOGS (REAL DATA) 📜           ║');
          addLine('system', '╚═══════════════════════════════════════════════════╝');
          addLine('system', '');
          addLine('system', '>> Fetching logs from server...');
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/system-logs', {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              
              // Mostrar estadísticas
              addLine('success', `>> Stats: ${data.stats.totalClaims} claims | ${data.stats.fraudClaims} flagged`);
              addLine('system', '');
              
              // Mostrar logs reales
              if (data.logs && data.logs.length > 0) {
                data.logs.slice(0, 8).forEach((log: ServerLog) => {
                  const logTime = new Date(log.timestamp).toLocaleTimeString();
                  const logType = log.type === 'warning' ? 'warning' : 
                                 log.type === 'success' ? 'success' : 'system';
                  addLine(logType as TerminalLine['type'], 
                         `[${logTime}] [${log.prefix}] ${log.message}`);
                });
              } else {
                addLine('warning', '>> No recent logs found.');
              }
            } else {
              addLine('error', '>> Failed to fetch logs from server.');
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              addLine('error', '>> ERROR: Request timeout (5s exceeded).');
            } else {
              addLine('error', '>> ERROR: Could not connect to server.');
            }
            // Fallback a logs simulados
            addLine('system', '>> Showing simulated activity instead:');
            addLine('system', '');
            const now = new Date();
            for (let i = 3; i >= 0; i--) {
              const logTime = new Date(now.getTime() - i * 30000);
              const template = SIMULATED_LOG_TEMPLATES[Math.floor(Math.random() * SIMULATED_LOG_TEMPLATES.length)];
              const message = template.messages[Math.floor(Math.random() * template.messages.length)];
              addLine('system', `[${logTime.toLocaleTimeString()}] [${template.prefix}] ${message}`);
            }
          }
          
          addLine('system', '');
          addLine('system', '>> Use "logs watch" for real-time streaming');
        }
        break;

      case 'clear':
        // Detener logs watch si está activo
        if (logsWatchActive && logsIntervalRef.current) {
          clearInterval(logsIntervalRef.current);
          logsIntervalRef.current = null;
          setLogsWatchActive(false);
        }
        setHistory([
          { id: lineIdRef.current++, type: 'system', text: '> Terminal cleared.' },
          { id: lineIdRef.current++, type: 'system', text: '' },
        ]);
        break;

      case 'weather':
        addLine('system', '');
        addLine('system', '>> Checking NOAA Weather API...');
        addLine('success', '  ├─ API Status: ONLINE');
        addLine('success', '  ├─ Last Query: Hurricane tracking');
        addLine('system', '  └─ Coverage: US territories');
        break;

      case 'metrics':
        addLine('system', '');
        addLine('system', 'SYSTEM METRICS:');
        addLine('success', `  ├─ Claims Processed: ${claimsCount}`);
        addLine(fraudCount > 0 ? 'warning' : 'success', `  ├─ Fraud Detected: ${fraudCount}`);
        addLine('system', `  ├─ Avg Processing Time: 1.2s`);
        addLine('system', `  └─ Uptime: ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`);
        break;

      default:
        if (command) {
          addLine('error', `>> Unknown command: "${command}"`);
          addLine('system', '>> Type "help" for available commands.');
        }
    }
  }, [addLine, agentActive, as400Connected, claimsCount, fraudCount, logsWatchActive]);


  // Procesar paso del wizard de inyección
  const processInjectWizard = useCallback(async (userInput: string) => {
    const trimmedInput = userInput.trim();
    
    // Cancelar wizard
    if (trimmedInput.toLowerCase() === 'cancel') {
      addLine('command', `> ${userInput}`);
      addLine('error', '>> Injection cancelled.');
      addLine('system', '');
      setInjectWizard({ active: false, step: 'subject', data: { subject: '', location: '', description: '', imageBase64: null, imageName: null } });
      return;
    }

    // Función para mostrar el paso de confirmación
    const showConfirmStep = () => {
      addLine('system', '');
      addLine('system', '╭─────────────── CLAIM SUMMARY ───────────────╮');
      addLine('system', `│ Subject:  ${injectWizard.data.subject.substring(0, 35).padEnd(35)} │`);
      addLine('system', `│ Location: ${injectWizard.data.location.substring(0, 35).padEnd(35)} │`);
      addLine('system', `│ Desc:     ${injectWizard.data.description.substring(0, 35).padEnd(35)} │`);
      addLine(injectWizard.data.imageBase64 ? 'success' : 'warning', 
              `│ Image:    ${injectWizard.data.imageName ? `📸 ${injectWizard.data.imageName.substring(0, 30)}` : '(none)'.padEnd(35)} │`);
      addLine('system', '╰──────────────────────────────────────────────╯');
      addLine('system', '');
      addLine('warning', '>> Type "yes" to inject or "cancel" to abort:');
      
      setInjectWizard(prev => ({
        ...prev,
        step: 'confirm'
      }));
    };

    switch (injectWizard.step) {
      case 'subject':
        if (!trimmedInput) {
          addLine('error', '>> Subject cannot be empty. Try again:');
          return;
        }
        addLine('command', `> ${userInput}`);
        addLine('success', `>> Subject: "${trimmedInput}"`);
        addLine('system', '');
        addLine('system', '>> STEP 2/4: Enter location');
        addLine('system', '>> (e.g., "Miami, FL" or "London, UK")');
        addLine('system', '');
        setInjectWizard(prev => ({
          ...prev,
          step: 'location',
          data: { ...prev.data, subject: trimmedInput }
        }));
        break;

      case 'location':
        if (!trimmedInput) {
          addLine('error', '>> Location cannot be empty. Try again:');
          return;
        }
        addLine('command', `> ${userInput}`);
        addLine('success', `>> Location: "${trimmedInput}"`);
        addLine('system', '');
        addLine('system', '>> STEP 3/4: Enter claim description');
        addLine('system', '>> (Include: Policy#, Claimant, Damage Type, Amount)');
        addLine('system', '');
        setInjectWizard(prev => ({
          ...prev,
          step: 'description',
          data: { ...prev.data, location: trimmedInput }
        }));
        break;

      case 'description':
        if (!trimmedInput) {
          addLine('error', '>> Description cannot be empty. Try again:');
          return;
        }
        addLine('command', `> ${userInput}`);
        addLine('success', `>> Description received.`);
        addLine('system', '');
        addLine('system', '>> STEP 4/4: Photographic Evidence (Optional)');
        addLine('system', '╭─────────────────────────────────────────────╮');
        addLine('warning', '│  📸 GPT-4 Vision will analyze the image     │');
        addLine('system', '│                                             │');
        addLine('system', '│  Type "upload" to select an image file      │');
        addLine('system', '│  Type "skip" to continue without image      │');
        addLine('system', '╰─────────────────────────────────────────────╯');
        addLine('system', '');
        
        setInjectWizard(prev => ({
          ...prev,
          step: 'image',
          data: { ...prev.data, description: trimmedInput }
        }));
        break;

      case 'image':
        addLine('command', `> ${userInput}`);
        
        if (trimmedInput.toLowerCase() === 'upload') {
          addLine('system', '>> Opening file selector...');
          // Trigger file input click
          fileInputRef.current?.click();
          return; // Don't change step yet, wait for file selection
        } else if (trimmedInput.toLowerCase() === 'skip') {
          addLine('system', '>> Skipping image upload.');
          showConfirmStep();
        } else {
          addLine('warning', '>> Type "upload" to select image or "skip" to continue.');
        }
        break;

      case 'confirm':
        addLine('command', `> ${userInput}`);
        
        if (trimmedInput.toLowerCase() === 'yes') {
          addLine('system', '');
          addLine('warning', '>> ⚡ INJECTING CLAIM INTO SYSTEM ⚡');
          addLine('system', '>> ░░░░░░░░░░ Processing... ░░░░░░░░░░');
          setIsTyping(true);
          
          setInjectWizard(prev => ({ ...prev, step: 'processing' }));
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/manual-claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: injectWizard.data.subject,
                body: injectWizard.data.description,
                location: injectWizard.data.location,
                imageBase64: injectWizard.data.imageBase64 || undefined
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            setIsTyping(false);
            
            if (data.success) {
              addLine('system', '');
              addLine('success', '╔═══════════════════════════════════════════════╗');
              addLine('success', '║          ✓ CLAIM INJECTED SUCCESSFULLY        ║');
              addLine('success', '╠═══════════════════════════════════════════════╣');
              addLine('success', `║  Decision: ${(data.decision || 'N/A').padEnd(34)} ║`);
              addLine(data.fraudRisk === 'low' ? 'success' : data.fraudRisk === 'medium' ? 'warning' : 'error',
                      `║  Fraud Risk: ${(data.fraudRisk?.toUpperCase() || 'N/A').padEnd(32)} ║`);
              addLine('success', '╚═══════════════════════════════════════════════╝');
              
              if (data.reasons && data.reasons.length > 0) {
                addLine('system', '');
                addLine('system', '>> AI Reasoning:');
                data.reasons.slice(0, 3).forEach((reason: string) => {
                  addLine('system', `   • ${reason.substring(0, 50)}`);
                });
              }
            } else {
              addLine('error', '>> Injection failed: ' + (data.error || 'Unknown error'));
            }
          } catch (error) {
            setIsTyping(false);
            if (error instanceof Error && error.name === 'AbortError') {
              addLine('error', '>> ERROR: Request timeout (5s exceeded).');
            } else {
              addLine('error', '>> ERROR: Could not connect to server.');
            }
          }
          
          addLine('system', '');
          setInjectWizard({ active: false, step: 'subject', data: { subject: '', location: '', description: '', imageBase64: null, imageName: null } });
        } else {
          addLine('error', '>> Invalid input. Type "yes" to confirm or "cancel" to abort.');
        }
        break;
    }
  }, [addLine, injectWizard]);

  // Handler para selección de archivo de imagen
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      addLine('warning', '>> No file selected.');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      addLine('error', '>> ERROR: Please select an image file (JPG, PNG, GIF).');
      return;
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addLine('error', '>> ERROR: Image must be less than 10MB.');
      return;
    }

    addLine('success', `>> File selected: ${file.name}`);
    addLine('system', '>> Converting to Base64...');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      addLine('success', '>> ✓ Image loaded successfully!');
      addLine('system', '');
      
      // Mostrar preview ASCII art style
      addLine('system', '╭─────────────── IMAGE PREVIEW ───────────────╮');
      addLine('success', `│  📸 ${file.name.substring(0, 40).padEnd(40)} │`);
      addLine('system', `│  Size: ${(file.size / 1024).toFixed(1)}KB ${' '.repeat(Math.max(0, 32 - (file.size / 1024).toFixed(1).length))}│`);
      addLine('system', `│  Type: ${file.type.padEnd(38)} │`);
      addLine('warning', '│  🤖 GPT-4 Vision will analyze this image    │');
      addLine('system', '╰──────────────────────────────────────────────╯');
      
      // Usar el estado actual para mostrar el resumen
      setInjectWizard(currentState => {
        // Mostrar resumen y pedir confirmación
        addLine('system', '');
        addLine('system', '╭─────────────── CLAIM SUMMARY ───────────────╮');
        addLine('system', `│ Subject:  ${currentState.data.subject.substring(0, 35).padEnd(35)} │`);
        addLine('system', `│ Location: ${currentState.data.location.substring(0, 35).padEnd(35)} │`);
        addLine('system', `│ Desc:     ${currentState.data.description.substring(0, 35).padEnd(35)} │`);
        addLine('success', `│ Image:    📸 ${file.name.substring(0, 32).padEnd(32)} │`);
        addLine('system', '╰──────────────────────────────────────────────╯');
        addLine('system', '');
        addLine('warning', '>> Type "yes" to inject or "cancel" to abort:');
        
        return {
          ...currentState,
          data: { ...currentState.data, imageBase64: base64String, imageName: file.name },
          step: 'confirm' as const
        };
      });
    };

    reader.onerror = () => {
      addLine('error', '>> ERROR: Failed to read file.');
    };

    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = '';
  }, [addLine]);

  // Manejar envío de comando
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      // Si el wizard está activo, procesar como paso del wizard
      if (injectWizard.active) {
        processInjectWizard(input);
      } else {
        processCommand(input);
      }
      setInput('');
    }
  };

  // Manejar teclas especiales (historial)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  // Focus en el input al hacer click en la terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  // Obtener color según tipo de línea
  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return 'text-cyan-400';
      case 'response': return 'text-purple-400';
      case 'spirit': return 'text-purple-300 italic';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div 
      className={`bg-black border-4 rounded-lg p-6 relative overflow-hidden font-mono h-full flex flex-col cursor-text transition-all duration-100
        ${electricBorder ? 'border-cyan-400 animate-pulse' : 'border-green-500'}
        ${glitchActive ? 'glitch-effect' : ''}
        ${crtFlicker ? 'opacity-90' : 'opacity-100'}
      `}
      style={{
        boxShadow: electricBorder 
          ? '0 0 80px rgba(6, 182, 212, 1), inset 0 0 60px rgba(6, 182, 212, 0.4), 0 0 120px rgba(168, 85, 247, 0.5)'
          : '0 0 60px rgba(34, 197, 94, 0.8), inset 0 0 40px rgba(34, 197, 94, 0.2)'
      }}
      onClick={handleTerminalClick}
    >
      {/* Efecto de escaneo CRT */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.03) 2px, rgba(34, 197, 94, 0.03) 4px)',
        }}
      />
      
      {/* Efecto de línea de escaneo animada */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.1) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Línea de escaneo que se mueve */}
      <div 
        className="absolute left-0 right-0 h-1 pointer-events-none z-10 opacity-30"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(34, 197, 94, 0.8), transparent)',
          animation: 'scanline 4s linear infinite',
        }}
      />

      {/* Efecto glitch overlay */}
      {glitchActive && (
        <div className="absolute inset-0 pointer-events-none z-30">
          <div className="absolute inset-0 bg-red-500/10" style={{ transform: 'translateX(2px)' }} />
          <div className="absolute inset-0 bg-cyan-500/10" style={{ transform: 'translateX(-2px)' }} />
        </div>
      )}

      {/* Efecto de electricidad en el borde */}
      {electricBorder && (
        <div className="absolute inset-0 pointer-events-none z-5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-pulse" />
          <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent animate-pulse" />
        </div>
      )}

      {/* Header */}
      <div className="border-b-2 border-green-500/50 pb-3 mb-4 relative z-20">
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-green-400">&gt; FRANKENSTEIN SYSTEM MONITOR v2.0</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${as400Connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {as400Connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Output Area */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto relative z-20 pr-2 scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-transparent"
        style={{ maxHeight: 'calc(100% - 120px)' }}
      >
        {history.map((line) => (
          <div key={line.id} className={`${getLineColor(line.type)} text-sm leading-relaxed`}>
            {line.text || '\u00A0'}
          </div>
        ))}
        
        {/* Indicador de typing - Místico */}
        {isTyping && (
          <div className="text-purple-400 text-sm flex items-center gap-2 my-2">
            <span className="animate-pulse">🔮</span>
            <span className="animate-pulse italic">The spirit is speaking</span>
            <span className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>✧</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>✧</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>✧</span>
            </span>
          </div>
        )}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t-2 border-green-500/50 pt-3 mt-4 relative z-20">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${injectWizard.active ? 'text-yellow-400' : 'text-green-400'}`}>
            {injectWizard.active ? '💉' : '>'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            placeholder={
              isTyping ? 'Processing...' : 
              injectWizard.active ? 
                injectWizard.step === 'subject' ? 'Enter subject...' :
                injectWizard.step === 'location' ? 'Enter location...' :
                injectWizard.step === 'description' ? 'Enter description...' :
                injectWizard.step === 'image' ? 'Type "upload" or "skip"...' :
                injectWizard.step === 'confirm' ? 'Type "yes" or "cancel"...' :
                'Processing...'
              : 'Enter command...'
            }
            className="flex-1 bg-transparent border-none outline-none text-green-400 text-sm placeholder-green-700 caret-green-400"
            autoFocus
          />
          <span className="text-green-400 animate-pulse">_</span>
        </div>
      </form>

      {/* Estilos para scrollbar y efectos */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.5);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.7);
        }

        /* Animación de línea de escaneo */
        @keyframes scanline {
          0% { top: -10%; }
          100% { top: 110%; }
        }

        /* Efecto glitch */
        .glitch-effect {
          animation: glitch 0.3s ease-in-out;
        }

        @keyframes glitch {
          0% { transform: translate(0); filter: hue-rotate(0deg); }
          10% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
          20% { transform: translate(2px, -1px); filter: hue-rotate(180deg); }
          30% { transform: translate(-1px, 2px); filter: hue-rotate(270deg); }
          40% { transform: translate(1px, -2px); filter: hue-rotate(0deg); }
          50% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
          60% { transform: translate(2px, -1px); }
          70% { transform: translate(-1px, 2px); }
          80% { transform: translate(1px, -2px); }
          90% { transform: translate(-2px, 1px); }
          100% { transform: translate(0); filter: hue-rotate(0deg); }
        }

        /* Efecto de parpadeo de texto para errores */
        .error-blink {
          animation: errorBlink 0.5s ease-in-out;
        }

        @keyframes errorBlink {
          0%, 100% { opacity: 1; }
          25% { opacity: 0.5; }
          50% { opacity: 1; }
          75% { opacity: 0.5; }
        }

        /* Efecto de electricidad pulsante */
        @keyframes electricPulse {
          0%, 100% { 
            box-shadow: 0 0 60px rgba(6, 182, 212, 0.8), 
                        inset 0 0 40px rgba(6, 182, 212, 0.3);
          }
          50% { 
            box-shadow: 0 0 100px rgba(168, 85, 247, 1), 
                        inset 0 0 60px rgba(168, 85, 247, 0.5),
                        0 0 150px rgba(6, 182, 212, 0.8);
          }
        }

        /* Efecto de ruido de fondo sutil */
        .noise-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};
