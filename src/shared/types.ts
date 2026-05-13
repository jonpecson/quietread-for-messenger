export interface QuietReadSettings {
  protectionEnabled: boolean;
  debugEnabled: boolean;
  showStatusPill: boolean;
}

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  type: 'fetch' | 'xhr';
  blocked: boolean;
  note?: string;
}

export interface RuleStatus {
  enabled: boolean;
  ruleCount: number;
  rulesetIds: string[];
}

export interface DiagnosticsData {
  hostname: string;
  protectionEnabled: boolean;
  ruleStatus: RuleStatus;
  observedRequests: number;
  recentEntries: DebugLogEntry[];
}

export type MessageType =
  | { type: 'quietread:get-status' }
  | { type: 'quietread:status-update'; settings: QuietReadSettings }
  | { type: 'quietread:toggle-protection'; enabled: boolean }
  | { type: 'quietread:toggle-debug'; enabled: boolean }
  | { type: 'quietread:request-observed'; entry: DebugLogEntry }
  | { type: 'quietread:rule-status'; status: RuleStatus }
  | { type: 'quietread:get-diagnostics' }
  | { type: 'quietread:diagnostics-response'; data: DiagnosticsData };
