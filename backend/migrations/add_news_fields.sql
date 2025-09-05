-- Migration script to add new fields to the news table
-- Run this script to update your database schema

-- Add new columns to news table
ALTER TABLE news 
ADD COLUMN slug VARCHAR(255) UNIQUE AFTER title,
ADD COLUMN content LONGTEXT AFTER description,
ADD COLUMN excerpt TEXT AFTER content,
ADD COLUMN featured_image VARCHAR(500) AFTER excerpt,
ADD COLUMN published_at DATETIME AFTER featured_image;

-- Add indexes for better performance
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_published_at ON news(published_at);

-- Migrate existing data
-- Set slug from title for existing records
UPDATE news 
SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '?', ''), '!', ''))
WHERE slug IS NULL;

-- Set content from description for existing records
UPDATE news 
SET content = description
WHERE content IS NULL;

-- Generate basic excerpt from description for existing records
UPDATE news 
SET excerpt = CASE 
    WHEN LENGTH(description) > 180 
    THEN CONCAT(LEFT(description, 177), '...')
    ELSE description
END
WHERE excerpt IS NULL;

-- Set published_at from date for existing records
UPDATE news 
SET published_at = COALESCE(date, created_at)
WHERE published_at IS NULL;

-- Clean up slug duplicates by appending ID
UPDATE news n1
SET slug = CONCAT(slug, '-', id)
WHERE EXISTS (
    SELECT 1 FROM (SELECT slug FROM news GROUP BY slug HAVING COUNT(*) > 1) n2 
    WHERE n1.slug = n2.slug
) AND n1.id NOT IN (
    SELECT MIN(id) FROM (SELECT id, slug FROM news) n3 GROUP BY slug
);

-- Verify the migration
SELECT 
    COUNT(*) as total_records,
    COUNT(slug) as records_with_slug,
    COUNT(content) as records_with_content,
    COUNT(excerpt) as records_with_excerpt,
    COUNT(published_at) as records_with_published_at
FROM news;
