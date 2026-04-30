#!/usr/bin/env node
/**
 * monitor-all.ts
 * Verifica saúde de todos os projetos Railway
 * Pode ser rodado como cron job
 */
import { monitorAgent } from "../agents/monitor/index.js";

async function main() {
  console.log("📊 Monitor — Verificando todos os projetos...\n");

  const results = await monitorAgent.checkAll();

  for (const r of results) {
    const icon = r.status === "healthy" ? "✅" : r.status === "degraded" ? "⚠️" : r.status === "down" ? "❌" : "❓";
    console.log(`${icon} ${r.projectName.padEnd(25)} ${r.status.padEnd(10)} ${r.latencyMs ? `${r.latencyMs}ms` : ""}`);
  }

  const down = results.filter((r) => r.status === "down");
  if (down.length > 0) {
    console.log(`\n🚨 ${down.length} projeto(s) offline: ${down.map((r) => r.projectName).join(", ")}`);
    process.exit(1);
  } else {
    console.log(`\n✅ Todos os ${results.length} projetos estão online!`);
  }
}

main().catch(console.error);
