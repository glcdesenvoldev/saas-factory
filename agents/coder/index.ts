/**
 * Coder Agent — Universal
 * Gera código completo para qualquer SaaS usando Claude
 * Usa memória para não repetir erros e manter consistência
 */
import Anthropic from "@anthropic-ai/sdk";
import { createMemory } from "../memory/index.js";

const AGENT_ID = "coder_agent";
const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CodeRequest {
  projectName: string;
  segment:     string; // petshop, barbearia, restaurante, clínica...
  feature:     string; // dashboard, landing, payment, cameras...
  context?:    string; // contexto adicional
  stack?:      string; // stack específica (padrão: Next.js + Supabase + Tailwind)
}

export interface CodeResult {
  files: { path: string; content: string }[];
  explanation: string;
  nextSteps: string[];
}

export const coderAgent = {
  async generate(request: CodeRequest): Promise<CodeResult> {
    const memory = createMemory();
    const title  = `Gerar ${request.feature} para ${request.projectName}`;
    const start  = Date.now();

    // Anti-alucinação: verifica histórico do projeto
    const history = await memory.recall(AGENT_ID, request.projectName, 10);
    const doneFeatures = history
      .filter((h) => h.success)
      .map((h) => h.title)
      .slice(0, 5)
      .join(", ");

    await memory.setStatus(AGENT_ID, "running", title);

    const prompt = `Você é um desenvolvedor sênior especialista em SaaS para o mercado brasileiro.

PROJETO: ${request.projectName} (${request.segment})
FEATURE: ${request.feature}
STACK: ${request.stack ?? "Next.js 16 App Router + TypeScript + Tailwind CSS + Supabase"}
CONTEXTO: ${request.context ?? "Nenhum"}
FEATURES JÁ IMPLEMENTADAS: ${doneFeatures || "Nenhuma ainda"}

Gere o código completo para esta feature. Retorne APENAS JSON válido:
{
  "files": [
    { "path": "src/app/...", "content": "código completo aqui" }
  ],
  "explanation": "explicação do que foi criado",
  "nextSteps": ["próximo passo 1", "próximo passo 2"]
}

REGRAS:
- TypeScript obrigatório
- Tailwind CSS para estilos (paleta dark: bg-[#0D1B2A], surface: #1E3050, accent: #F97316/#14B8A6)
- Componentes com "use client" quando necessário
- Código funcional e testável
- Comentários em português
- Não repita features já implementadas`;

    try {
      const response = await client.messages.create({
        model:      "claude-sonnet-4-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });

      const text   = response.content[0].type === "text" ? response.content[0].text : "{}";
      const clean  = text.replace(/```json\n?|\n?```/g, "").trim();
      const result = JSON.parse(clean) as CodeResult;

      await memory.log({
        agent_id:    AGENT_ID,
        project_id:  request.projectName,
        action_type: "code",
        title,
        input:       `${request.segment} / ${request.feature}`,
        output:      `${result.files.length} arquivo(s): ${result.files.map((f) => f.path).join(", ")}`,
        success:     true,
        duration_ms: Date.now() - start,
        metadata:    { fileCount: result.files.length, segment: request.segment },
      });

      await memory.setStatus(AGENT_ID, "success", `${result.files.length} arquivos gerados`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      await memory.log({
        agent_id:    AGENT_ID,
        project_id:  request.projectName,
        action_type: "code",
        title,
        success:     false,
        error_msg:   msg,
        duration_ms: Date.now() - start,
      });
      await memory.setStatus(AGENT_ID, "error", msg);
      throw err;
    }
  },
};
