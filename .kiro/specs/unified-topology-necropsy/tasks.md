# Implementation Plan

- [x] 1. Create UnifiedSystemView component base structure





  - Create new file `src/ui/UnifiedSystemView.tsx`
  - Copy p5.js setup and draw functions from SystemTopology
  - Preserve drawNeuralNetwork, drawNode, drawCable functions exactly as-is
  - Set up component props interface to accept ProcessedClaim
  - Initialize refs for nodes, neurons, dataPacket, shockwave
  - _Requirements: 1.1, 1.3, 5.1_

- [x] 1.1 Write property test for canvas uniqueness


  - **Property 8: Canvas uniqueness**
  - **Validates: Requirements 5.5**

- [x] 2. Implement step-to-node mapping logic





  - Create STEP_NODE_MAPPING constant mapping step names to node indices
  - Implement getStepPosition() function to calculate absolute positions
  - Create AgentStep interface with nodeIndex property
  - Add step icon mapping (EXTRACT → Mail, QUERY → Database, etc.)
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3. Implement ProcessedClaim to AgentStep transformation





  - Create useEffect hook that watches lastClaim prop
  - Implement time distribution logic (t = totalTime * percentage)
  - Map claim data to 5 agent steps (EXTRACT, QUERY, VALIDATE, DECISION, SUBMIT)
  - Implement getSubmitStatus() helper for conditional status logic
  - Implement getSubmitDescription() helper for dynamic descriptions
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.1 Write property test for time distribution conservation


  - **Property 6: Time distribution conservation**
  - **Validates: Requirements 4.2**

- [x] 3.2 Write property test for claim data propagation


  - **Property 5: Claim data propagation**
  - **Validates: Requirements 4.1**

- [x] 4. Enhance DataPacket class with step tracking





  - Add currentStepId property to DataPacket class
  - Implement updateCurrentStep() method to map segment to step
  - Update DataPacket.update() to call updateCurrentStep() on segment change
  - _Requirements: 1.2, 2.1_

- [x] 4.1 Write property test for data packet progression


  - **Property 1: Data packet progression**
  - **Validates: Requirements 1.2**

- [x] 5. Implement active cable highlighting logic





  - Modify draw() function to track active segment from DataPacket
  - Update drawCable() calls to pass isActive based on current segment
  - Ensure intensity parameter increases for active cables
  - _Requirements: 1.4_

- [x] 5.1 Write property test for active cable highlighting


  - **Property 2: Active cable highlighting**
  - **Validates: Requirements 1.4**

- [x] 6. Create StepIndicator sub-component





  - Create StepIndicator functional component
  - Implement status-based styling (colors, borders, animations)
  - Add step icon, name, description, and duration display
  - Implement hover scale effect (scale-100 → scale-125)
  - Add status badge icons (CheckCircle, XCircle, AlertTriangle)
  - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6.1 Write property test for step status visual mapping


  - **Property 4: Step status visual mapping**
  - **Validates: Requirements 2.5**

- [ ] 7. Implement React overlay layer





  - Create absolute positioned container over p5.js canvas
  - Map steps array to StepIndicator components
  - Apply getStepPosition() for each step's absolute positioning
  - Implement hover state management (hoveredStep state)
  - Add pointer-events-none to container, pointer-events-auto to indicators
  - _Requirements: 2.1, 6.1, 6.2, 6.3, 6.4_

- [x] 7.1 Write property test for step positioning consistency


  - **Property 3: Step positioning consistency**
  - **Validates: Requirements 2.1**

- [-] 8. Implement neuron boundary constraints







  - Verify neuron update logic maintains boundaries
  - Ensure velocity reversal when hitting bounds
  - Test with AI Brain node at position (750, 250)
  - _Requirements: 5.2_

- [x] 8.1 Write property test for neuron boundary constraints


  - **Property 7: Neuron boundary constraints**
  - **Validates: Requirements 5.2**
-

- [ ] 9. Implement idle state handling




  - Add conditional rendering for no claim data
  - Display "Waiting for agent data..." message
  - Ensure nodes are visible but no DataPacket is active
  - _Requirements: 4.5_

- [x] 10. Implement canvas cleanup and memory management





  - Enhance useEffect cleanup to remove canvas by ID
  - Clear all refs (nodes, neurons, dataPacket, shockwave)
  - Prevent duplicate canvas creation in setup callback
  - Add canvas existence check before creating new canvas
  - _Requirements: 5.4, 5.5_

- [x] 11. Apply consistent styling and theming





  - Implement gradient background (gray-900 → purple-900 → gray-950)
  - Apply monospace font to all technical labels
  - Verify color palette (cyan, purple, green, orange)
  - Add title overlay "[ UNIFIED SYSTEM VIEW ]"
  - Add claim ID display in status area
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Integrate UnifiedSystemView into FrankenStackDashboard





  - Import UnifiedSystemView component
  - Replace SystemTopology with UnifiedSystemView
  - Pass lastClaim prop from dashboard state
  - Test data flow from dashboard to unified view
  - _Requirements: 4.1_

- [x] 13. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Deprecate old components





  - Add deprecation comments to SystemTopology.tsx
  - Add deprecation comments to NecropsyView.tsx
  - Update component documentation
  - _Requirements: All_

- [x] 15. Final integration tests





  - Test complete flow: claim received → visualization updates
  - Test all step statuses (pending, running, success, error, skipped)
  - Test hover interactions on all elements
  - Test canvas cleanup on unmount
  - Verify no memory leaks or duplicate canvases
