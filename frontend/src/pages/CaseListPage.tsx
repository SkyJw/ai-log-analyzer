import { useQuery } from "@tanstack/react-query";

import { listCases } from "../api/cases";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";

export function CaseListPage() {
  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ["cases"],
    queryFn: listCases,
  });

  if (isLoading) {
    return <LoadingState label="正在加载案例..." />;
  }

  if (error) {
    return <ErrorState label="案例加载失败" />;
  }

  return (
    <section>
      <PageHeader title="已入库案例" description="查看经工程师确认后可复用的诊断案例。" />
      {cases.length === 0 ? (
        <EmptyState label="暂无入库案例" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>原始问题</th>
                <th>问题标签</th>
                <th>有效结论</th>
                <th>证据</th>
                <th>审核人</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.case_id}>
                  <td>{item.original_question}</td>
                  <td>{item.problem_tags.join("；") || "-"}</td>
                  <td>{item.final_effective_conclusion}</td>
                  <td>{item.key_evidence_fragments.join("；") || "-"}</td>
                  <td>{item.reviewer}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
