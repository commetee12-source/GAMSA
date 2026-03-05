
export interface AuditRequest {
  auditResultText: string;
  templateText: string;
}

export interface GeneratedDoc {
  id: string;
  timestamp: number;
  type: '확인서' | '감사처분서' | '통합';
  content: string;
  title: string;
}

export enum DocType {
  CONFIRMATION = '확인서',
  DISPOSITION = '감사처분서',
  BOTH = '통합'
}
