# Healthcare AI Assistant 🏥

An elite AI-powered healthcare information assistant with **13 tools** providing real-time access to FDA, ClinicalTrials.gov, PubMed, and Medicare data. Features advanced drug interaction checking and clinical trial evidence.

![Healthcare AI](https://img.shields.io/badge/AI-GPT--5--nano-blue)
![Tools](https://img.shields.io/badge/Tools-13-purple)
![FDA Data](https://img.shields.io/badge/Data-OpenFDA-green)
![Clinical Trials](https://img.shields.io/badge/Data-ClinicalTrials.gov-red)
![PubMed](https://img.shields.io/badge/Data-PubMed-orange)

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

### 2. Set up OpenAI API key (for AI chat)
```bash
export OPENAI_API_KEY="your-api-key-here"
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
| `/` | GET | Server info and capabilities |
| `/health` | GET | Health check |
| `/` | POST | MCP JSON-RPC 2.0 endpoint |
| `/mcp` | POST | MCP JSON-RPC 2.0 endpoint (alt) |
| `/mcp/tools` | GET | List available tools (legacy) |
| `/mcp/call` | POST | Execute a tool (legacy) |

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
