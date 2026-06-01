export type EvidenceSnippet = {
  snippet_id: string;
  source_file: string;
  boot_session_id?: string | null;
  content: string;
  strength: string;
  line_start?: number | null;
  line_end?: number | null;
  segment_id?: string | null;
};

export type DiagnosisFinding = {
  finding_id: string;
  playbook_id: string;
  related_boot_session_id?: string | null;
  title: string;
  summary: string;
  confidence: string;
  evidence: EvidenceSnippet[];
  next_checks: string[];
};

export type BootSession = {
  session_id: string;
  snapshot_index: number;
  display_name: string;
  final_state: string;
  abnormal_stage?: string | null;
  reset_detected: boolean;
  confidence: string;
  evidence_files: string[];
  key_events: string[];
  missing_information: string[];
};

export type AnalysisTask = {
  task_id: string;
  question: string;
  status: string;
  package_type?: string | null;
  snapshot_count: number;
  final_answer?: string | null;
  boot_sessions: BootSession[];
  diagnosis_findings: DiagnosisFinding[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateTaskInput = {
  question: string;
  archive: File;
  board_model?: string;
  chip_model?: string;
  software_version?: string;
  problem_context?: string;
  expected_behavior?: string;
};

export type FollowUpMessage = {
  message_id: string;
  role: string;
  content: string;
  cited_evidence: string[];
};

export type ApprovedCase = {
  case_id: string;
  original_question: string;
  problem_tags: string[];
  board_model?: string | null;
  chip_model?: string | null;
  software_version?: string | null;
  input_log_summary?: string | null;
  boot_reconstruction_summary?: string | null;
  active_diagnosis_summary?: string | null;
  final_effective_conclusion: string;
  key_evidence_fragments: string[];
  diagnosis_process?: string | null;
  solution_or_next_action?: string | null;
  applicable_conditions?: string | null;
  non_applicable_conditions?: string | null;
  source_analysis_task_id: string;
  reviewer: string;
  approved_at?: string | null;
  status: string;
};

export type ApproveCaseInput = {
  reviewer: string;
  final_effective_conclusion: string;
  diagnosis_process?: string;
  solution_or_next_action?: string;
  applicable_conditions?: string;
  non_applicable_conditions?: string;
};
