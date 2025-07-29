-- Rollback role priority/hierarchy changes from organization heads
-- This script removes the priority and display_order columns that were added

USE db_community;

-- Drop the index first
DROP INDEX IF EXISTS idx_org_heads_priority ON organization_heads;

-- Remove the priority column
ALTER TABLE organization_heads DROP COLUMN IF EXISTS priority;

-- Remove the display_order column  
ALTER TABLE organization_heads DROP COLUMN IF EXISTS display_order;

-- Verify the changes
DESCRIBE organization_heads;

SELECT 'Role hierarchy columns removed successfully!' as status;
