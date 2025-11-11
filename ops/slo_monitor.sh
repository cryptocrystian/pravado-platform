#!/bin/bash
# =====================================================
# SLO MONITOR - Daily Metrics Collection
# Sprint 83: Post-Launch Reliability & SLO Automation
# =====================================================

set -e

echo "========================================"
echo "Pravado SLO Monitor - Daily Collection"
echo "========================================"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
DATE=$(date +%Y-%m-%d)
REPORT_DIR="./reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate prerequisites
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo -e "${RED}❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set${NC}"
  exit 1
fi

echo "📊 Collecting SLO metrics for: $DATE"
echo ""

# ==================================================================
# 1. Fetch Prometheus Metrics
# ==================================================================
echo "1️⃣  Fetching Prometheus metrics..."

METRICS_RESPONSE=$(curl -s "$API_URL/metrics" 2>/dev/null || echo "ERROR")

if [ "$METRICS_RESPONSE" = "ERROR" ]; then
  echo -e "   ${RED}❌ Failed to fetch metrics from $API_URL/metrics${NC}"
  exit 1
fi

echo -e "   ${GREEN}✅ Metrics fetched successfully${NC}"
echo ""

# ==================================================================
# 2. Calculate HTTP Request Metrics
# ==================================================================
echo "2️⃣  Calculating HTTP request metrics..."

# Extract total HTTP requests
TOTAL_REQUESTS=$(echo "$METRICS_RESPONSE" | grep "^http_requests_total{" | awk '{sum+=$2} END {print int(sum)}')
TOTAL_REQUESTS=${TOTAL_REQUESTS:-0}

# Extract successful requests (status 2xx)
SUCCESS_REQUESTS=$(echo "$METRICS_RESPONSE" | grep "^http_requests_total{.*status_code=\"2[0-9][0-9]\"" | awk '{sum+=$2} END {print int(sum)}')
SUCCESS_REQUESTS=${SUCCESS_REQUESTS:-0}

# Extract error requests (status 5xx)
ERROR_REQUESTS=$(echo "$METRICS_RESPONSE" | grep "^http_requests_total{.*status_code=\"5[0-9][0-9]\"" | awk '{sum+=$2} END {print int(sum)}')
ERROR_REQUESTS=${ERROR_REQUESTS:-0}

# Calculate uptime percentage
if [ "$TOTAL_REQUESTS" -gt 0 ]; then
  UPTIME_PERCENT=$(awk "BEGIN {printf \"%.2f\", ($SUCCESS_REQUESTS / $TOTAL_REQUESTS) * 100}")
else
  UPTIME_PERCENT="100.00"
fi

# Calculate error rate percentage
if [ "$TOTAL_REQUESTS" -gt 0 ]; then
  ERROR_RATE_PERCENT=$(awk "BEGIN {printf \"%.2f\", ($ERROR_REQUESTS / $TOTAL_REQUESTS) * 100}")
else
  ERROR_RATE_PERCENT="0.00"
fi

echo "   Total Requests: $TOTAL_REQUESTS"
echo "   Success Requests: $SUCCESS_REQUESTS"
echo "   Error Requests: $ERROR_REQUESTS"
echo "   Uptime: ${UPTIME_PERCENT}%"
echo "   Error Rate: ${ERROR_RATE_PERCENT}%"
echo ""

# ==================================================================
# 3. Calculate Average Latency
# ==================================================================
echo "3️⃣  Calculating average latency..."

# Extract latency histogram sum and count
LATENCY_SUM=$(echo "$METRICS_RESPONSE" | grep "^http_request_duration_seconds_sum" | awk '{sum+=$2} END {print sum}')
LATENCY_COUNT=$(echo "$METRICS_RESPONSE" | grep "^http_request_duration_seconds_count" | awk '{sum+=$2} END {print int(sum)}')

LATENCY_SUM=${LATENCY_SUM:-0}
LATENCY_COUNT=${LATENCY_COUNT:-0}

# Calculate average latency in milliseconds
if [ "$LATENCY_COUNT" -gt 0 ]; then
  AVG_LATENCY_MS=$(awk "BEGIN {printf \"%.2f\", ($LATENCY_SUM / $LATENCY_COUNT) * 1000}")
