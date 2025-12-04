# Design Document

## Overview

Este diseño unifica los componentes SystemTopology y NecropsyView en un único componente llamado `UnifiedSystemView` que combina la visualización de topología del sistema con p5.js y el timeline de ejecución del agente. El componente mantiene intacta la animación del AI Brain con red neuronal mientras integra los pasos del agente como overlays informativos sobre los nodos correspondientes.

## Architecture

### Component Structure

```
UnifiedSystemView (React Component)
├── p5.js Canvas Layer (System Topology)
│   ├── Background Gradient
│   ├── Nodes (Frontend, Gateway, AI Brain, Legacy)
│   ├── Cables (connections between nodes)
│   ├── DataPacket (animated data flow)
│   ├── Neural Network (AI Brain only)
│   └── Shockwave (success effect)
└── React Overlay Layer (Agent Steps)
    ├── Step Indicators (positioned near nodes)
    ├── Step Details (name, description, duration)
    └── Status Icons (success, error, skipped)
```

### Data Flow

1. **Input**: `ProcessedClaim` object from Dashboard
2. **Transform**: Convert claim data to `AgentStep[]` array
3. **Map**: Associate each step with corresponding node
4. **Render**: 
   - p5.js draws topology and animations
   - React renders step overlays with absolute positioning
5. **Update**: React state triggers p5.js state changes via refs

## Components and Interfaces

### Main Component Interface

```typescript
interface UnifiedSystemViewProps {
  lastClaim?: ProcessedClaim;
}

interface ProcessedClaim {
  id: string;
  decision: string;
  validationResult: {
    fraudRisk: string;
  };
  processingTime: number;
  status?: string;
}
```

### Internal Data Structures

```typescript
interface Node {
  x: number;
  y: number;
  label: string;
  color: [number, number, number];
  isAI?: boolean;
}

interface Neuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  duration?: number;
  nodeIndex: number; // NEW: maps step to node
  description: string;
  icon: React.ReactNode;
}

class DataPacket {
  currentSegment: number;
  progress: number;
  speed: number;
  nodes: Node[];
  active: boolean;
  currentStepId?: string; // NEW: tracks which step is active
}

class Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  active: boolean;
}
```

### Step-to-Node Mapping

```typescript
const STEP_NODE_MAPPING = {
  'EXTRACT': 0,    // Frontend
  'QUERY': 3,      // Legacy
  'VALIDATE': 2,   // AI Brain
  'DECISION': 2,   // AI Brain
  'SUBMIT': 3      // Legacy
};
```

## Data Models

### Node Positions (unchanged from SystemTopology)

```typescript
const nodes: Node[] = [
  { x: 200, y: 250, label: 'Frontend', color: [6, 182, 212] },      // Cyan
  { x: 450, y: 250, label: 'Gateway', color: [168, 85, 247] },      // Purple
  { x: 750, y: 250, label: 'AI Brain', color: [34, 197, 94], isAI: true }, // Green
  { x: 1000, y: 250, label: 'Legacy', color: [249, 115, 22] }       // Orange
];
```

### Step Status Colors

```typescript
const STATUS_COLORS = {
  pending: { bg: 'bg-gray-600', border: 'border-gray-500', rgb: [100, 100, 100] },
  running: { bg: 'bg-blue-600', border: 'border-blue-400', rgb: [37, 99, 235] },
  success: { bg: 'bg-green-600', border: 'border-green-400', rgb: [34, 197, 94] },
  error: { bg: 'bg-red-600', border: 'border-red-400', rgb: [239, 68, 68] },
  skipped: { bg: 'bg-yellow-600', border: 'border-yellow-400', rgb: [234, 179, 8] }
};
```

## Implementation Strategy

### Phase 1: Preserve p5.js Core (AI Brain)

**Preserve exactly as-is:**
- `drawNeuralNetwork()` function
- `drawNode()` function with neural network rendering
- `drawCable()` function
- Neuron physics and boundary logic
- Canvas setup and cleanup

### Phase 2: Enhance DataPacket

**Add step tracking:**
```typescript
class DataPacket {
  // ... existing properties
  currentStepId?: string;
  
  update() {
    if (!this.active) return;
    
    this.progress += this.speed;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.currentSegment++;
      
      // NEW: Update current step based on segment
      this.updateCurrentStep();
      
      if (this.currentSegment >= this.nodes.length - 1) {
        this.active = false;
      }
    }
  }
  
  updateCurrentStep() {
    // Map segment to step
    const stepMap = ['EXTRACT', 'QUERY', 'VALIDATE', 'SUBMIT'];
    this.currentStepId = stepMap[this.currentSegment];
  }
}
```

