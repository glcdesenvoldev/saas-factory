/**
 * Monitor Agent — Universal
 * Verifica uptime de todos os projetos da fábrica
 * Alerta quando serviço cair ou tiver erros
 */
import { createMemory } from "../memory/index.js";

const AGENT_ID      = "monitor";
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN ?? "";

interface ProjectHealth {
  projectId:   string;
  projectName: string;
  status:      "healthy" | "degraded" | "down" | "unknown";
  httpCode?:   number;
  url?:        string;
  latencyMs?:  number;
  checkedAt:   string;
}

export const monitorAgent = {
  // Verifica saúde de uma URL
  async checkUrl(url: string): Promise<{ ok: boolean; code: number; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
      return { ok: res.ok, code: res.status, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, code: 0, latencyMs: Date.now() - start };
    }
  },

  // Verifica todos os projetos Railway
  async checkAll(): Promise<ProjectHealth[]> {
    const memory  = createMemory();
    const results: ProjectHealth[] = [];

    await memory.setStatus(AGENT_ID, "running", "Verificando todos os projetos...");

    // Lista projetos
    const res = await fetch("https://backboard.railway.com/graphql/v2", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${RAILWAY_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        query: `{
          projects {
            edges {
              node {
                id name
                services {
                  edges {
                    node {
                      name
                      deployments(first: 1) {
                        edges { node { status url } }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      }),
    });

    const data     = await res.json();
    const projects = data.data?.projects?.edges ?? [];

    for (const { node: project } of projects) {
      const service    = project.services?.edges?.[0]?.node;
      const deployment = service?.deployments?.edges?.[0]?.node;
      const deployUrl  = deployment?.url;

      let health: ProjectHealth = {
        projectId:   project.id,
        projectName: project.name,
        status:      "unknown",
        checkedAt:   new Date().toISOString(),
      };

      if (deployUrl) {
        const url    = deployUrl.startsWith("http") ? deployUrl : `https://${deployUrl}`;
        const check  = await monitorAgent.checkUrl(url);
        health = {
          ...health,
          url,
          httpCode:  check.code,
          latencyMs: check.latencyMs,
          status:    check.ok ? (check.latencyMs > 3000 ? "degraded" : "healthy") : "down",
        };
      } else if (deployment?.status === "SUCCESS") {
        health.status = "healthy";
      }

      results.push(health);

      // Registra na memória
      await memory.log({
        agent_id:    AGENT_ID,
        project_id:  project.id,
        action_type: "monitor",
        title:       `Health check: ${project.name}`,
        output:      health.status,
        success:     health.status !== "down",
        metadata:    { httpCode: health.httpCode, latencyMs: health.latencyMs },
      });
    }

    const downCount = results.filter((r) => r.status === "down").length;
    await memory.setStatus(
      AGENT_ID,
      downCount > 0 ? "error" : "success",
      `${results.length} projetos verificados, ${downCount} down`
    );

    return results;
  },
};
