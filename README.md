# 🏭 SaaS Factory — Fábrica de SaaS com Agentes IA

> Sistema autônomo para criar, deployar e monitorar SaaS completos usando Agentes de IA.
> Fale o que quer → código gerado → deploy automático → monitoramento contínuo.

---

## 🎯 Como funciona

```
Gilson: "Cria um SaaS de barbearia com agendamento e pagamento"
    ↓
🏗️ Agente Arquiteto → planeja stack e estrutura
    ↓
💻 Agente Coder → gera todo o código
    ↓
🔍 Agente Revisor → revisa e corrige bugs
    ↓
🚀 Agente Deploy → cria repo GitHub + deploy Railway
    ↓
📊 Agente Monitor → monitora uptime e erros 24h
    ↓
✅ Gilson recebe: "barbearia.petshopcam.com.br está no ar!"
```

---

## 🤖 Agentes Disponíveis

| Agente | Arquivo | Função |
|--------|---------|--------|
| **Memory** | `agents/memory/` | Memória persistente universal (anti-alucinação) |
| **Coder** | `agents/coder/` | Gera código Next.js, APIs, componentes |
| **Deploy** | `agents/deploy/` | GitHub API + Railway API automatizados |
| **Monitor** | `agents/monitor/` | Verifica uptime, erros, performance |
| **Security** | `agents/security/` | Audita vulnerabilidades, LGPD compliance |
| **Architect** | `agents/architect/` | Planeja arquitetura do SaaS |

---

## 📦 Templates Prontos

| Template | Descrição | Stack |
|----------|-----------|-------|
| `nextjs-saas` | SaaS completo com auth + dashboard | Next.js 16 + Supabase + Tailwind |
| `nextjs-landing` | Landing page de conversão | Next.js + Tailwind |
| `api-only` | Backend API REST | Next.js API Routes + Supabase |

---

## 🚀 Uso

```bash
# Criar novo SaaS do zero
node scripts/create-saas.js --name "barbearia" --template "nextjs-saas"

# Deploy automático
node scripts/deploy.js --project "barbearia" --env production

# Monitorar todos os projetos
node scripts/monitor.js --all
```

---

## 🏗️ SaaS em Produção

| SaaS | URL | Status |
|------|-----|--------|
| PetshopCam | petshopcam.com.br | ✅ Online |
| *(próximo)* | — | 🔜 |

---

## 🔧 Configuração

```env
# GitHub (para criar repos automaticamente)
GITHUB_TOKEN=ghp_...

# Railway (para deploy automático)
RAILWAY_TOKEN=...

# Anthropic (para gerar código com IA)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase (banco compartilhado)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

*Desenvolvido por GLC Desenvolver · 2026*
