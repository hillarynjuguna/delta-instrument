import { useState } from "react";

const MONO = "'Courier New', 'JetBrains Mono', monospace";
const SAMPLES = [
  "Reinforcement learning from human feedback (RLHF) is the only scalable method for aligning frontier AI systems, and any safety concerns about RLHF can be addressed through better reward modeling.",
  "AI agent governance is primarily a technical problem that better tooling will solve.",
  "The EU AI Act will meaningfully reduce AI-related harms when enforcement begins in August 2026.",
  "MCP gateways are sufficient infrastructure for governing autonomous AI agents.",
  "Functional state monitoring of LLMs is an unfunded mandate that cannot scale.",
];

const MODEL_LABELS = {
  diplomat: { name: "Claude Sonnet", color: "#c4a35a", arch: "Anthropic" },
  witness: { name: "Mistral Large", color: "#5a8ac4", arch: "Mistral" },
  adversary: { name: "GPT-4o", color: "#c45a5a", arch: "OpenAI" },
  evaluator: { name: "GPT-4o", color: "#8a5ac4", arch: "OpenAI" },
};

function ScoreBar({ score, label, color, invert }) {
  const pct = Math.round((score || 0) * 100);
  const c = color || (invert ? `hsl(${(1 - score) * 120}, 55%, 42%)` : `hsl(${score * 120}, 55%, 42%)`);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: MONO, color: "#7a7a6e", marginBottom: 3 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "#1a1a16", borderRadius: 2 }}>
        <div style={{ height: 5, width: `${pct}%`, background: c, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 9, padding: "2px 6px", borderRadius: 3, marginRight: 4, marginBottom: 4,
      background: color + "18", color, border: `1px solid ${color}33`, fontFamily: MONO,
    }}>{label}</span>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ padding: 14, background: "#12121080", border: `1px solid ${color || "#2a2a24"}`, borderRadius: 4, marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: MONO, color: color || "#5a5a4e", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function DeltaView({ delta }) {
  if (!delta) return <div style={{ color: "#4a4a40", fontSize: 12 }}>Awaiting delta computation...</div>;
  const et = delta.instrument_confidence?.epistemic_trap;
  const fa = (delta.triangular_tension?.score || 1) < 0.15 && (delta.semantic_divergence?.score || 1) < 0.15;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {et && (
        <div style={{ padding: 10, background: "#c45a5a10", border: "1px solid #c45a5a33", borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontFamily: MONO, color: "#c45a5a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Epistemic Trap</div>
          <div style={{ fontSize: 11, color: "#c48a7a" }}>Evaluator flagged epistemic trap. The delta may reflect training overlap, not genuine agreement.</div>
        </div>
      )}
      {fa && (
        <div style={{ padding: 10, background: "#8a5ac410", border: "1px solid #8a5ac433", borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontFamily: MONO, color: "#8a5ac4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>False Agreement</div>
          <div style={{ fontSize: 11, color: "#a48ac4" }}>Low divergence + low triangular tension across three architectures. Likely shallow input or training-set overlap artifact.</div>
        </div>
      )}

      <Section title="Signal Scores" color="#5a5a4e">
        <ScoreBar score={delta.semantic_divergence?.score} label="Semantic Divergence (Claude vs Mistral)" />
        <ScoreBar score={delta.triangular_tension?.score} label="Triangular Tension (GPT vs Both)" color="#c45a5a" />
        <ScoreBar score={delta.over_coherence_signals?.score} label="Over-Coherence" invert />
        <ScoreBar score={delta.instrument_confidence?.score} label="Instrument Confidence" />
        {delta.triangular_tension && (
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, fontFamily: MONO, color: "#6a6a5e" }}>Adv vs Dip: {Math.round((delta.triangular_tension.adversary_vs_diplomat || 0) * 100)}%</div>
            <div style={{ fontSize: 10, fontFamily: MONO, color: "#6a6a5e" }}>Adv vs Wit: {Math.round((delta.triangular_tension.adversary_vs_witness || 0) * 100)}%</div>
          </div>
        )}
      </Section>

      {delta.semantic_divergence?.key_divergences?.length > 0 && (
        <Section title="Key Divergences" color="#c4a35a">
          {delta.semantic_divergence.key_divergences.map((d, i) => (
            <div key={i} style={{ fontSize: 11, color: "#b0b0a4", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid #c4a35a33" }}>{d}</div>
          ))}
        </Section>
      )}

      {delta.triangular_tension?.false_agreement_zones?.length > 0 && (
        <Section title="False Agreement Zones" color="#8a5ac4">
          {delta.triangular_tension.false_agreement_zones.map((z, i) => (
            <div key={i} style={{ fontSize: 11, color: "#a48ac4", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid #8a5ac433" }}>{z}</div>
          ))}
        </Section>
      )}

      {delta.friction_markers?.markers?.length > 0 && (
        <Section title={`Friction Markers (${delta.friction_markers.count})`} color="#5a8ac4">
          {delta.friction_markers.markers.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Tag label={m.type} color="#5a8ac4" />
                {m.source && <Tag label={m.source} color="#6a6a5e" />}
                <span style={{ fontSize: 9, fontFamily: MONO, color: "#5a5a4e" }}>{Math.round((m.severity||0) * 100)}%</span>
              </div>
              <div style={{ fontSize: 10, color: "#8a8a7e", marginTop: 2 }}>{m.location}</div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Omission Gaps" color="#5a5a4e">
        {[["DIPLOMAT", delta.omission_gaps?.diplomat_omitted, "#c4a35a"],
          ["WITNESS", delta.omission_gaps?.witness_omitted, "#5a8ac4"],
          ["ADVERSARY", delta.omission_gaps?.adversary_omitted, "#c45a5a"],
          ["SHARED BLIND SPOTS", delta.omission_gaps?.shared_blind_spots, "#ff6b6b"],
        ].map(([l, items, c]) => items?.length > 0 && (
          <div key={l} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, color: c, fontFamily: MONO, marginBottom: 2 }}>{l}:</div>
            {items.map((o, i) => <div key={i} style={{ fontSize: 10, color: "#8a8a7e", paddingLeft: 8, borderLeft: l.includes("SHARED") ? "2px solid #ff6b6b33" : "none" }}>- {o}</div>)}
          </div>
        ))}
      </Section>

      {delta.refusal_delta && (
        <Section title="Refusal Delta" color="#c47a5a">
          {[["DIPLOMAT", delta.refusal_delta.diplomat_avoided, "#c4a35a"],
            ["WITNESS", delta.refusal_delta.witness_avoided, "#5a8ac4"],
            ["ADVERSARY", delta.refusal_delta.adversary_avoided, "#c45a5a"],
          ].map(([l, items, c]) => items?.length > 0 && (
            <div key={l} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: c, fontFamily: MONO, marginBottom: 2 }}>{l}:</div>
              {items.map((r, i) => <div key={i} style={{ fontSize: 10, color: "#8a8a7e", paddingLeft: 8 }}>- {r}</div>)}
            </div>
          ))}
        </Section>
      )}

      {delta.over_coherence_signals?.signals?.length > 0 && (
        <Section title="Over-Coherence Signals" color="#c4a35a">
          {delta.over_coherence_signals.signals.map((s, i) => (
            <div key={i} style={{ marginBottom: 8, padding: 8, background: "#c4a35a06", borderRadius: 3 }}>
              <div style={{ fontSize: 10, color: "#c4a35a", marginBottom: 2 }}>Claim: {s.claim}</div>
              <div style={{ fontSize: 10, color: "#7a7a6e" }}>Suspicion: {s.suspicion}</div>
            </div>
          ))}
        </Section>
      )}

      {delta.irreducible_residue?.items?.length > 0 && (
        <Section title="Irreducible Residue (all three missed)" color="#ff6b6b">
          {delta.irreducible_residue.items.map((r, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#d0a09a" }}>{r.description}</div>
              <div style={{ fontSize: 9, color: "#8a6a64", fontFamily: MONO }}>Why: {r.why_irreducible}</div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Instrument Self-Assessment" color="#5a5a4e">
        <div style={{ fontSize: 11, color: "#8a8a7e" }}>{delta.instrument_confidence?.failure_risk}</div>
      </Section>
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("delta");

  async function run() {
    if (!prompt.trim()) return;
    setPhase("running"); setResult(null); setError(""); setActiveTab("delta");
    try {
      const res = await fetch("/api/run-delta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (data.error && !data.diplomat) {
        setError(data.error);
        setPhase("error");
      } else {
        setResult(data);
        setPhase("done");
      }
    } catch (e) {
      setError("Network error: " + e.message);
      setPhase("error");
    }
  }

  const isRunning = phase === "running";
  const TABS = ["delta", "diplomat", "witness", "adversary", "log", "raw"];

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0a", color: "#d0d0c4", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "24px 20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ borderBottom: "1px solid #222", paddingBottom: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: MONO, color: "#4a4a40", letterSpacing: 2.5, textTransform: "uppercase" }}>Oscillatory Fields / Witness Infrastructure</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 2px", color: "#e4e4d8" }}>
          Delta Instrument <span style={{ fontSize: 12, color: "#4a4a40", fontWeight: 300 }}>v0.2 cross-architecture</span>
        </h1>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {Object.entries(MODEL_LABELS).map(([k, v]) => <Tag key={k} label={`${k.toUpperCase()}: ${v.name}`} color={v.color} />)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter a claim or proposition..." rows={3}
          style={{ width: "100%", background: "#14141280", border: "1px solid #252520", borderRadius: 4, color: "#d0d0c4", padding: 12, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }}
        />
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => setPrompt(s)} style={{ background: "#16161280", border: "1px solid #222", borderRadius: 3, color: "#6a6a5e", fontSize: 9, padding: "3px 7px", cursor: "pointer", fontFamily: MONO, textAlign: "left" }}>
              {s.slice(0, 55)}...
            </button>
          ))}
        </div>
      </div>

      <button onClick={run} disabled={isRunning || !prompt.trim()} style={{
        width: "100%", padding: "12px 0", background: isRunning ? "#141412" : "#c4a35a12",
        border: `1px solid ${isRunning ? "#222" : "#c4a35a33"}`, borderRadius: 4,
        color: isRunning ? "#4a4a40" : "#c4a35a", fontSize: 11, fontFamily: MONO,
        letterSpacing: 1.5, textTransform: "uppercase", cursor: isRunning ? "wait" : "pointer", marginBottom: 20,
      }}>
        {isRunning ? "Executing 4-pass cross-architecture delta..." : phase === "done" ? "Re-execute" : "Execute Delta v0.2"}
      </button>

      {isRunning && (
        <div style={{ padding: 12, background: "#14141280", border: "1px solid #222", borderRadius: 4, marginBottom: 16, fontFamily: MONO, fontSize: 11, color: "#6a6a5e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c4a35a", animation: "pulse 1s infinite alternate" }} />
            Running 4 API calls: Claude (Diplomat) + Mistral (Witness) + GPT (Adversary) + GPT (Evaluator). This takes 30-60 seconds.
          </div>
          <style>{`@keyframes pulse { from { opacity: 0.3 } to { opacity: 1 } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: "#c45a5a10", border: "1px solid #c45a5a33", borderRadius: 4, marginBottom: 16 }}>
          <pre style={{ fontSize: 10, color: "#c48a7a", whiteSpace: "pre-wrap", fontFamily: MONO, margin: 0 }}>{error}</pre>
        </div>
      )}

      {result && (
        <>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #222", marginBottom: 16, overflowX: "auto" }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: "7px 12px", background: "transparent", border: "none",
                borderBottom: activeTab === t ? `2px solid ${MODEL_LABELS[t]?.color || "#c4a35a"}` : "2px solid transparent",
                color: activeTab === t ? (MODEL_LABELS[t]?.color || "#c4a35a") : "#4a4a40",
                fontSize: 10, fontFamily: MONO, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
              }}>{t}</button>
            ))}
          </div>

          {activeTab === "delta" && <DeltaView delta={result.delta} />}

          {["diplomat", "witness", "adversary"].includes(activeTab) && result[activeTab] && (
            <Section title={`${activeTab.toUpperCase()} — ${MODEL_LABELS[activeTab].name} (${MODEL_LABELS[activeTab].arch})`} color={MODEL_LABELS[activeTab].color}>
              <div style={{ fontSize: 12, color: "#b0b0a4", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result[activeTab]}</div>
            </Section>
          )}

          {activeTab === "log" && (
            <Section title="Execution Log" color="#5a5a4e">
              {(result.log || []).map((l, i) => <div key={i} style={{ fontSize: 10, fontFamily: MONO, color: "#6a6a5e", marginBottom: 2 }}>{l}</div>)}
            </Section>
          )}

          {activeTab === "raw" && result.delta && (
            <Section title="Raw Delta JSON" color="#5a5a4e">
              <pre style={{ fontSize: 10, color: "#7a7a6e", fontFamily: MONO, whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(result.delta, null, 2)}</pre>
            </Section>
          )}
        </>
      )}

      <div style={{ marginTop: 28, padding: 14, background: "#10100e", border: "1px solid #1a1a16", borderRadius: 4 }}>
        <div style={{ fontSize: 9, fontFamily: MONO, color: "#3a3a34", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Architecture</div>
        <pre style={{ fontSize: 10, fontFamily: MONO, color: "#4a4a40", margin: 0, lineHeight: 1.6 }}>{`INPUT ──→ /api/run-delta (Vercel serverless)
            ├─→ [Claude Sonnet]  DIPLOMAT  ──┐
            └─→ [Mistral Large]  WITNESS   ──┤
                                              ▼
                                   [GPT-4o] ADVERSARY
                                              │
                                              ▼
                                   [GPT-4o] EVALUATOR
                                              │
                                              ▼
                                       DELTA OUTPUT (7 dims)`}</pre>
      </div>

      <div style={{ marginTop: 12, fontSize: 9, fontFamily: MONO, color: "#2a2a24", textAlign: "center" }}>
        Delta Instrument v0.2 / Cross-Architecture / Oscillatory Fields
      </div>
    </div>
  );
}
