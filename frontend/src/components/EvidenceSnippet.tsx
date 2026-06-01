import type { EvidenceSnippet as EvidenceSnippetType } from "../types";

type EvidenceSnippetProps = {
  evidence: EvidenceSnippetType;
};

export function EvidenceSnippet({ evidence }: EvidenceSnippetProps) {
  const location =
    evidence.line_start && evidence.line_end
      ? `${evidence.source_file}:${evidence.line_start}-${evidence.line_end}`
      : evidence.segment_id
        ? `${evidence.source_file} / ${evidence.segment_id}`
        : evidence.source_file;

  return (
    <article
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        display: "grid",
        gap: "0.45rem",
        padding: "0.8rem",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          justifyContent: "space-between",
        }}
      >
        <strong style={{ color: "#111827", fontSize: "0.9rem" }}>{location}</strong>
        <span
          style={{
            background: "#ecfeff",
            border: "1px solid #a5f3fc",
            borderRadius: "999px",
            color: "#155e75",
            fontSize: "0.76rem",
            padding: "0.15rem 0.5rem",
          }}
        >
          {evidence.strength}
        </span>
      </div>
      <pre
        style={{
          background: "#f9fafb",
          borderRadius: "6px",
          color: "#172033",
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: "0.82rem",
          margin: 0,
          overflowX: "auto",
          padding: "0.65rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {evidence.content}
      </pre>
    </article>
  );
}
