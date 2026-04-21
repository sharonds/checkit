export type DeepAuditStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "stale";

export type DeepAuditRequestedBy = "dashboard" | "mcp" | "cli";

export interface DeepAuditRecord {
  id: number;
  parentType: "check" | "content_hash";
  parentKey: string;
  interactionId: string | null;
  status: DeepAuditStatus;
  requestedBy: DeepAuditRequestedBy;
  startedAt: number;
  completedAt: number | null;
  resultText: string | null;
  resultJson: string | null;
  errorMessage: string | null;
  costEstimateUsd: number;
}

export interface DeepAuditInitialResponse {
  mostRecent: DeepAuditRecord | null;
  previousCount: number;
}

export interface DeepAuditHistoryResponse {
  audits: DeepAuditRecord[];
}

export interface DeepAuditStartResponse {
  audit: DeepAuditRecord;
  reused: boolean;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return body as T;
}

export function fetchReportDeepAudit(reportId: number): Promise<DeepAuditInitialResponse> {
  return requestJson<DeepAuditInitialResponse>(`/api/reports/${reportId}/deep-audit`);
}

export function fetchReportDeepAuditHistory(
  reportId: number,
): Promise<DeepAuditHistoryResponse> {
  return requestJson<DeepAuditHistoryResponse>(
    `/api/reports/${reportId}/deep-audit?history=true`,
  );
}

export function pollReportDeepAudit(
  reportId: number,
  auditId: number,
): Promise<DeepAuditRecord> {
  return requestJson<DeepAuditRecord>(
    `/api/reports/${reportId}/deep-audit?auditId=${encodeURIComponent(String(auditId))}`,
  );
}

export function requestReportDeepAudit(
  reportId: number,
): Promise<DeepAuditStartResponse> {
  return requestJson<DeepAuditStartResponse>(
    `/api/reports/${reportId}/deep-audit`,
    { method: "POST" },
  );
}
