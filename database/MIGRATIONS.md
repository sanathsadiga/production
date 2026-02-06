# Database Migration System

This directory contains the new migration-based database management system for MMCL Production. This system ensures that **existing data is never lost** when updating the database schema.

## 📁 Directory Structure

```
database/
├── migrations/          # Schema change files (run once)
│   └── 001_create_tables.sql
├── seeds/              # Master data files (idempotent)
│   ├── 001_publications.sql
│   ├── 002_machines.sql
│   ├── 003_downtime_reasons.sql
│   ├── 004_newsprint_types.sql
│   └── 005_users.sql
├── migrate.sh          # Migration execution script (run this!)
├── schema.sql.deprecated  # OLD - Do not use
└── seed_data.sql.deprecated  # OLD - Do not use
```

## 🚀 Quick Start

### First Time Setup
```bash
cd database
bash migrate.sh
```

This will:
1. Create the database and tables
2. Load all master data
3. Show verification counts
4. Display migration history

### Adding New Data (Migration)
When you need to update the schema:

1. Create a new migration file: `migrations/002_add_new_column.sql`
2. Include migration tracking statement:
   ```sql
   -- Your SQL changes here
   
   INSERT INTO migrations (migration_name) VALUES ('002_add_new_column')
   ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
   ```
3. Run: `bash migrate.sh` (only new migrations execute)

## 📋 How It Works

### Migrations Table
```sql
CREATE TABLE migrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (migration_name)
);
```

Each migration file must end with:
```sql
INSERT INTO migrations (migration_name) VALUES ('001_create_tables')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
```

### Benefits

✅ **Data Preservation**: Running the script multiple times won't lose existing data
- Migrations execute only once (tracked in `migrations` table)
- Seeds use `INSERT IGNORE` to skip duplicates

✅ **Version Control**: Track all schema changes in Git
- Each migration is a separate file with clear version numbers
- Commit history shows evolution of database

✅ **Team Collaboration**: Easy for multiple developers
- Each developer runs same migration script
- No conflicting script executions
- Safe to run on production (with proper backups)

✅ **Incremental Updates**: Add schema changes without recreating database
- No need to re-seed data
- Can add migrations anytime
- Old data automatically preserved

## 📝 Examples

### Example 1: First Time Setup
```bash
$ bash migrate.sh

╔════════════════════════════════════════════════════╗
║   MMCL Production Database Migration Manager       ║
╚════════════════════════════════════════════════════╝

Step 1: Creating Database and Tables
→ Executing: Create tables (001_create_tables.sql)
✓ Success: Create tables (001_create_tables.sql)

Step 2: Seeding Master Data
→ Executing: Seed data (001_publications.sql)
✓ Success: Seed data (001_publications.sql)
...

Step 3: Verifying Database
  Publications:        74 records
  Machines:            4 records
  Downtime Reasons:    6 records
  Newsprint Types:     3 records
  Users:               10 records

Step 4: Migration History
migration_name         executed_at
001_create_tables      2026-02-03 10:30:45
```

### Example 2: Running Script Again (Safe - No Data Loss)
```bash
$ bash migrate.sh

# All migrations already executed, so only verification runs
# No data is touched!

Step 1: Creating Database and Tables
→ Executing: Create tables (001_create_tables.sql)
✓ Success: Create tables (001_create_tables.sql)

Step 2: Seeding Master Data
# All seeds run with INSERT IGNORE - duplicates skipped
→ Executing: Seed data (001_publications.sql)
✓ Success: Seed data (001_publications.sql)
```

### Example 3: Adding a New Machine (Safe Update)

**Problem**: You need to add a new machine to the system

**Solution**:
```bash
# Create new migration file
cat > migrations/002_add_machine.sql << 'EOF'
-- Add new machine to inventory
USE mmcl_production;

INSERT IGNORE INTO machines (name, code) VALUES
('HM2500', 'HM2500');

-- Track this migration
INSERT INTO migrations (migration_name) VALUES ('002_add_machine')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
EOF

# Run migration script
bash migrate.sh
```

