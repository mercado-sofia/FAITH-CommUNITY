// utils/cleanupDeletedNews.js
import db from '../database.js';

/**
 * Cleanup function to permanently delete news items that have been
 * in the deleted state for more than 15 days
 */
export const cleanupDeletedNews = async () => {
  try {
    
    // Delete news items that have been deleted for more than 15 days
    const [result] = await db.execute(`
      DELETE FROM news 
      WHERE is_deleted = TRUE 
      AND deleted_at < DATE_SUB(NOW(), INTERVAL 15 DAY)
    `);

    if (result.affectedRows > 0) {
    } else {
    }

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
