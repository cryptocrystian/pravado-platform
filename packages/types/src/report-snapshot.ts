// =====================================================
// REPORT SNAPSHOT TYPES
// =====================================================

export enum ReportSnapshotType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
}

// =====================================================
// REPORT SNAPSHOT
// =====================================================

export interface ReportSnapshot {
  id: string;
  name: string;
  description: string | null;
  reportType: ReportSnapshotType;
  format: ReportFormat;

  // Time Range
  startDate: Date;
  endDate: Date;

  // Filters
  filters: {
    campaigns?: string[];
    contentFormats?: string[];
    tiers?: string[];
    agentTemplates?: string[];
  };

  // Computed Metrics
  metrics: {
    campaigns?: any;
    content?: any;
    contacts?: any;
    agents?: any;
  };

  // Export Data
  exportUrl: string | null;
  fileSizeBytes: number | null;
  generatedAt: Date | null;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  createdAt: Date;
}

export interface CreateReportSnapshotInput {
  name: string;
  description?: string;
  reportType: ReportSnapshotType;
  format?: ReportFormat;
  startDate: Date;
  endDate: Date;
  filters?: {
    campaigns?: string[];
    contentFormats?: string[];
    tiers?: string[];
    agentTemplates?: string[];
  };
  organizationId: string;
}

// =====================================================
// EXPORT CONFIG
// =====================================================

export interface ExportConfig {
  format: ReportFormat;
  includeSections: {
    campaigns: boolean;
    content: boolean;
    contacts: boolean;
    agents: boolean;
    charts: boolean;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
}
