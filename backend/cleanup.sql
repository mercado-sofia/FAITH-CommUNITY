-- Delete duplicate organizations keeping only ID 1
DELETE FROM organizations WHERE id > 1;

-- Delete organization heads entries for non-existent organizations
DELETE FROM organization_heads WHERE organization_id > 1;

-- Keep only one entry for organization_heads if there are duplicates
DELETE t1 FROM organization_heads t1
INNER JOIN organization_heads t2 
WHERE t1.id > t2.id 
AND t1.name = t2.name 
AND t1.organization_id = t2.organization_id; 