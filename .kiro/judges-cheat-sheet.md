# Judges' Cheat Sheet: FrankenStack

## Kiro Feature Showcase (Dónde ver cada cosa)

* **Spec-Driven Generation (IA como Arquitecto):**
    * `.kiro/steering/product.md` (La misión)
    * `.kiro/specs/as400-mcp-spec.md` (El plano técnico generado por IA)

* **Refactorización Iterativa (Prueba de V1 -> V2):**
    * `.kiro/prompts/spec-forensics.md` (El análisis de "código malo")
    * `.kiro/logs/refactoring-iterations.md` (El log de 3 intentos fallidos)

* **Hooks (Sistema Nervioso / Orquestación):**
    * `.kiro/hooks/` (Los 5 "reflejos" del sistema)
    * `.kiro/logs/hooks-chain.md` (Prueba de la cadena de hooks)

* **Infrastructure-as-Spec (IA como DevOps):**
    * `.kiro/steering/architecture-as-code.md` (El "generador" de infra)
    * `/infrastructure/` (Los archivos Docker/AWS generados)

* **Integración MCP Real (Conexión al Mundo Real):**
    * `.kiro/mcp/github-integration.md` (Documentación del commit automático)
    * `src/agents/claim-revenant-agent.ts` (Ver el método `commitDecisionToGitHub`)

* **Generación de Pruebas (Test Suite de Asalto):**
    * `src/agents/claim-revenant-agent.test.ts` (Pruebas de edge cases)