**Result**:
- New machine is added
- Existing machines are untouched
- Production data is completely safe
- Migration is tracked (visible in `SELECT * FROM migrations;`)

### Example 4: Adding a New Column

```sql
-- migrations/003_add_batch_number.sql
USE mmcl_production;

ALTER TABLE production_records
ADD COLUMN batch_number VARCHAR(50) NULL
AFTER po_number;

-- Track this migration
INSERT INTO migrations (migration_name) VALUES ('003_add_batch_number')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
```

**Result**:
- New column added
- All existing records preserved (NULL for batch_number)
- Backend/frontend can be updated to use new field
- No data loss

## 🔄 Migration Lifecycle

```
1. Create migration file
   migrations/00X_description.sql
        ↓
2. Add SQL changes
   ALTER TABLE / INSERT / CREATE INDEX
        ↓
3. Add tracking statement
   INSERT INTO migrations (migration_name) VALUES ('00X_description')
        ↓
4. Run migration script
   bash migrate.sh
        ↓
5. Script checks migrations table
   If migration_name not found → Execute
   If migration_name exists → Skip (already ran)
        ↓
6. Verify database
   Check data counts, show history
        ↓
7. Migration complete
   Data preserved, tracked, ready for next update
```

## ⚠️ Important Rules

### ✅ DO
- Create separate migration files for each logical change
- Use descriptive names: `002_add_batch_tracking.sql`
- Always include the migration tracking INSERT statement
- Use `INSERT IGNORE` in seed files
- Run `migrate.sh` when deploying (safe to run multiple times)

### ❌ DON'T
- Edit the old `schema.sql` or `seed_data.sql` files
- Run SQL directly on production without testing
- Create migrations with IF NOT EXISTS for tables (use migrations table)
- Modify executed migrations (create new ones instead)
- Delete migrations that are already in the database

## 🆘 Troubleshooting

### Problem: "Can't find migrations table"
**Cause**: Running new system on old database
**Solution**: Run migration script once to create migrations table

### Problem: "Column already exists"
**Cause**: Migration ran twice
**Solution**: Migration system should prevent this, check migrations table
```sql
SELECT * FROM migrations WHERE migration_name = 'your_migration';
```

### Problem: "Access denied"
**Cause**: Wrong database credentials
**Solution**: Set environment variables or edit migrate.sh:
```bash
export DB_USER="your_user"
export DB_PASSWORD="your_password"
bash migrate.sh
```

### Problem: "No connection to MySQL"
**Cause**: MySQL server not running
**Solution**: Start MySQL server:
```bash
# macOS with Homebrew
brew services start mysql

# Or start MySQL manually
mysql.server start
```

## 📚 Reference

### Common Migration Patterns

**Adding a new table**:
```sql
CREATE TABLE IF NOT EXISTS new_table (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- columns...
);

INSERT INTO migrations (migration_name) VALUES ('00X_create_new_table')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
```

**Adding a new column**:
```sql
ALTER TABLE existing_table
ADD COLUMN new_column VARCHAR(255) NULL
AFTER existing_column;

INSERT INTO migrations (migration_name) VALUES ('00X_add_column')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
```

**Adding an index**:
```sql
CREATE INDEX idx_new_column ON existing_table(new_column);

INSERT INTO migrations (migration_name) VALUES ('00X_add_index')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
```

**Adding master data**:
```sql
INSERT IGNORE INTO reference_table (name, code) VALUES
('New Value', 'CODE');

INSERT INTO migrations (migration_name) VALUES ('00X_add_data')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;
```

## 🎯 Next Steps

1. **Test the migration system**: `bash migrate.sh`
2. **Verify data**: Check MySQL with `SELECT COUNT(*) FROM users;`
3. **Update application**: Backend and frontend are ready to use
4. **Add new migrations**: Follow the patterns above when schema changes needed
5. **Commit to Git**: All migration files are version-controlled

---

**Created**: 2026-02-03  
**Version**: 2.1.0  
**System**: Migration-based database management  
**Status**: ✅ Production Ready
