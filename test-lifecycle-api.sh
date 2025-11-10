#!/bin/bash

# Sprint 37: Memory Lifecycle API Test Script
# Tests all lifecycle endpoints

API_URL="http://localhost:3001/api/v1/agent-memory-lifecycle"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Sprint 37: Memory Lifecycle API Tests${NC}"
echo "=============================================="
echo ""

# Check if API is running
echo -e "${YELLOW}Checking if API server is running...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server is not running${NC}"
    echo "Please start the server with: cd apps/api && pnpm dev"
    exit 1
fi

echo ""

# Note about authentication
echo -e "${YELLOW}⚠️  Note: These tests will fail with 401/403 if you don't have a valid JWT token${NC}"
echo "To get a token, log into your dashboard and check browser DevTools -> Application -> Local Storage"
echo ""
read -p "Do you have a JWT token to test with? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping authenticated endpoint tests"
    echo "You can still verify the routes are registered"
    exit 0
fi

read -p "Enter your JWT token: " JWT_TOKEN
echo ""

# Test 1: GET Dashboard
echo -e "${YELLOW}Test 1: GET /dashboard${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/dashboard" \
  -H "Authorization: Bearer $JWT_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: GET Retention Plan
echo -e "${YELLOW}Test 2: GET /retention-plan${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/retention-plan" \
  -H "Authorization: Bearer $JWT_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: POST Age Memory
echo -e "${YELLOW}Test 3: POST /age${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/age" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysSinceLastRun": 1}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 4: POST Compress (dry run)
echo -e "${YELLOW}Test 4: POST /compress (dry run)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/compress" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ageThreshold": 30, "dryRun": true, "maxEpisodes": 10}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 5: POST Recommend Archival
echo -e "${YELLOW}Test 5: POST /recommend-archival${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/recommend-archival" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "minDaysOld": 30}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Summary
echo "=============================================="
echo -e "${YELLOW}📋 Test Summary${NC}"
echo ""
echo "All tests completed!"
echo ""
echo "Next steps:"
echo "1. Create some test memory episodes"
echo "2. Run aging operations"
echo "3. Test compression and archival"
echo "4. Monitor lifecycle events in database"
echo ""