### Phase 3: React Overlay Layer

**Absolute positioned overlays:**
```typescript
// Position step indicators relative to canvas
const getStepPosition = (nodeIndex: number) => {
  const node = nodes[nodeIndex];
  return {
    left: `${node.x}px`,
    top: `${node.y - 120}px`, // Above the node
    transform: 'translateX(-50%)'
  };
};
```

**Step Indicator Component:**
```tsx
<div 
  className="absolute z-10 transition-all duration-300"
  style={getStepPosition(step.nodeIndex)}
>
  <div className={`
    px-4 py-2 rounded-lg border-2
    ${STATUS_COLORS[step.status].bg}
    ${STATUS_COLORS[step.status].border}
    ${step.status === 'running' ? 'animate-pulse' : ''}
    ${hoveredStep === step.id ? 'scale-125' : 'scale-100'}
  `}>
    <div className="flex items-center gap-2">
      {step.icon}
      <span className="font-mono text-sm">{step.name}</span>
    </div>
    <p className="text-xs text-gray-300 mt-1">{step.description}</p>
    {step.duration && (
      <p className="text-xs text-gray-400 mt-1">~{step.duration}ms</p>
    )}
  </div>
</div>
```

### Phase 4: State Synchronization

**Convert ProcessedClaim to AgentSteps:**
```typescript
useEffect(() => {
  if (!lastClaim) return;
  
  const totalTime = lastClaim.processingTime;
  const t = (pct: number) => Math.round(totalTime * pct);
  
  const steps: AgentStep[] = [
    {
      id: 'extract',
      name: 'EXTRACT',
      status: 'success',
      duration: t(0.1),
      nodeIndex: 0, // Frontend
      description: `Extracted claim ${lastClaim.id}`,
      icon: <Mail className="w-4 h-4" />
    },
    {
      id: 'query',
      name: 'QUERY',
      status: lastClaim.status === 'ERROR' ? 'error' : 'success',
      duration: t(0.3),
      nodeIndex: 3, // Legacy
      description: 'AS/400 Connection',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'validate',
      name: 'VALIDATE',
      status: 'success',
      duration: t(0.4),
      nodeIndex: 2, // AI Brain
      description: `Risk: ${lastClaim.validationResult.fraudRisk}`,
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'decision',
      name: 'DECISION',
      status: 'success',
      duration: t(0.05),
      nodeIndex: 2, // AI Brain
      description: `Decision: ${lastClaim.decision}`,
      icon: <Brain className="w-4 h-4" />
    },
    {
      id: 'submit',
      name: 'SUBMIT',
      status: getSubmitStatus(lastClaim),
      duration: t(0.15),
      nodeIndex: 3, // Legacy
      description: getSubmitDescription(lastClaim),
      icon: <Zap className="w-4 h-4" />
    }
  ];
  
  setSteps(steps);
  
  // Trigger p5.js animation
  if (systemStateRef.current !== 'processing') {
    setSystemState('processing');
  }
}, [lastClaim]);
```

### Phase 5: Layout Structure

