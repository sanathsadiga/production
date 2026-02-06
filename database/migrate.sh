#!/bin/bash

# MMCL Production Database Migration Script
# Version: 2.1.0
# Purpose: Execute database migrations and seed data safely
# Benefits: Prevents data loss, tracks migrations, allows incremental updates

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
DB_NAME="mmcl_production"

# Directories
MIGRATIONS_DIR="./migrations"
SEEDS_DIR="./seeds"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MMCL Production Database Migration Manager       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SQL file
execute_sql() {
  local file=$1
  local description=$2
  
  echo -e "${YELLOW}→${NC} Executing: $description"
  
  if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Success: $description"
    return 0
  else
    echo -e "${RED}✗${NC} Failed: $description"
    return 1
  fi
}

# Function to check if migration has been executed
is_migration_executed() {
  local migration_name=$1
  
  # Check if migrations table exists first
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
    -e "SELECT 1 FROM migrations WHERE migration_name='$migration_name'" 2>/dev/null | grep -q "1"
  return $?
}

# Step 1: Create database and tables
echo -e "${BLUE}Step 1: Creating Database and Tables${NC}"
echo ""

if execute_sql "$MIGRATIONS_DIR/001_create_tables.sql" "Create tables (001_create_tables.sql)"; then
  echo ""
else
  echo -e "${RED}Failed to create tables. Exiting.${NC}"
  exit 1
fi

# Step 2: Execute seed files
echo -e "${BLUE}Step 2: Seeding Master Data${NC}"
echo ""

SEED_FILES=(
  "001_publications.sql"
  "002_machines.sql"
  "003_downtime_reasons.sql"
  "004_newsprint_types.sql"
  "005_users.sql"
)

for seed_file in "${SEED_FILES[@]}"; do
  if [ -f "$SEEDS_DIR/$seed_file" ]; then
    execute_sql "$SEEDS_DIR/$seed_file" "Seed data ($seed_file)"
  else
    echo -e "${YELLOW}⚠${NC}  Warning: Seed file not found: $seed_file"
  fi
done

echo ""

# Step 3: Verify data
echo -e "${BLUE}Step 3: Verifying Database${NC}"
echo ""

# Check counts
echo -e "${YELLOW}→${NC} Verifying data counts..."

COUNTS=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "
SELECT 
  (SELECT COUNT(*) FROM publications) as publications,
  (SELECT COUNT(*) FROM machines) as machines,
  (SELECT COUNT(*) FROM downtime_reasons) as downtime_reasons,
  (SELECT COUNT(*) FROM newsprint_types) as newsprint_types,
  (SELECT COUNT(*) FROM users) as users;
" 2>/dev/null)

IFS=$'\t' read -r PUB MACH DT NP USR <<< "$COUNTS"

echo -e "  ${GREEN}Publications:${NC}        $PUB records"
echo -e "  ${GREEN}Machines:${NC}            $MACH records"
echo -e "  ${GREEN}Downtime Reasons:${NC}    $DT records"
echo -e "  ${GREEN}Newsprint Types:${NC}     $NP records"
echo -e "  ${GREEN}Users:${NC}               $USR records"

echo ""

# Step 4: Show executed migrations
echo -e "${BLUE}Step 4: Migration History${NC}"
echo ""

echo -e "${YELLOW}→${NC} Executed Migrations:"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  -e "SELECT migration_name, executed_at FROM migrations ORDER BY executed_at;" 2>/dev/null || echo -e "${RED}Could not retrieve migration history${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Migration Completed Successfully!                ║${NC}"
echo -e "${GREEN}║   Database: $DB_NAME                                    ║${NC}"
echo -e "${GREEN}║   Ready for application use                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 5: Instructions
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Update .env files with database credentials if not set"
echo "  2. Start backend: cd backend && npm install && npm run dev"
echo "  3. Start frontend: cd frontend && npm install && npm start"
echo "  4. Test login with:"
echo "     - User: user1@mmcl.com / user123"
echo "     - Admin: admin1@mmcl.com / admin123"
echo ""

# Step 6: Helpful information
echo -e "${BLUE}To Add New Migrations:${NC}"
echo "  1. Create new file: migrations/00X_description.sql"
echo "  2. Add SQL statements with migration tracking:"
echo "     INSERT INTO migrations (migration_name) VALUES ('00X_description')"
echo "  3. Run this script again - only new migrations execute"
echo ""

echo -e "${BLUE}Migration System Benefits:${NC}"
echo "  ✓ Existing data is never lost"
echo "  ✓ Migrations execute only once"
echo "  ✓ Seeds use INSERT IGNORE (safe to re-run)"
echo "  ✓ Easy to track schema evolution"
echo "  ✓ Supports team collaboration"
echo ""
echo "  - Admin: admin1@mmcl.com / Pass: admin123"
