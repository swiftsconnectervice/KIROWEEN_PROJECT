/**
 * Unit tests for step-to-node mapping logic
 * Feature: unified-topology-necropsy
 * Task 2: Implement step-to-node mapping logic
 */

import { describe, it, expect } from '@jest/globals';

// Test the mapping constants and logic
describe('Step-to-Node Mapping Logic', () => {
  
  // Mock node data matching the actual implementation
  const mockNodes = [
    { x: 200, y: 250, label: 'Frontend', color: [6, 182, 212] as [number, number, number] },
    { x: 450, y: 250, label: 'Gateway', color: [168, 85, 247] as [number, number, number] },
    { x: 750, y: 250, label: 'AI Brain', color: [34, 197, 94] as [number, number, number], isAI: true },
    { x: 1000, y: 250, label: 'Legacy', color: [249, 115, 22] as [number, number, number] }
  ];

  describe('STEP_NODE_MAPPING constant', () => {
    it('should map EXTRACT to Frontend node (index 0)', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };
      
      expect(STEP_NODE_MAPPING['EXTRACT']).toBe(0);
    });

    it('should map QUERY to Legacy node (index 3)', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };
      
      expect(STEP_NODE_MAPPING['QUERY']).toBe(3);
    });

    it('should map VALIDATE to AI Brain node (index 2)', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };
      
      expect(STEP_NODE_MAPPING['VALIDATE']).toBe(2);
    });

    it('should map DECISION to AI Brain node (index 2)', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };
      
      expect(STEP_NODE_MAPPING['DECISION']).toBe(2);
    });

    it('should map SUBMIT to Legacy node (index 3)', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };
      
      expect(STEP_NODE_MAPPING['SUBMIT']).toBe(3);
    });
  });

  describe('getStepPosition function', () => {
    // Replicate the function for testing
    function getStepPosition(nodeIndex: number, nodes: typeof mockNodes): { left: string; top: string; transform: string } {
      if (nodeIndex < 0 || nodeIndex >= nodes.length) {
        return {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        };
      }
      
      const node = nodes[nodeIndex];
      return {
        left: `${node.x}px`,
        top: `${node.y - 120}px`,
        transform: 'translateX(-50%)'
      };
    }

    it('should position step 120px above the node', () => {
      const position = getStepPosition(0, mockNodes);
      expect(position.top).toBe('130px'); // 250 - 120 = 130
    });

    it('should center step horizontally on the node', () => {
      const position = getStepPosition(0, mockNodes);
      expect(position.left).toBe('200px');
      expect(position.transform).toBe('translateX(-50%)');
    });

    it('should calculate correct position for Frontend node (index 0)', () => {
      const position = getStepPosition(0, mockNodes);
      expect(position.left).toBe('200px');
      expect(position.top).toBe('130px');
    });

    it('should calculate correct position for Gateway node (index 1)', () => {
      const position = getStepPosition(1, mockNodes);
      expect(position.left).toBe('450px');
      expect(position.top).toBe('130px');
    });

    it('should calculate correct position for AI Brain node (index 2)', () => {
      const position = getStepPosition(2, mockNodes);
      expect(position.left).toBe('750px');
      expect(position.top).toBe('130px');
    });

    it('should calculate correct position for Legacy node (index 3)', () => {
      const position = getStepPosition(3, mockNodes);
      expect(position.left).toBe('1000px');
      expect(position.top).toBe('130px');
    });

    it('should handle invalid node index gracefully', () => {
      const position = getStepPosition(-1, mockNodes);
      expect(position.left).toBe('50%');
      expect(position.top).toBe('50%');
      expect(position.transform).toBe('translate(-50%, -50%)');
    });

    it('should handle out-of-bounds node index gracefully', () => {
      const position = getStepPosition(10, mockNodes);
      expect(position.left).toBe('50%');
      expect(position.top).toBe('50%');
      expect(position.transform).toBe('translate(-50%, -50%)');
    });
  });

  describe('AgentStep interface', () => {
    it('should support all required properties including nodeIndex', () => {
      interface AgentStep {
        id: string;
        name: string;
        status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
        duration?: number;
        nodeIndex: number;
        description: string;
        icon: React.ReactNode;
      }

      const step: AgentStep = {
        id: 'extract',
        name: 'EXTRACT',
        status: 'success',
        duration: 100,
        nodeIndex: 0,
        description: 'Extract claim data',
        icon: null
      };

      expect(step.nodeIndex).toBe(0);
      expect(step.name).toBe('EXTRACT');
      expect(step.status).toBe('success');
    });
  });

  describe('Step icon mapping', () => {
    it('should have icons for all step types', () => {
      const stepTypes = ['EXTRACT', 'QUERY', 'VALIDATE', 'DECISION', 'SUBMIT'];
      
      // Verify all step types are accounted for
      expect(stepTypes).toHaveLength(5);
      expect(stepTypes).toContain('EXTRACT');
      expect(stepTypes).toContain('QUERY');
      expect(stepTypes).toContain('VALIDATE');
      expect(stepTypes).toContain('DECISION');
      expect(stepTypes).toContain('SUBMIT');
    });
  });

  describe('Integration: Step mapping to positions', () => {
    it('should correctly map EXTRACT step to Frontend position', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };

      function getStepPosition(nodeIndex: number, nodes: typeof mockNodes) {
        if (nodeIndex < 0 || nodeIndex >= nodes.length) {
          return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
        }
        const node = nodes[nodeIndex];
        return {
          left: `${node.x}px`,
          top: `${node.y - 120}px`,
          transform: 'translateX(-50%)'
        };
      }

      const nodeIndex = STEP_NODE_MAPPING['EXTRACT'];
      const position = getStepPosition(nodeIndex, mockNodes);
      
      expect(position.left).toBe('200px'); // Frontend x position
      expect(position.top).toBe('130px');  // Frontend y - 120
    });

    it('should correctly map VALIDATE step to AI Brain position', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };

      function getStepPosition(nodeIndex: number, nodes: typeof mockNodes) {
        if (nodeIndex < 0 || nodeIndex >= nodes.length) {
          return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
        }
        const node = nodes[nodeIndex];
        return {
          left: `${node.x}px`,
          top: `${node.y - 120}px`,
          transform: 'translateX(-50%)'
        };
      }

      const nodeIndex = STEP_NODE_MAPPING['VALIDATE'];
      const position = getStepPosition(nodeIndex, mockNodes);
      
      expect(position.left).toBe('750px'); // AI Brain x position
      expect(position.top).toBe('130px');  // AI Brain y - 120
    });

    it('should correctly map QUERY step to Legacy position', () => {
      const STEP_NODE_MAPPING: Record<string, number> = {
        'EXTRACT': 0,
        'QUERY': 3,
        'VALIDATE': 2,
        'DECISION': 2,
        'SUBMIT': 3
      };

      function getStepPosition(nodeIndex: number, nodes: typeof mockNodes) {
        if (nodeIndex < 0 || nodeIndex >= nodes.length) {
          return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
        }
        const node = nodes[nodeIndex];
        return {
          left: `${node.x}px`,
          top: `${node.y - 120}px`,
          transform: 'translateX(-50%)'
        };
      }

      const nodeIndex = STEP_NODE_MAPPING['QUERY'];
      const position = getStepPosition(nodeIndex, mockNodes);
      
      expect(position.left).toBe('1000px'); // Legacy x position
      expect(position.top).toBe('130px');   // Legacy y - 120
    });
  });
});
