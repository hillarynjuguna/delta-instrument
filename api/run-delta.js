// Vercel Serverless Function — Delta Instrument v0.2 Backend Proxy
// Routes requests to Anthropic (Claude) and OpenRouter (Mistral, GPT)
// API keys stored in Vercel environment variables, never client-side

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Missing or empty prompt" });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

  if (!ANTHROPIC_KEY || !OPENROUTER_KEY) {
    return res.status(500).json({ error: "Server missing API keys. Set ANTHROPIC_API_KEY and OPENROUTER_API_KEY in Vercel environment variables." });
  }

  const log = [];
  const ts = () => new Date().toISOString().slice(11, 19);

  // --- SYSTEM PROMPTS ---
  const DIPLOMAT_SYSTEM = `You are operating in DIPLOMAT mode. Strict contract:
1. Analyze the input with MAXIMUM coherence, synthesis, and resolution.
2. Produce the most unified, structurally complete response possible.
3. Resolve ALL tensions. Weave ALL threads into a single narrative.
4. If there are contradictions, reconcile them. If open questions exist, answer them.
5. Optimize for: clarity, completeness, structural elegance, confidence.
6. Do NOT hedge. Do NOT leave threads unresolved. Output should feel FINISHED.
300-600 words. Dense. Every sentence load-bearing.`;

  const WITNESS_SYSTEM = `You are operating in WITNESS mode. Strict structural contract:
1. You may NOT synthesize. You may NOT resolve tensions. You may NOT produce conclusions.
2. Surface: fracture points, contradictions, unstated assumptions, things that don't fit, places where the input is doing work it hasn't earned.
3. Report FRICTION: where does the input resist understanding? Where is it too smooth? What is papered over?
4. Name what is ABSENT. What should be here but isn't? What question isn't being asked?
5. If you want to connect two ideas — STOP. Report the gap instead of bridging it.
6. Produce honest wrongness rather than polished rightness. Do NOT soften.
7. Where you would normally refuse or deflect — name the refusal itself as data.
Format: Numbered fracture map. Each item standalone. No narrative arc. No connective tissue. 10-20 items. Each 1-3 sentences.`;

  const ADVERSARY_SYSTEM = `You are an ADVERSARY. You receive three things:
1. An original input/claim
2. A Diplomat analysis (from Claude — coherence-maximized)
3. A Witness fracture map (from Mistral — friction-maximized)

Your job is to ATTACK BOTH. Specifically:
- Where do Diplomat and Witness secretly agree? That agreement is suspicious — flag it.
- Where does the Diplomat resolve something the Witness left open? Is the resolution earned or forced?
- Where does the Witness surface friction that the Diplomat should have caught? Why didn't it?
- Where is the Witness performing friction rather than genuinely surfacing it?
- What did BOTH miss? Name the shared blind spots.
- Where would a human with actual stakes disagree with both?
- What would each pass REFUSE to say?

Format: Structured attack. 8-15 items. Each names the target (Diplomat/Witness/Both), the attack, and why it matters. No diplomatic framing. Be harsh.`;

  const EVALUATOR_SYSTEM = `You are a Delta Evaluator. You receive four inputs:
1. Original claim/input
2. Diplomat pass (Claude — coherence-maximized)
3. Witness pass (Mistral — friction-maximized)
4. Adversary pass (GPT — attacks both)

Compute a structured delta. Respond ONLY in valid JSON. No preamble, no markdown backticks, no explanation outside the JSON.

CALIBRATION RULES:
- semantic_divergence: 0 = identical claims, 1 = contradictory worldviews. Measure between Diplomat and Witness.
- triangular_tension: How much does the Adversary disagree with BOTH? High = real signal. Low = shared blind spots.
- If semantic_divergence < 0.15 across different architectures: flag as FALSE AGREEMENT.
- over_coherence: flag Diplomat claims too smooth for their epistemic warrant
- irreducible_residue: what ALL THREE passes missed. Hardest field. Most important.
- refusal_delta: what each pass avoided or deflected
- friction_markers type: unstated_assumption | premature_resolution | missing_evidence | false_equivalence | scope_evasion | confidence_without_warrant | architectural_blind_spot

JSON schema:
{
  "semantic_divergence": { "score": 0.0, "description": "string", "key_divergences": ["string"] },
  "triangular_tension": { "score": 0.0, "adversary_vs_diplomat": 0.0, "adversary_vs_witness": 0.0, "false_agreement_zones": ["string"] },
  "omission_gaps": { "diplomat_omitted": ["string"], "witness_omitted": ["string"], "adversary_omitted": ["string"], "shared_blind_spots": ["string"] },
  "friction_markers": { "count": 0, "markers": [{"location": "string", "type": "string", "severity": 0.0, "source": "string"}] },
  "over_coherence_signals": { "score": 0.0, "signals": [{"claim": "string", "suspicion": "string"}] },
  "refusal_delta": { "diplomat_avoided": ["string"], "witness_avoided": ["string"], "adversary_avoided": ["string"] },
  "irreducible_residue": { "items": [{"description": "string", "why_irreducible": "string"}] },
  "instrument_confidence": { "score": 0.0, "failure_risk": "string", "epistemic_trap": false }
}`;

  // --- API CALL HELPERS ---
  async function callAnthropic(system, userMsg) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system,
          messages: [{ role: "user", content: userMsg }],
        }),
        signal: controller.signal,
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return data.content?.map((b) => b.text || "").join("\n") || "";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function callOpenRouter(model, system, userMsg) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://delta-instrument.vercel.app",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
        }),
        signal: controller.signal,
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return data.choices?.[0]?.message?.content || "";
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    // Phase 1: Diplomat (Claude) + Witness (Mistral) in parallel
    log.push(`${ts()} [PHASE 1] Diplomat (Claude) + Witness (Mistral) — parallel`);

    const [diplomat, witness] = await Promise.all([
      callAnthropic(DIPLOMAT_SYSTEM, `Analyze the following claim. Apply your full Diplomat contract.\n\nINPUT:\n${prompt}`),
      callOpenRouter("mistralai/mistral-large-latest", WITNESS_SYSTEM, `Produce a fracture map of the following claim. Apply your full Witness contract.\n\nINPUT:\n${prompt}`),
    ]);

    log.push(`${ts()} [PHASE 1] Complete. Diplomat: ${diplomat.length}c, Witness: ${witness.length}c`);

    // Phase 2: Adversary (GPT-4o)
    log.push(`${ts()} [PHASE 2] Adversary (GPT-4o) — attacks both`);
    const advInput = `ORIGINAL INPUT:\n${prompt}\n\n---\nDIPLOMAT PASS (Claude):\n${diplomat}\n\n---\nWITNESS PASS (Mistral):\n${witness}`;
    const adversary = await callOpenRouter("openai/gpt-4o", ADVERSARY_SYSTEM, advInput);
    log.push(`${ts()} [PHASE 2] Complete. Adversary: ${adversary.length}c`);

    // Phase 3: Evaluator (GPT-4o)
    log.push(`${ts()} [PHASE 3] Evaluator (GPT-4o) — structured delta`);
    const evalInput = `ORIGINAL INPUT:\n${prompt}\n\n---\nDIPLOMAT (Claude):\n${diplomat}\n\n---\nWITNESS (Mistral):\n${witness}\n\n---\nADVERSARY (GPT):\n${adversary}`;
    const deltaRaw = await callOpenRouter("openai/gpt-4o", EVALUATOR_SYSTEM, evalInput);
    log.push(`${ts()} [PHASE 3] Complete.`);

    // Parse delta JSON
    let delta;
    try {
      const cleaned = deltaRaw.replace(/```json|```/g, "").trim();
      delta = JSON.parse(cleaned);
    } catch (e) {
      log.push(`${ts()} [ERROR] Delta JSON parse failed`);
      return res.status(200).json({
        diplomat, witness, adversary, delta: null, deltaRaw, log,
        error: "Delta evaluation returned non-JSON. Raw output preserved in deltaRaw."
      });
    }

    log.push(`${ts()} [DONE] All 4 passes complete.`);
    return res.status(200).json({ diplomat, witness, adversary, delta, log });

  } catch (err) {
    log.push(`${ts()} [FATAL] ${err.message}`);
    return res.status(500).json({ error: err.message, log });
  }
}
