import { useEffect, useState } from "react";

import { listCases } from "../api/cases";
import type { ApprovedCase } from "../types";

export function CaseListPage() {
  const [cases, setCases] = useState<ApprovedCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    listCases()
      .then((items) => {
        if (active) {
          setCases(items);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setError("加载案例失败");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return <p>加载中</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <section>
      <h1 style={{ fontSize: "1.35rem", margin: "0 0 1rem" }}>已入库案例</h1>
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflowX: "auto",
        }}
      >
        <table style={{ borderCollapse: "collapse", minWidth: "920px", width: "100%" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <HeaderCell>原始问题</HeaderCell>
              <HeaderCell>问题标签</HeaderCell>
              <HeaderCell>有效结论</HeaderCell>
              <HeaderCell>证据</HeaderCell>
              <HeaderCell>审核人</HeaderCell>
              <HeaderCell>状态</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.case_id}>
                <BodyCell>{item.original_question}</BodyCell>
                <BodyCell>{item.problem_tags.join("，") || "-"}</BodyCell>
                <BodyCell>{item.final_effective_conclusion}</BodyCell>
                <BodyCell>{item.key_evidence_fragments.join("，") || "-"}</BodyCell>
                <BodyCell>{item.reviewer}</BodyCell>
                <BodyCell>{item.status}</BodyCell>
              </tr>
            ))}
            {cases.length === 0 ? (
              <tr>
                <BodyCell colSpan={6}>暂无入库案例</BodyCell>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        borderBottom: "1px solid #e5e7eb",
        color: "#4b5563",
        fontSize: "0.78rem",
        padding: "0.75rem",
        textAlign: "left",
      }}
    >
      {children}
    </th>
  );
}

function BodyCell({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        borderBottom: "1px solid #f3f4f6",
        fontSize: "0.9rem",
        padding: "0.8rem 0.75rem",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
