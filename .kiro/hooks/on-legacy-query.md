// src/hooks/on-legacy-query.ts
// Trigger: MCP server executes a query
// Action: If query > 3000ms, log to .kiro/logs/performance.md

import * as fs from 'fs';

export function onLegacyQuery(query: string, duration: number) {
  if (duration > 3000) {
    const timestamp = new Date().toISOString();
    const logEntry = `\n[${timestamp}] SLOW QUERY (${duration}ms): ${query}`;
    
    // Asegurarse de que la carpeta de logs exista
    if (!fs.existsSync('.kiro/logs')) {
      fs.mkdirSync('.kiro/logs');
    }
    fs.appendFileSync('.kiro/logs/performance.md', logEntry);
    console.log(`HOOK: Slow query detected and logged.`);
  }
}