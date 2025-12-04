# Requirements Document

## Introduction

Este documento especifica los requisitos para unificar los componentes SystemTopology y NecropsyView en un único componente de visualización que muestre el flujo de procesamiento de información a través del sistema FrankenStack, manteniendo el AI brain con animación p5.js intacta.

## Glossary

- **SystemTopology**: Componente que visualiza la topología del sistema con nodos (Frontend, Gateway, AI Brain, Legacy) y flujo de datos usando p5.js
- **NecropsyView**: Componente que muestra el timeline de ejecución del agente con pasos individuales y sus estados
- **AI Brain**: Nodo especial con visualización de red neuronal animada usando p5.js
- **DataPacket**: Paquete de datos que viaja a través de los nodos del sistema
- **AgentStep**: Paso individual en el proceso de ejecución del agente (EXTRACT, QUERY, VALIDATE, DECISION, SUBMIT)
- **ProcessedClaim**: Datos de un reclamo procesado que contiene información sobre la decisión, validación y tiempo de procesamiento
- **Shockwave**: Efecto visual de onda expansiva que se muestra al completar exitosamente el procesamiento

## Requirements

### Requirement 1

**User Story:** Como usuario del sistema, quiero ver una visualización unificada del flujo de datos a través de los componentes del sistema, para entender cómo se procesa la información en tiempo real.

#### Acceptance Criteria

1. WHEN the unified component renders THEN the system SHALL display the four main nodes (Frontend, Gateway, AI Brain, Legacy) with their original visual styling
2. WHEN data flows through the system THEN the system SHALL animate a data packet traveling from node to node
3. WHEN the AI Brain node is displayed THEN the system SHALL render the neural network animation using p5.js exactly as in the original SystemTopology component
4. WHEN a node is processing data THEN the system SHALL highlight the active connection cables with increased intensity
5. WHEN processing completes successfully THEN the system SHALL display a shockwave effect originating from the center

### Requirement 2

**User Story:** Como usuario del sistema, quiero ver los pasos detallados de ejecución del agente integrados con la topología del sistema, para comprender qué operación se está ejecutando en cada nodo.

#### Acceptance Criteria

1. WHEN an agent step is executing THEN the system SHALL display the step details (name, description, duration) near the corresponding node
2. WHEN the EXTRACT step runs THEN the system SHALL show the step information near the Frontend node
3. WHEN the QUERY or SUBMIT steps run THEN the system SHALL show the step information near the Legacy node
4. WHEN the VALIDATE or DECISION steps run THEN the system SHALL show the step information near the AI Brain node
5. WHEN a step completes THEN the system SHALL update the step status indicator (success, error, skipped) with appropriate visual feedback

### Requirement 3

**User Story:** Como usuario del sistema, quiero ver el estado de cada paso del agente con indicadores visuales claros, para identificar rápidamente problemas o éxitos en el procesamiento.

#### Acceptance Criteria

1. WHEN a step is pending THEN the system SHALL display the step with gray color and no animation
2. WHEN a step is running THEN the system SHALL display the step with blue color and pulse animation
3. WHEN a step succeeds THEN the system SHALL display the step with green color and a success icon
4. WHEN a step fails THEN the system SHALL display the step with red color and an error icon
5. WHEN a step is skipped THEN the system SHALL display the step with yellow color and a warning icon

### Requirement 4

**User Story:** Como usuario del sistema, quiero que la visualización se actualice automáticamente con datos reales del último reclamo procesado, para monitorear el sistema en tiempo real.

#### Acceptance Criteria

1. WHEN a new ProcessedClaim is received THEN the system SHALL update the visualization with the new data
2. WHEN processing time data is available THEN the system SHALL distribute the time proportionally across the agent steps
3. WHEN a claim decision is INVESTIGATE or INVALID_DATA THEN the system SHALL mark the SUBMIT step as skipped
4. WHEN a claim status is SUBMIT_FAILED THEN the system SHALL mark the SUBMIT step as error
5. WHEN no claim data is available THEN the system SHALL display an idle state with all nodes visible but no active processing

### Requirement 5

**User Story:** Como desarrollador, quiero que el componente unificado mantenga la arquitectura p5.js del AI Brain sin modificaciones, para preservar la funcionalidad existente y evitar regresiones.

#### Acceptance Criteria

1. WHEN the AI Brain node is rendered THEN the system SHALL use the exact same drawNeuralNetwork function from SystemTopology
2. WHEN neurons are updated THEN the system SHALL maintain the same movement physics and boundary constraints
3. WHEN neural connections are drawn THEN the system SHALL use the same distance threshold and visual styling
4. WHEN the component unmounts THEN the system SHALL properly cleanup p5.js canvas instances to prevent memory leaks
5. WHEN the component re-renders THEN the system SHALL not create duplicate canvas elements

### Requirement 6

**User Story:** Como usuario del sistema, quiero ver información contextual al pasar el mouse sobre los elementos, para obtener detalles adicionales sin saturar la interfaz.

#### Acceptance Criteria

1. WHEN the user hovers over a node THEN the system SHALL display enhanced glow effects on that node
2. WHEN the user hovers over an agent step indicator THEN the system SHALL display the associated spec file path
3. WHEN the user hovers over a step indicator THEN the system SHALL scale the indicator by 125% with smooth transition
4. WHEN the user moves the mouse away THEN the system SHALL restore the original visual state with smooth transition
5. WHEN multiple elements are hovered in sequence THEN the system SHALL handle state transitions without visual glitches

### Requirement 7

**User Story:** Como usuario del sistema, quiero que la visualización mantenga la estética coherente con el dashboard de FrankenStack, para una experiencia visual integrada.

#### Acceptance Criteria

1. WHEN the component renders THEN the system SHALL use a gradient background matching the dashboard (gray-900 → purple-900 → gray-950)
2. WHEN text is displayed THEN the system SHALL use monospace font for technical labels
3. WHEN colors are applied THEN the system SHALL use the established color palette (cyan for data, purple for gateway, green for AI, orange for legacy)
4. WHEN shadows and glows are rendered THEN the system SHALL use consistent blur and opacity values across all elements
5. WHEN the layout is displayed THEN the system SHALL maintain responsive spacing and alignment with the dashboard grid
