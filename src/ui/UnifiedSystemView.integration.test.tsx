/**
 * Integration Tests for UnifiedSystemView
 * Feature: unified-topology-necropsy
 * 
 * These tests validate the complete flow of the UnifiedSystemView component:
 * - Claim received → visualization updates
 * - All step statuses (pending, running, success, error, skipped)
 * - Hover interactions on all elements
 * - Canvas cleanup on unmount
 * - No memory leaks or duplicate canvases
 */

import React from 'react';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedSystemView } from './UnifiedSystemView';

// Mock react-p5 to avoid p5.js initialization issues in tests
jest.mock('react-p5', () => {
  return function MockSketch({ setup }: any) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
      if (!containerRef.current || !setup) return;
      
      const container = containerRef.current;
      
      // Create mock canvas that will be added to DOM
      let actualCanvas: HTMLCanvasElement | null = null;
      
      const mockCanvas = {
        parent: (parentElement: HTMLElement) => {
          // Create actual canvas element
          actualCanvas = document.createElement('canvas');
          actualCanvas.width = 1200;
          actualCanvas.height = 500;
          parentElement.appendChild(actualCanvas);
          return mockCanvas;
        },
        id: (canvasId: string) => {
          if (actualCanvas) {
            actualCanvas.id = canvasId;
          }
          return mockCanvas;
        }
      };
      
      const mockP5 = {
        createCanvas: (w: number, h: number) => mockCanvas,
        random: (min: number, max: number) => Math.random() * (max - min) + min
      };
      
      setup(mockP5, container);
      
      return () => {
        if (actualCanvas && actualCanvas.parentElement) {
          actualCanvas.remove();
        }
      };
    }, [setup]);
    
    return React.createElement('div', { ref: containerRef, 'data-testid': 'sketch-container' });
  };
});