```tsx
return (
  <div className="relative w-full h-[500px]">
    {/* p5.js Canvas Layer */}
    <Sketch setup={setup} draw={draw} />
    
    {/* React Overlay Layer */}
    <div className="absolute inset-0 pointer-events-none">
      {steps.map(step => (
        <div
          key={step.id}
          className="pointer-events-auto"
          style={getStepPosition(step.nodeIndex)}
          onMouseEnter={() => setHoveredStep(step.id)}
          onMouseLeave={() => setHoveredStep(null)}
        >
          <StepIndicator step={step} isHovered={hoveredStep === step.id} />
        </div>
      ))}
    </div>
    
    {/* Title and Status Overlay */}
    <div className="absolute top-8 left-8 pointer-events-none">
      <h2 className="text-2xl font-mono text-cyan-400">
        [ UNIFIED SYSTEM VIEW ]
      </h2>
      <p className="text-sm text-gray-400 mt-2">
        {lastClaim ? `Processing: ${lastClaim.id}` : 'Idle'}
      </p>
    </div>
  </div>
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data packet progression

*For any* data packet traveling through the system, the packet should progress through segments sequentially (0 → 1 → 2 → 3) and become inactive after reaching the final segment.

**Validates: Requirements 1.2**

### Property 2: Active cable highlighting

*For any* data packet at segment N, the cable connecting nodes[N] to nodes[N+1] should be rendered with increased intensity while other cables remain at default intensity.

**Validates: Requirements 1.4**

### Property 3: Step positioning consistency

*For any* agent step with nodeIndex N, the step indicator should be positioned relative to the coordinates of nodes[N] with consistent offset calculations.

**Validates: Requirements 2.1**

### Property 4: Step status visual mapping

*For any* agent step with status S, the visual representation should use the color and styling defined in STATUS_COLORS[S].

**Validates: Requirements 2.5**

### Property 5: Claim data propagation

*For any* new ProcessedClaim received as props, the component should update its internal steps state to reflect the new claim data within one render cycle.

**Validates: Requirements 4.1**

### Property 6: Time distribution conservation

*For any* ProcessedClaim with processingTime T, the sum of all generated step durations should equal T (within rounding tolerance of ±5ms).

**Validates: Requirements 4.2**

### Property 7: Neuron boundary constraints

*For any* neuron in the neural network, after position updates, the neuron's x and y coordinates should remain within the bounds [aiNode.x - 50, aiNode.x + 50] and [aiNode.y - 50, aiNode.y + 50] respectively.

**Validates: Requirements 5.2**

### Property 8: Canvas uniqueness

*For any* render or re-render of the component, there should exist exactly one canvas element with id 'unified-system-canvas' in the DOM.

**Validates: Requirements 5.5**

## Error Handling

### Canvas Cleanup
```typescript
useEffect(() => {
  return () => {
    // Remove canvas by ID
    const canvas = document.querySelector('#unified-system-canvas');
    if (canvas) canvas.remove();
    
    // Clear refs
    nodesRef.current = [];
    neuronsRef.current = [];
    dataPacketRef.current = null;
    shockwaveRef.current = null;
  };
}, []);
```

### Missing Data Handling
```typescript
if (!lastClaim) {
  return (
    <div className="relative w-full h-[500px]">
      <Sketch setup={setup} draw={draw} />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-gray-400">Waiting for agent data...</p>
      </div>
    </div>
  );
}
```

### Step Status Resolution
```typescript
const getSubmitStatus = (claim: ProcessedClaim): AgentStep['status'] => {
  if (claim.decision === 'INVESTIGATE' || claim.decision === 'INVALID_DATA') {
    return 'skipped';
  }
  if (claim.status === 'SUBMIT_FAILED') {
    return 'error';
  }
  return 'success';
};
```

## Testing Strategy

### Unit Tests

1. **Step Mapping Tests**
   - Verify STEP_NODE_MAPPING correctness
   - Test getStepPosition() calculations
   - Validate step status resolution logic

2. **Data Transformation Tests**
   - Test ProcessedClaim → AgentStep[] conversion
   - Verify time distribution calculations
   - Test edge cases (missing data, invalid status)

3. **Component Rendering Tests**
   - Test idle state rendering
   - Test with valid claim data
   - Test hover interactions

### Integration Tests

1. **p5.js Integration**
   - Verify canvas creation and cleanup
   - Test neural network rendering
   - Validate DataPacket animation

2. **State Synchronization**
   - Test React state → p5.js state flow
   - Verify step updates trigger visual changes
   - Test multiple claim processing sequence

### Visual Regression Tests

1. Compare screenshots of:
   - Idle state
   - Processing state
   - Success state with shockwave
   - Error state
   - Hover states

## Performance Considerations

### Optimization Strategies

1. **Memoization**
   - Memoize `setup` callback (no dependencies)
   - Memoize `draw` callback (only `lastClaim` dependency)
   - Memoize step position calculations

2. **Ref Usage**
   - Use refs for p5.js state (nodes, neurons, packets)
   - Avoid triggering re-renders from animation frames

3. **Conditional Rendering**
   - Only render step overlays when claim data exists
   - Skip inactive animations

4. **Canvas Management**
   - Single canvas instance
   - Proper cleanup on unmount
   - Prevent duplicate canvas creation

## Migration Path

### Step 1: Create UnifiedSystemView
- Copy SystemTopology as base
- Add ProcessedClaim prop interface
- Preserve all p5.js functions

### Step 2: Add Step Overlay Layer
- Create StepIndicator sub-component
- Implement absolute positioning
- Add hover interactions

### Step 3: Integrate with Dashboard
- Replace SystemTopology import
- Pass lastClaim prop
- Test data flow

### Step 4: Deprecate Old Components
- Mark SystemTopology as deprecated
- Mark NecropsyView as deprecated
- Update documentation

### Step 5: Cleanup
- Remove old component files
- Update imports across codebase
- Remove unused dependencies
