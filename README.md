# Delta Instrument

**Cross-architecture epistemic analysis — Diplomat / Witness / Adversary / Evaluator ensemble**

Delta Instrument submits a single claim or text to three different AI models across four structured passes, then computes a structured "delta" measuring where the models agree, disagree, and what they all miss.

## How It Works

The instrument runs four sequential passes against your input:

| Pass | Role | Model | What it does |
|------|------|-------|-------------|
| **Diplomat** | Coherence maximizer | Claude Sonnet (Anthropic) | Synthesizes the strongest, most unified interpretation of the input |
| **Witness** | Friction maximizer | Mistral Large (OpenRouter) | Surfaces fracture points, contradictions, and unstated assumptions |
| **Adversary** | Attack layer | GPT-4o (OpenRouter) | Attacks both Diplomat and Witness — flags false agreements and shared blind spots |
| **Evaluator** | Structured delta | GPT-4o (OpenRouter) | Computes a JSON delta: semantic divergence, omission gaps, friction markers, over-coherence signals |

Three models are used across four passes (GPT-4o handles both the Adversary and Evaluator roles).

## Architecture

```text
├── api/
│   └── run-delta.js      # Vercel serverless function — proxies all API calls
├── src/
│   ├── App.jsx            # React UI — input, progress, results display
│   └── main.jsx           # Entry point
├── index.html             # Vite HTML shell
├── vite.config.js         # Vite config
├── vercel.json            # Vercel routing config
└── package.json
```

## Prerequisites

- **Node.js** ≥ 18
- **Vercel account** — this app requires Vercel deployment because the AI calls run through a serverless function (`api/run-delta.js`). Static hosting will not work.
- **Two API keys** (set as Vercel environment variables):

| Variable | Required | Source |
|----------|----------|--------|
| `ANTHROPIC_API_KEY` | Yes | [Anthropic Console](https://console.anthropic.com/) — for the Diplomat pass (Claude) |
| `OPENROUTER_API_KEY` | Yes | [OpenRouter](https://openrouter.ai/) — for Witness (Mistral), Adversary (GPT-4o), and Evaluator (GPT-4o) |

## Development

### Local development with Vercel CLI

```bash
# Install dependencies
npm install

# Install Vercel CLI if you don't have it
npm i -g vercel

# Create a .env file with your API keys
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and OPENROUTER_API_KEY

# Run locally (serves both frontend + serverless functions)
vercel dev
```

> **Note:** `npm run dev` starts only the Vite frontend — the serverless function at `api/run-delta.js` will not be available. Use `vercel dev` for the full experience.

### Production deployment

```bash
# Deploy to Vercel
vercel --prod

# Then set environment variables in the Vercel dashboard:
# ANTHROPIC_API_KEY and OPENROUTER_API_KEY
```

## Input Limits

Prompts are capped at 8,000 characters to prevent excessive API costs. The serverless function will return a 400 error if the input exceeds this limit.

## License

MIT
