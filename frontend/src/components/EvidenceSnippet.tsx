import type { EvidenceSnippet as EvidenceSnippetType } from "../types";

type EvidenceSnippetProps = {
  evidence: EvidenceSnippetType;
};

export function EvidenceSnippet({ evidence }: EvidenceSnippetProps) {
  const location =
    evidence.line_start && evidence.line_end
      ? `${evidence.source_file}:${evidence.line_start}-${evidence.line_end}`
      : evidence.source_file;

  return (
    <article
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "0.75rem",
      }}
    >
      <div style={{ color: "#475569", fontSize: "0.78rem", fontWeight: 700 }}>{location}</div>
      <pre
        style={{
          margin: "0.5rem 0 0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {evidence.content}
      </pre>
    </article>
  );
}
