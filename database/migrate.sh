#!/bin/bash
# filepath: /Users/sanathsadiga/Desktop/PRODUCTION/mmcl-production/database/migrate.sh

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-sanaths1@}"
DB_NAME="mmcl_production"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MMCL Production Database Migration               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify connection
echo -e "${YELLOW}→${NC} Testing MySQL connection..."
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &>/dev/null; then
  echo -e "${GREEN}✓${NC} MySQL connection successful"
else
  echo -e "${RED}✗${NC} Failed to connect to MySQL"
  exit 1
fi

echo ""
echo -e "${YELLOW}→${NC} Creating database..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
echo -e "${GREEN}✓${NC} Database created/exists"

echo ""
echo -e "${BLUE}Running migrations:${NC}"

# Run migrations in specific order
declare -a MIGRATIONS=(
  "001_create_schema.sql"
  "002_seed_master_data.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  MIGRATION_PATH="./migrations/$migration"
  
  if [ ! -f "$MIGRATION_PATH" ]; then
    echo -e "${RED}✗${NC} $migration not found at $MIGRATION_PATH"
    exit 1
  fi
  
  echo -e "${YELLOW}→${NC} $migration"
  
  # Execute migration and check for errors
  if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_PATH" 2>&1 | grep -qi "error"; then
    echo -e "${GREEN}✓${NC} Success"
  else
    echo -e "${RED}✗${NC} Failed"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_PATH"
    exit 1
  fi
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Migration Complete!                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}Data Summary:${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "
SELECT CONCAT('  • Publications (OSP): ', COUNT(*)) FROM publications WHERE publication_type = 'OSP';
SELECT CONCAT('  • Publications (VK): ', COUNT(*)) FROM publications WHERE publication_type = 'VK';
SELECT CONCAT('  • Publications (NAMMA): ', COUNT(*)) FROM publications WHERE publication_type = 'NAMMA';
SELECT CONCAT('  • Machines: ', COUNT(*)) FROM machines;
SELECT CONCAT('  • Newsprint Types: ', COUNT(*)) FROM newsprint_types;
SELECT CONCAT('  • Downtime Reasons: ', COUNT(*)) FROM downtime_reasons;
SELECT CONCAT('  • Users (Regular): ', COUNT(*)) FROM users WHERE role = 'user';
SELECT CONCAT('  • Users (Admin): ', COUNT(*)) FROM users WHERE role = 'admin';
" 2>/dev/null

echo ""
echo -e "${BLUE}Valid ID Ranges:${NC}"
echo -e "  ${YELLOW}Machines:${NC} 1-4"
echo -e "  ${YELLOW}Publications:${NC} OSP (1-35), VK (36-50), NAMMA (51-70)"
echo -e "  ${YELLOW}Newsprint Types:${NC} 1-3"
echo -e "  ${YELLOW}Downtime Reasons:${NC} 1-6"
echo -e "  ${YELLOW}Users:${NC} 1-13"
echo ""
echo -e "${GREEN}✅ Ready to connect backend!${NC}"
echo ""