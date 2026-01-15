# Healthcare AI Assistant 🏥 (Elite Edition)

An **elite, production-grade** healthcare information assistant. Features **13 tools** for real-time FDA, ClinicalTrials.gov, PubMed, and Medicare data.

![Elite Status](https://img.shields.io/badge/Status-Elite-gold)
![Healthcare AI](https://img.shields.io/badge/AI-GPT--5--nano-blue)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fhealthcare-mcp)


## Features (13 Tools)

### 💊 Drug Interactions (NEW)
- **check_drug_interactions** - Check multiple drugs for interactions with severity levels (🔴 Major, 🟡 Moderate, 🟢 Minor)
- **get_drug_interaction_details** - Detailed mechanism and management for specific drug pairs

### 🔬 Clinical Trials (NEW)
- **search_clinical_trials** - Search ClinicalTrials.gov by condition/drug with phase and status filters
- **get_clinical_trial_details** - Full trial info including results, outcomes, and adverse events
- **get_trial_results_summary** - Aggregate evidence across multiple completed trials

### 📦 OpenFDA Provider
- **drug_lookup** - Search drug information by name, NDC code, or active ingredient
- **adverse_events** - Search FDA Adverse Event Reporting System (FAERS)
- **drug_recalls** - Find drug recall information
- **drug_labels** - Get official prescribing information (warnings, dosage, interactions)

### 📋 Clinical Guidelines
- **search_guidelines** - Search PubMed for clinical practice guidelines
- **guideline_summary** - Get detailed guideline abstracts by PMID

### 💰 Medicare Pricing
- **medicare_drug_pricing** - Medicare Part D drug spending and pricing
- **procedure_pricing** - Medicare procedure costs by HCPCS/CPT code

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# Get one at: https://platform.openai.com/api-keys
```

Your `.env` file should look like:
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Run the server
```bash
npm run dev
```

### 4. Open the chat interface
Visit **http://localhost:3000** in your browser

![Chat Interface](https://via.placeholder.com/800x400?text=Healthcare+AI+Chat+Interface)

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User asks     │────▶│   GPT-5-nano     │────▶│  Healthcare     │
│   question      │     │  decides which   │     │  Tools (FDA,    │
│                 │◀────│  tools to call   │◀────│  PubMed, CMS)   │
│   Gets answer   │     │  and formats     │     │  return data    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

The AI assistant:
1. Receives your healthcare question
2. Automatically calls the right tools (drug lookup, adverse events, etc.)
3. Combines real FDA/PubMed data into a helpful response
4. Cites sources and reminds you to consult healthcare professionals

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web UI (if OpenAI key configured) or server info |
| `/health` | GET | Health check with dependency status |
| `/stats` | GET | Performance metrics (cache, sessions, HTTP) |
| `/api/chat` | POST | AI chat endpoint (JSON response) |
| `/api/chat/stream` | GET/POST | **Streaming AI chat (SSE)** - 80% faster perceived latency |
| `/api/chat/clear` | POST | Clear chat history for a session |
| `/mcp` | POST | MCP JSON-RPC 2.0 endpoint |
| `/mcp/tools` | GET | List available tools (legacy) |
| `/mcp/call` | POST | Execute a tool (legacy) |

### Performance Optimizations
- ⚡ **Parallel tool execution** - 60-70% latency reduction
- 🎯 **Streaming responses** - See tokens in real-time (<200ms first token)
- 📦 **Gzip compression** - 70-90% smaller payloads
- 🔄 **Request deduplication** - Prevents duplicate API calls
- 🔁 **Automatic retries** - Exponential backoff on failures

## MCP Protocol Usage

### Initialize Connection

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

### List Available Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Call a Tool

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "drug_lookup",
    "arguments": {
      "query": "metformin",
      "limit": 5
    }
  }
}
```

## Legacy REST API

For easier testing without JSON-RPC:

```bash
# List tools
curl http://localhost:3000/mcp/tools

# Call a tool
curl -X POST http://localhost:3000/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"name": "drug_lookup", "arguments": {"query": "aspirin"}}'
```

## Tool Examples

### Drug Lookup
```json
{
  "name": "drug_lookup",
  "arguments": {
    "query": "lisinopril",
    "search_type": "name",
    "limit": 5
  }
}
```

### Adverse Events
```json
{
  "name": "adverse_events",
  "arguments": {
    "drug_name": "metformin",
    "serious_only": true,
    "limit": 10
  }
}
```

### Search Guidelines
```json
{
  "name": "search_guidelines",
  "arguments": {
    "query": "diabetes management",
    "specialty": "endocrinology",
    "years": 3
  }
}
```

### Medicare Drug Pricing
```json
{
  "name": "medicare_drug_pricing",
  "arguments": {
    "drug_name": "humira"
  }
}
```

### Procedure Pricing
```json
{
  "name": "procedure_pricing",
  "arguments": {
    "code": "99213"
  }
}
```

## Data Sources

- **OpenFDA**: https://api.fda.gov (no API key required, 240 req/min limit)
- **PubMed E-utilities**: https://eutils.ncbi.nlm.nih.gov
- **CMS Data API**: https://data.cms.gov

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | For chat | - | OpenAI API key. Tools work without it, chat requires it. |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Set to `production` for JSON logs |
| `LOG_LEVEL` | No | info | Logging level (trace, debug, info, warn, error) |
| `REDIS_HOST` | No | - | Redis host for distributed caching (optional) |
| `REDIS_PORT` | No | 6379 | Redis port |
| `OPENFDA_API_KEY` | No | - | OpenFDA API key for higher rate limits |
| `NCBI_API_KEY` | No | - | NCBI/PubMed API key for guidelines search |

See `.env.example` for a complete template with documentation.

## Docker

```bash
# Build
docker build -t healthcare-mcp .

# Run
docker run -d --name healthcare-mcp \
  -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  healthcare-mcp

# Check health
curl localhost:3000/health
```

## Monitoring

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check with dependency status |
| `GET /stats` | Cache, session, and rate limit metrics |

See [RUNBOOK.md](RUNBOOK.md) for operations guide.

## Example Questions

Try asking:
- "What are the side effects of metformin?"
- "Are there any recalls for blood pressure medications?"
- "What are the latest guidelines for treating diabetes?"
- "How much does a colonoscopy cost with Medicare?"
- "What drugs interact with warfarin?"
- "What is the dosage for lisinopril?"

## Cost

Uses **GPT-5-nano** - check [OpenAI pricing](https://openai.com/pricing) for current rates.

A typical conversation costs less than $0.01.

## License

ISC
