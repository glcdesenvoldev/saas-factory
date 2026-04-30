/**
 * Memory Agent — Universal
 * Sistema de memória persistente para todos os agentes da fábrica
 * Previne alucinação consultando histórico antes de agir
 * Compatível com qualquer SaaS criado pela fábrica
 */

export interface MemoryEntry {
  agent_id:    string;
  project_id:  string;
  action_type: string;
  title:       string;
  input?:      string;
  output?:     string;
  success:     boolean;
  error_msg?:  string;
  duration_ms?: number;
  metadata?:   Record<string, unknown>;
  created_at?: string;
}

export interface AgentStatus {
  agent_id:   string;
  status:     "idle" | "running" | "success" | "error";
  last_action?: string;
  last_run?:  string;
}

export class AgentMemory {
  private supabaseUrl:  string;
  private serviceKey:   string;

  constructor(supabaseUrl: string, serviceKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.serviceKey  = serviceKey;
  }

  private get headers() {
    return {
      "apikey":        this.serviceKey,
      "Authorization": `Bearer ${this.serviceKey}`,
      "Content-Type":  "application/json",
      "Prefer":        "return=representation",
    };
  }

  async log(entry: MemoryEntry): Promise<string> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/agent_memory`, {
      method:  "POST",
      headers: this.headers,
      body:    JSON.stringify(entry),
    });
    const data = await res.json();
    return data?.[0]?.id ?? "";
  }

  async recall(agentId: string, projectId?: string, limit = 20): Promise<MemoryEntry[]> {
    let url = `${this.supabaseUrl}/rest/v1/agent_memory?agent_id=eq.${agentId}&order=created_at.desc&limit=${limit}`;
    if (projectId) url += `&project_id=eq.${projectId}`;
    const res  = await fetch(url, { headers: this.headers });
    return res.json();
  }

  async alreadyDone(agentId: string, title: string, withinMinutes = 60): Promise<boolean> {
    const since = new Date(Date.now() - withinMinutes * 60000).toISOString();
    const url   = `${this.supabaseUrl}/rest/v1/agent_memory?agent_id=eq.${agentId}&title=eq.${encodeURIComponent(title)}&success=eq.true&created_at=gte.${since}&limit=1`;
    const res   = await fetch(url, { headers: this.headers });
    const data  = await res.json();
    return Array.isArray(data) && data.length > 0;
  }

  async setStatus(agentId: string, status: AgentStatus["status"], action?: string) {
    await fetch(`${this.supabaseUrl}/rest/v1/agent_status`, {
      method:  "POST",
      headers: { ...this.headers, "Prefer": "resolution=merge-duplicates" },
      body:    JSON.stringify({
        agent_id:    agentId,
        agent_name:  agentId,
        status,
        last_action: action,
        last_run:    new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }),
    });
  }
}

// Factory — cria instância com as credenciais do ambiente
export function createMemory(): AgentMemory {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return new AgentMemory(url, key);
}