else
  AVG_LATENCY_MS="0.00"
fi

echo "   Average Latency: ${AVG_LATENCY_MS}ms"
echo ""

# ==================================================================
# 4. Calculate LLM Failure Rate
# ==================================================================
echo "4️⃣  Calculating LLM failure rate..."

# Extract LLM metrics
TOTAL_LLM_REQUESTS=$(echo "$METRICS_RESPONSE" | grep "^llm_router_requests_total{" | awk '{sum+=$2} END {print int(sum)}')
TOTAL_LLM_FAILURES=$(echo "$METRICS_RESPONSE" | grep "^llm_router_failures_total{" | awk '{sum+=$2} END {print int(sum)}')

TOTAL_LLM_REQUESTS=${TOTAL_LLM_REQUESTS:-0}
TOTAL_LLM_FAILURES=${TOTAL_LLM_FAILURES:-0}

# Calculate LLM failure rate
if [ "$TOTAL_LLM_REQUESTS" -gt 0 ]; then
  LLM_FAILURE_RATE_PERCENT=$(awk "BEGIN {printf \"%.2f\", ($TOTAL_LLM_FAILURES / $TOTAL_LLM_REQUESTS) * 100}")
else
  LLM_FAILURE_RATE_PERCENT="0.00"
fi

echo "   Total LLM Requests: $TOTAL_LLM_REQUESTS"
echo "   Total LLM Failures: $TOTAL_LLM_FAILURES"
echo "   LLM Failure Rate: ${LLM_FAILURE_RATE_PERCENT}%"
echo ""

# ==================================================================
# 5. Determine Overall Status
# ==================================================================
echo "5️⃣  Determining overall status..."

STATUS="healthy"

# Check SLO thresholds
if (( $(awk "BEGIN {print ($UPTIME_PERCENT < 99.9)}") )); then
  STATUS="critical"
elif (( $(awk "BEGIN {print ($ERROR_RATE_PERCENT > 1.0)}") )); then
  STATUS="critical"
elif (( $(awk "BEGIN {print ($AVG_LATENCY_MS > 1500)}") )); then
  STATUS="degraded"
elif (( $(awk "BEGIN {print ($LLM_FAILURE_RATE_PERCENT > 10.0)}") )); then
  STATUS="degraded"
fi

case $STATUS in
  healthy)
    echo -e "   ${GREEN}✅ Status: HEALTHY${NC}"
    ;;
  degraded)
    echo -e "   ${YELLOW}⚠️  Status: DEGRADED${NC}"
    ;;
  critical)
    echo -e "   ${RED}🚨 Status: CRITICAL${NC}"
    ;;
esac
echo ""

# ==================================================================
# 6. Store in Supabase
# ==================================================================
echo "6️⃣  Storing metrics in Supabase..."

SUPABASE_PAYLOAD=$(cat <<EOF
{
  "date": "$DATE",
  "uptime_percent": $UPTIME_PERCENT,
  "avg_latency_ms": $AVG_LATENCY_MS,
  "error_rate_percent": $ERROR_RATE_PERCENT,
  "llm_failure_rate_percent": $LLM_FAILURE_RATE_PERCENT,
  "total_requests": $TOTAL_REQUESTS,
  "total_errors": $ERROR_REQUESTS,
  "total_llm_requests": $TOTAL_LLM_REQUESTS,
  "total_llm_failures": $TOTAL_LLM_FAILURES,
  "status": "$STATUS"
}
EOF
)

SUPABASE_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/ops_slo_metrics" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$SUPABASE_PAYLOAD" 2>&1)

if echo "$SUPABASE_RESPONSE" | grep -q "error"; then
  echo -e "   ${RED}❌ Failed to store in Supabase${NC}"
  echo "   Response: $SUPABASE_RESPONSE"
  exit 1
else
  echo -e "   ${GREEN}✅ Metrics stored successfully${NC}"
fi
echo ""

# ==================================================================
# 7. Generate Daily Report
# ==================================================================
echo "7️⃣  Generating daily report..."

mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/slo_daily_report_$DATE.md"

cat > "$REPORT_FILE" <<EOF
# SLO Daily Report - $DATE

**Status:** $(echo $STATUS | tr '[:lower:]' '[:upper:]')

---

## Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Uptime** | ${UPTIME_PERCENT}% | ≥99.9% | $(if (( $(awk "BEGIN {print ($UPTIME_PERCENT >= 99.9)}") )); then echo "✅"; else echo "❌"; fi) |
| **Avg Latency** | ${AVG_LATENCY_MS}ms | <1500ms | $(if (( $(awk "BEGIN {print ($AVG_LATENCY_MS < 1500)}") )); then echo "✅"; else echo "⚠️"; fi) |
| **Error Rate** | ${ERROR_RATE_PERCENT}% | <1% | $(if (( $(awk "BEGIN {print ($ERROR_RATE_PERCENT < 1)}") )); then echo "✅"; else echo "❌"; fi) |
| **LLM Failure Rate** | ${LLM_FAILURE_RATE_PERCENT}% | <10% | $(if (( $(awk "BEGIN {print ($LLM_FAILURE_RATE_PERCENT < 10)}") )); then echo "✅"; else echo "⚠️"; fi) |

---

## Detailed Metrics

### HTTP Requests
- **Total Requests:** $TOTAL_REQUESTS
- **Successful Requests:** $SUCCESS_REQUESTS
- **Error Requests:** $ERROR_REQUESTS
- **Uptime Percentage:** ${UPTIME_PERCENT}%
- **Error Rate:** ${ERROR_RATE_PERCENT}%

### Latency
- **Average Latency:** ${AVG_LATENCY_MS}ms

### LLM Router
- **Total LLM Requests:** $TOTAL_LLM_REQUESTS
- **Total LLM Failures:** $TOTAL_LLM_FAILURES
- **Failure Rate:** ${LLM_FAILURE_RATE_PERCENT}%

---

## SLO Compliance

$(if [ "$STATUS" = "healthy" ]; then
  echo "✅ **All SLOs met** - System operating within acceptable parameters."
elif [ "$STATUS" = "degraded" ]; then
  echo "⚠️  **SLOs degraded** - Performance below target but not critical."
  echo ""
  echo "**Issues:**"
  if (( $(awk "BEGIN {print ($AVG_LATENCY_MS > 1500)}") )); then
    echo "- Latency above 1500ms threshold"
  fi
  if (( $(awk "BEGIN {print ($LLM_FAILURE_RATE_PERCENT > 10.0)}") )); then
    echo "- LLM failure rate above 10% threshold"
  fi
else
  echo "🚨 **CRITICAL - SLOs violated** - Immediate attention required."
  echo ""
  echo "**Critical Issues:**"
  if (( $(awk "BEGIN {print ($UPTIME_PERCENT < 99.9)}") )); then
    echo "- Uptime below 99.9% threshold"
  fi
  if (( $(awk "BEGIN {print ($ERROR_RATE_PERCENT > 1.0)}") )); then
    echo "- Error rate above 1% threshold"
  fi
fi)

---

**Report Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF

echo -e "   ${GREEN}✅ Report saved to: $REPORT_FILE${NC}"
echo ""

# ==================================================================
# Summary
# ==================================================================
echo "========================================"
echo "SLO Collection Complete"
echo "========================================"
echo ""
echo "Date: $DATE"
echo "Status: $STATUS"
echo "Uptime: ${UPTIME_PERCENT}%"
echo "Avg Latency: ${AVG_LATENCY_MS}ms"
echo "Error Rate: ${ERROR_RATE_PERCENT}%"
echo "LLM Failure Rate: ${LLM_FAILURE_RATE_PERCENT}%"
echo ""
echo "Report: $REPORT_FILE"
echo ""

if [ "$STATUS" != "healthy" ]; then
  echo -e "${YELLOW}⚠️  WARNING: System status is $STATUS${NC}"
  echo "Review the daily report for details."
  exit 1
fi

echo -e "${GREEN}✅ All SLOs met - System healthy${NC}"
exit 0
