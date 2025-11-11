-- =====================================================
-- OPS SLO METRICS TABLE
-- Sprint 83: Post-Launch Reliability & SLO Automation
-- =====================================================

-- Table for storing daily SLO metrics
CREATE TABLE IF NOT EXISTS ops_slo_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  uptime_percent NUMERIC(5, 2) NOT NULL,
  avg_latency_ms NUMERIC(8, 2) NOT NULL,
  error_rate_percent NUMERIC(5, 2) NOT NULL,
  llm_failure_rate_percent NUMERIC(5, 2) NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_errors INTEGER NOT NULL DEFAULT 0,
  total_llm_requests INTEGER NOT NULL DEFAULT 0,
  total_llm_failures INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_ops_slo_metrics_date ON ops_slo_metrics (date DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_ops_slo_metrics_status ON ops_slo_metrics (status);

-- Enable RLS (Row Level Security)
ALTER TABLE ops_slo_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Only platform admins can read ops_slo_metrics
CREATE POLICY "Platform admins can read ops_slo_metrics"
  ON ops_slo_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_platform_admin = true
    )
  );

-- Policy: Service role can insert/update ops_slo_metrics
CREATE POLICY "Service role can write ops_slo_metrics"
  ON ops_slo_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ops_slo_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER ops_slo_metrics_updated_at
  BEFORE UPDATE ON ops_slo_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_ops_slo_metrics_updated_at();

-- Comment for table documentation
COMMENT ON TABLE ops_slo_metrics IS 'Daily SLO metrics for operational monitoring and trend analysis';
COMMENT ON COLUMN ops_slo_metrics.date IS 'Date for which metrics were collected (UTC)';
COMMENT ON COLUMN ops_slo_metrics.uptime_percent IS 'Percentage of successful requests (200 responses)';
COMMENT ON COLUMN ops_slo_metrics.avg_latency_ms IS 'Average request latency in milliseconds';
COMMENT ON COLUMN ops_slo_metrics.error_rate_percent IS 'Percentage of 5xx errors';
COMMENT ON COLUMN ops_slo_metrics.llm_failure_rate_percent IS 'Percentage of LLM router failures';
COMMENT ON COLUMN ops_slo_metrics.status IS 'Overall health status: healthy, degraded, or critical';
