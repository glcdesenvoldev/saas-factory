#!/usr/bin/env node
/**
 * create-saas.ts
 * Script principal da fábrica — cria um SaaS do zero
 * 
 * Uso:
 *   npx tsx scripts/create-saas.ts --name barbearia --segment barbearia
 *   npx tsx scripts/create-saas.ts --name clinica --segment "clínica veterinária"
 */
import { deployAgent } from "../agents/deploy/index.js";
import { coderAgent }  from "../agents/coder/index.js";
import { createMemory }from "../agents/memory/index.js";

const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const projectName = getArg("--name")    ?? "novo-saas";
const segment     = getArg("--segment") ?? "genérico";
const description = getArg("--desc")    ?? `SaaS de ${segment} criado pela Fábrica`;

async function main() {
  const memory = createMemory();
  console.log(`\n🏭 Fábrica de SaaS — Criando: ${projectName}\n`);

  // 1. Cria repositório
  console.log("📦 [1/4] Criando repositório GitHub...");
  const repoUrl = await deployAgent.createRepo({ projectName, description });
  console.log(`   ✅ ${repoUrl}`);

  // 2. Gera estrutura base
  console.log("💻 [2/4] Gerando estrutura base com IA...");
  const base = await coderAgent.generate({
    projectName,
    segment,
    feature: "estrutura base do projeto (layout, sidebar, dashboard inicial)",
    context: `SaaS para ${segment} no mercado brasileiro. Foco em simplicidade e conversão.`,
  });
  console.log(`   ✅ ${base.files.length} arquivos gerados`);

  // 3. Faz push para o GitHub
  console.log("🚀 [3/4] Fazendo push para GitHub...");
  const pushed = await deployAgent.pushCode(projectName, base.files);
  console.log(`   ${pushed ? "✅" : "❌"} Push ${pushed ? "realizado" : "falhou"}`);

  // 4. Registra na memória da fábrica
  console.log("🧠 [4/4] Registrando na memória...");
  await memory.log({
    agent_id:    "factory",
    project_id:  projectName,
    action_type: "deploy",
    title:       `SaaS criado: ${projectName}`,
    output:      repoUrl,
    success:     pushed,
    metadata:    { segment, repoUrl, fileCount: base.files.length },
  });

  console.log(`\n✅ SaaS "${projectName}" criado com sucesso!`);
  console.log(`📂 GitHub: ${repoUrl}`);
  console.log(`\n📋 Próximos passos:`);
  base.nextSteps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));
  console.log(`\n🚀 Para fazer deploy: npx tsx scripts/deploy.js --project ${projectName}\n`);
}

main().catch(console.error);