describe('UnifiedSystemView - Integration Tests', () => {
  
  afterEach(() => {
    cleanup();
    // Clean up any remaining canvases
    document.querySelectorAll('canvas').forEach(canvas => canvas.remove());
  });

  describe('Complete Flow: Claim Received → Visualization Updates', () => {
    
    it('should update visualization when claim is received', async () => {
      const mockClaim = {
        id: 'CLAIM-001',
        decision: 'APPROVE',
        validationResult: {
          fraudRisk: 'low'
        },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      // Start with no claim (idle state)
      const { rerender, container } = render(<UnifiedSystemView lastClaim={undefined} />);

      // Verify canvas is created
      await waitFor(() => {
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });

      // Verify idle state message is shown
      expect(container.textContent).toContain('Waiting for agent data');

      // Now provide claim data
      rerender(<UnifiedSystemView lastClaim={mockClaim} />);

      // Wait for visualization to update
      await waitFor(() => {
        // Step indicators should be rendered
        const stepIndicators = container.querySelectorAll('[class*="rounded-lg"]');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      // Verify idle message is no longer shown
      expect(container.textContent).not.toContain('Waiting for agent data');
    });

    it('should process multiple claims sequentially', async () => {
      const claim1 = {
        id: 'CLAIM-001',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const claim2 = {
        id: 'CLAIM-002',
        decision: 'INVESTIGATE',
        validationResult: { fraudRisk: 'high' },
        processingTime: 1500,
        status: 'SUCCESS'
      };

      const claim3 = {
        id: 'CLAIM-003',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'medium' },
        processingTime: 800,
        status: 'SUCCESS'
      };

      const { rerender, container } = render(<UnifiedSystemView lastClaim={claim1} />);

      // Wait for first claim to render
      await waitFor(() => {
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });

      // Process second claim
      rerender(<UnifiedSystemView lastClaim={claim2} />);
      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('[class*="rounded-lg"]');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      // Process third claim
      rerender(<UnifiedSystemView lastClaim={claim3} />);
      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('[class*="rounded-lg"]');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      // Verify canvas remains unique throughout
      const canvases = document.querySelectorAll('#unified-system-canvas');
      expect(canvases.length).toBe(1);
    });

    it('should handle transition from idle to processing and back', async () => {
      const mockClaim = {
        id: 'CLAIM-001',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { rerender, container } = render(<UnifiedSystemView lastClaim={undefined} />);

      // Verify idle state
      await waitFor(() => {
        expect(container.textContent).toContain('Waiting for agent data');
      });

      // Transition to processing
      rerender(<UnifiedSystemView lastClaim={mockClaim} />);
      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('[class*="rounded-lg"]');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      // Transition back to idle
      rerender(<UnifiedSystemView lastClaim={undefined} />);
      await waitFor(() => {
        expect(container.textContent).toContain('Waiting for agent data');
      });

      // Canvas should still exist and be unique
      const canvases = document.querySelectorAll('#unified-system-canvas');
      expect(canvases.length).toBe(1);
    });
  });

  describe('All Step Statuses', () => {
    
    it('should display success status for approved claims', async () => {
      const mockClaim = {
        id: 'CLAIM-SUCCESS',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Look for success indicators (green background)
        const successElements = container.querySelectorAll('[class*="bg-green"]');
        expect(successElements.length).toBeGreaterThan(0);
      });
    });

    it('should display error status for failed claims', async () => {
      const mockClaim = {
        id: 'CLAIM-ERROR',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'ERROR'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Look for error indicators (red background)
        const errorElements = container.querySelectorAll('[class*="bg-red"]');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should display skipped status for INVESTIGATE decisions', async () => {
      const mockClaim = {
        id: 'CLAIM-INVESTIGATE',
        decision: 'INVESTIGATE',
        validationResult: { fraudRisk: 'high' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Look for skipped indicators (yellow background)
        const skippedElements = container.querySelectorAll('[class*="bg-yellow"]');
        expect(skippedElements.length).toBeGreaterThan(0);
      });
    });

    it('should display skipped status for INVALID_DATA decisions', async () => {
      const mockClaim = {
        id: 'CLAIM-INVALID',
        decision: 'INVALID_DATA',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Look for skipped indicators (yellow background)
        const skippedElements = container.querySelectorAll('[class*="bg-yellow"]');
        expect(skippedElements.length).toBeGreaterThan(0);
      });
    });

    it('should display error status for SUBMIT_FAILED', async () => {
      const mockClaim = {
        id: 'CLAIM-SUBMIT-FAILED',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUBMIT_FAILED'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Look for error indicators (red background)
        const errorElements = container.querySelectorAll('[class*="bg-red"]');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should render all 5 agent steps for any claim', async () => {
      const mockClaim = {
        id: 'CLAIM-ALL-STEPS',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Should have 5 step indicators (EXTRACT, QUERY, VALIDATE, DECISION, SUBMIT)
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBe(5);
      });
    });

    it('should display appropriate status icons for each status', async () => {
      const mockClaim = {
        id: 'CLAIM-ICONS',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        // Look for SVG icons (lucide-react renders icons as SVG)
        const svgIcons = container.querySelectorAll('svg');
        // Should have step icons + status badge icons
        expect(svgIcons.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Hover Interactions', () => {
    
    it('should handle hover on step indicators', async () => {
      const mockClaim = {
        id: 'CLAIM-HOVER',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      // Get first step indicator container
      const firstStepContainer = container.querySelector('.absolute.pointer-events-auto');
      expect(firstStepContainer).toBeInTheDocument();

      // Get the inner div that has the scale classes
      const firstStepInner = firstStepContainer!.querySelector('[class*="scale"]');
      expect(firstStepInner).toBeInTheDocument();

      // Simulate hover on the container
      fireEvent.mouseEnter(firstStepContainer!);

      // Wait for hover effect (scale-125 class should be applied to inner div)
      await waitFor(() => {
        expect(firstStepInner!.className).toContain('scale-125');
      });

      // Simulate mouse leave
      fireEvent.mouseLeave(firstStepContainer!);

      // Hover effect should be removed (back to scale-100)
      await waitFor(() => {
        expect(firstStepInner!.className).toContain('scale-100');
      });
    });

    it('should handle hover on multiple step indicators sequentially', async () => {
      const mockClaim = {
        id: 'CLAIM-MULTI-HOVER',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');

      // Hover over each step indicator
      for (let i = 0; i < Math.min(stepIndicators.length, 3); i++) {
        const step = stepIndicators[i];
        
        fireEvent.mouseEnter(step);
        await waitFor(() => {
          expect(step).toBeInTheDocument();
        });
        
        fireEvent.mouseLeave(step);
        await waitFor(() => {
          expect(step).toBeInTheDocument();
        });
      }

      // All step indicators should still be rendered
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    it('should maintain hover state without visual glitches', async () => {
      const mockClaim = {
        id: 'CLAIM-HOVER-STABLE',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      const firstStep = container.querySelector('.absolute.pointer-events-auto');
      
      // Rapid hover/unhover
      for (let i = 0; i < 5; i++) {
        fireEvent.mouseEnter(firstStep!);
        fireEvent.mouseLeave(firstStep!);
      }

      // Component should still be stable
      await waitFor(() => {
        expect(firstStep).toBeInTheDocument();
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Canvas Cleanup and Memory Management', () => {
    
    it('should clean up canvas on unmount', async () => {
      const mockClaim = {
        id: 'CLAIM-CLEANUP',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { unmount } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      // Verify canvas exists
      await waitFor(() => {
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Verify canvas is removed
      await waitFor(() => {
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).not.toBeInTheDocument();
      });
    });

    it('should not create duplicate canvases on re-render', async () => {
      const mockClaim = {
        id: 'CLAIM-NO-DUPLICATE',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { rerender } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      // Verify single canvas
      await waitFor(() => {
        const canvases = document.querySelectorAll('#unified-system-canvas');
        expect(canvases.length).toBe(1);
      });

      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        const updatedClaim = {
          ...mockClaim,
          id: `CLAIM-${i}`,
          processingTime: 1000 + i * 100
        };
        rerender(<UnifiedSystemView lastClaim={updatedClaim} />);

        await waitFor(() => {
          const canvases = document.querySelectorAll('#unified-system-canvas');
          expect(canvases.length).toBe(1);
        });
      }
    });

    it('should handle rapid mount/unmount cycles without memory leaks', async () => {
      const mockClaim = {
        id: 'CLAIM-RAPID',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      // Perform multiple mount/unmount cycles
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<UnifiedSystemView lastClaim={mockClaim} />);

        await waitFor(() => {
          const canvas = document.querySelector('#unified-system-canvas');
          expect(canvas).toBeInTheDocument();
        });

        unmount();

        await waitFor(() => {
          const canvas = document.querySelector('#unified-system-canvas');
          expect(canvas).not.toBeInTheDocument();
        });
      }

      // Verify no orphaned canvases remain
      const allCanvases = document.querySelectorAll('canvas');
      expect(allCanvases.length).toBe(0);
    });

    it('should clean up all refs on unmount', async () => {
      const mockClaim = {
        id: 'CLAIM-REFS',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const { unmount } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });

      // Unmount and verify cleanup
      unmount();

      await waitFor(() => {
        // Canvas should be removed
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).not.toBeInTheDocument();

        // No orphaned canvases
        const allCanvases = document.querySelectorAll('canvas');
        expect(allCanvases.length).toBe(0);
      });
    });

    it('should prevent memory leaks with multiple component instances', async () => {
      const mockClaim1 = {
        id: 'CLAIM-INSTANCE-1',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      const mockClaim2 = {
        id: 'CLAIM-INSTANCE-2',
        decision: 'INVESTIGATE',
        validationResult: { fraudRisk: 'high' },
        processingTime: 1500,
        status: 'SUCCESS'
      };

      // Render first instance
      const { unmount: unmount1 } = render(<UnifiedSystemView lastClaim={mockClaim1} />);
      
      await waitFor(() => {
        const canvases = document.querySelectorAll('#unified-system-canvas');
        expect(canvases.length).toBe(1);
      });

      // Unmount first instance
      unmount1();

      await waitFor(() => {
        const canvases = document.querySelectorAll('#unified-system-canvas');
        expect(canvases.length).toBe(0);
      });

      // Render second instance
      const { unmount: unmount2 } = render(<UnifiedSystemView lastClaim={mockClaim2} />);

      await waitFor(() => {
        const canvases = document.querySelectorAll('#unified-system-canvas');
        expect(canvases.length).toBe(1);
      });

      // Unmount second instance
      unmount2();

      await waitFor(() => {
        const canvases = document.querySelectorAll('#unified-system-canvas');
        expect(canvases.length).toBe(0);
      });
    });
  });

  describe('Complete Integration Scenarios', () => {
    
    it('should handle complete claim processing lifecycle', async () => {
      // Start with idle state
      const { rerender, container } = render(<UnifiedSystemView lastClaim={undefined} />);

      // Verify idle state
      await waitFor(() => {
        expect(container.textContent).toContain('Waiting for agent data');
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });

      // Receive first claim
      const claim1 = {
        id: 'CLAIM-LIFECYCLE-1',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 1000,
        status: 'SUCCESS'
      };

      rerender(<UnifiedSystemView lastClaim={claim1} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBe(5);
      });

      // Receive second claim with different status
      const claim2 = {
        id: 'CLAIM-LIFECYCLE-2',
        decision: 'INVESTIGATE',
        validationResult: { fraudRisk: 'high' },
        processingTime: 1500,
        status: 'SUCCESS'
      };

      rerender(<UnifiedSystemView lastClaim={claim2} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBe(5);
        // Should have skipped status (yellow)
        const skippedElements = container.querySelectorAll('[class*="bg-yellow"]');
        expect(skippedElements.length).toBeGreaterThan(0);
      });

      // Return to idle
      rerender(<UnifiedSystemView lastClaim={undefined} />);

      await waitFor(() => {
        expect(container.textContent).toContain('Waiting for agent data');
      });

      // Verify canvas remains unique throughout
      const canvases = document.querySelectorAll('#unified-system-canvas');
      expect(canvases.length).toBe(1);
    });

    it('should maintain visual consistency across different claim types', async () => {
      const claimTypes = [
        {
          id: 'CLAIM-APPROVE',
          decision: 'APPROVE',
          validationResult: { fraudRisk: 'low' },
          processingTime: 1000,
          status: 'SUCCESS'
        },
        {
          id: 'CLAIM-INVESTIGATE',
          decision: 'INVESTIGATE',
          validationResult: { fraudRisk: 'high' },
          processingTime: 1500,
          status: 'SUCCESS'
        },
        {
          id: 'CLAIM-INVALID',
          decision: 'INVALID_DATA',
          validationResult: { fraudRisk: 'medium' },
          processingTime: 800,
          status: 'SUCCESS'
        },
        {
          id: 'CLAIM-ERROR',
          decision: 'APPROVE',
          validationResult: { fraudRisk: 'low' },
          processingTime: 1200,
          status: 'ERROR'
        }
      ];

      const { rerender, container } = render(<UnifiedSystemView lastClaim={claimTypes[0]} />);

      for (const claim of claimTypes) {
        rerender(<UnifiedSystemView lastClaim={claim} />);

        await waitFor(() => {
          // Should always have 5 steps
          const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
          expect(stepIndicators.length).toBe(5);

          // Should always have exactly one canvas
          const canvases = document.querySelectorAll('#unified-system-canvas');
          expect(canvases.length).toBe(1);

          // Should have status-based styling
          const styledElements = container.querySelectorAll('[class*="bg-"]');
          expect(styledElements.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle edge case: very short processing time', async () => {
      const mockClaim = {
        id: 'CLAIM-SHORT-TIME',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 10, // Very short time
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBe(5);

        // Canvas should exist
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should handle edge case: very long processing time', async () => {
      const mockClaim = {
        id: 'CLAIM-LONG-TIME',
        decision: 'APPROVE',
        validationResult: { fraudRisk: 'low' },
        processingTime: 99999, // Very long time
        status: 'SUCCESS'
      };

      const { container } = render(<UnifiedSystemView lastClaim={mockClaim} />);

      await waitFor(() => {
        const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
        expect(stepIndicators.length).toBe(5);

        // Canvas should exist
        const canvas = document.querySelector('#unified-system-canvas');
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should render correctly with all possible fraud risk levels', async () => {
      const riskLevels = ['low', 'medium', 'high'];

      const { rerender, container } = render(<UnifiedSystemView lastClaim={undefined} />);

      for (const risk of riskLevels) {
        const claim = {
          id: `CLAIM-RISK-${risk}`,
          decision: 'APPROVE',
          validationResult: { fraudRisk: risk },
          processingTime: 1000,
          status: 'SUCCESS'
        };

        rerender(<UnifiedSystemView lastClaim={claim} />);

        await waitFor(() => {
          const stepIndicators = container.querySelectorAll('.absolute.pointer-events-auto');
          expect(stepIndicators.length).toBe(5);
        });
      }

      // Verify canvas uniqueness
      const canvases = document.querySelectorAll('#unified-system-canvas');
      expect(canvases.length).toBe(1);
    });
  });
});
