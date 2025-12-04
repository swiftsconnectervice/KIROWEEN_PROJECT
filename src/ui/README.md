# 🎨 UI Components - Evolution Log

This folder contains multiple UI iterations developed with Kiro during the hackathon.

## 🟢 Active Components (Currently Used)

| Component | Description |
|-----------|-------------|
| `FrankenStackDashboard.tsx` | Main entry point - renders LaboratoryView |
| `LaboratoryView.tsx` | 3D laboratory with Tesla coils (Three.js) |
| `FrankensteinTerminal.tsx` | Interactive CRT terminal inside 3D scene |

## 🟡 Available Components (Commented Out)

These components were developed and tested but are currently disabled in the dashboard.
They can be re-enabled by uncommenting imports in `FrankenStackDashboard.tsx`.

| Component | Description | Why Disabled |
|-----------|-------------|--------------|
| `UnifiedSystemView.tsx` | System topology with p5.js | Replaced by 3D lab |
| `SeanceChat.tsx` | AI chat interface | Available as modal |
| `InjectorView.tsx` | Claim injection form | Available as modal |
| `ECGMonitor.tsx` | Connection heartbeat | Integrated in lab |
| `TabNavigation.tsx` | Tab switcher | Single-view mode now |
| `NecropsyView.tsx` | Agent execution timeline | Merged into UnifiedSystemView |

## 🔴 Deprecated Components

| Component | Superseded By | Date |
|-----------|---------------|------|
| `SystemTopology.tsx` | `UnifiedSystemView.tsx` | 2025-12-01 |
| `NecropsyView.tsx` | `UnifiedSystemView.tsx` | 2025-12-01 |

## 🧪 Why Keep All Files?

These files demonstrate the **iterative development process with Kiro**:

1. **V1:** Started with separate topology + timeline views
2. **V2:** Merged into UnifiedSystemView (spec-driven)
3. **V3:** Pivoted to 3D laboratory experience

Each iteration was guided by Kiro's spec-driven development, showing how AI-assisted development enables rapid prototyping and pivoting.

## 📁 Related Specs

- `.kiro/specs/unified-topology-necropsy/` - Spec for merging components
- `.kiro/prompts/vibe-1-attempt.md` - Initial vibe coding attempts
