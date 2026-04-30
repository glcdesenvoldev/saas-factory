/**
 * Deploy Agent — Universal
 * Cria repositórios GitHub e deploya no Railway automaticamente
 * Usado pela fábrica para lançar qualquer novo SaaS
 */
import { createMemory } from "../memory/index.js";

const AGENT_ID     = "deploy_agent";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN ?? "";
const GITHUB_USER  = process.env.GITHUB_USER ?? "glcdesenvoldev";

export interface DeployConfig {
  projectName:  string;
  description:  string;
  isPrivate?:   boolean;
  envVars?:     Record<string, string>;
  sourcePath?:  string;
}

export const deployAgent = {
  // 1. Cria repositório no GitHub
  async createRepo(config: DeployConfig): Promise<string> {
    const memory = createMemory();
    await memory.setStatus(AGENT_ID, "running", `Criando repo: ${config.projectName}`);

    const res  = await fetch("https://api.github.com/user/repos", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        name:        config.projectName,
        description: config.description,
        private:     config.isPrivate ?? false,
        auto_init:   true,
      }),
    });

    const data = await res.json();
    const url  = data.html_url ?? "";

    await memory.log({
      agent_id:    AGENT_ID,
      project_id:  config.projectName,
      action_type: "deploy",
      title:       `Repo criado: ${config.projectName}`,
      output:      url,
      success:     res.ok,
      error_msg:   res.ok ? undefined : data.message,
    });

    return url;
  },

  // 2. Verifica status de deployments no Railway
  async getStatus(projectId: string): Promise<{ status: string; url: string }> {
    const query = `{
      project(id: "${projectId}") {
        services {
          edges {
            node {
              name
              deployments(first: 1) {
                edges {
                  node { status url }
                }
              }
            }
          }
        }
      }
    }`;

    const res  = await fetch("https://backboard.railway.com/graphql/v2", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${RAILWAY_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data       = await res.json();
    const service    = data.data?.project?.services?.edges?.[0]?.node;
    const deployment = service?.deployments?.edges?.[0]?.node;

    return {
      status: deployment?.status ?? "unknown",
      url:    deployment?.url    ?? "",
    };
  },

  // 3. Lista todos os projetos Railway
  async listProjects(): Promise<{ id: string; name: string }[]> {
    const res  = await fetch("https://backboard.railway.com/graphql/v2", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${RAILWAY_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ query: "{ projects { edges { node { id name } } } }" }),
    });
    const data = await res.json();
    return (data.data?.projects?.edges ?? []).map((e: { node: { id: string; name: string } }) => e.node);
  },

  // 4. Faz push de código para o repo
  async pushCode(repoName: string, files: { path: string; content: string }[]): Promise<boolean> {
    const memory = createMemory();

    for (const file of files) {
      const content = Buffer.from(file.content).toString("base64");
      const res     = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/contents/${file.path}`, {
        method:  "PUT",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          message: `feat: add ${file.path}`,
          content,
        }),
      });

      if (!res.ok) {
        await memory.log({
          agent_id:    AGENT_ID,
          project_id:  repoName,
          action_type: "deploy",
          title:       `Erro ao fazer push: ${file.path}`,
          success:     false,
          error_msg:   `HTTP ${res.status}`,
        });
        return false;
      }
    }

    await memory.log({
      agent_id:    AGENT_ID,
      project_id:  repoName,
      action_type: "deploy",
      title:       `Push realizado: ${files.length} arquivo(s)`,
      success:     true,
      metadata:    { files: files.map((f) => f.path) },
    });

    await memory.setStatus(AGENT_ID, "success", `Push: ${repoName}`);
    return true;
  },
};
