// utils/cleanupDeletedNews.js
import db from '../database.js';

/**
 * Cleanup function to permanently delete news items that have been
 * in the deleted state for more than 15 days
 * NOTE: This only affects items with is_deleted = TRUE (old system).
 * Items with status = 'archived' are NEVER automatically deleted and
 * will remain in the archive indefinitely until manually deleted by admin.
 */
export const cleanupDeletedNews = async () => {
  try {
    // Check if status column exists
    let statusColumnExists = false;
    try {
      const [columns] = await db.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'news' 
        AND COLUMN_NAME = 'status'
      `);
      statusColumnExists = columns.length > 0;
    } catch (error) {
      // If we can't check, assume it doesn't exist (backward compatibility)
      statusColumnExists = false;
    }

    // Delete news items that have been deleted for more than 15 days
    // IMPORTANT: Exclude archived items (status = 'archived') - they should never be auto-deleted
    let query;
    if (statusColumnExists) {
      query = `
        DELETE FROM news 
        WHERE is_deleted = TRUE 
        AND (status IS NULL OR status != 'archived')
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 15 DAY)
      `;
    } else {
      // Fallback for old system without status column
      query = `
        DELETE FROM news 
        WHERE is_deleted = TRUE 
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 15 DAY)
      `;
    }

    const [result] = await db.execute(query);

    return {
      success: true,
      deletedCount: result.affectedRows,
      message: `Cleaned up ${result.affectedRows} deleted news items`
    };
  } catch (error) {
    console.error('Error during cleanup of deleted news:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to cleanup deleted news items'
    };
  }
};

/**
 * Manual cleanup function that can be called from admin routes
 */
export const manualCleanupDeletedNews = async (req, res) => {
  try {
    const result = await cleanupDeletedNews();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform manual cleanup',
      error: error.message
    });
  }
};

// Export for potential cron job usage
export default cleanupDeletedNews;
