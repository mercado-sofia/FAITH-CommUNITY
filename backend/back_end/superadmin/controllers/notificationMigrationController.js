// Controller for notification migration utilities
import { createMissingNotifications } from '../../utils/createMissingNotifications.js';

export const migrateMissingNotifications = async (req, res) => {
  try {
    await createMissingNotifications();
    
    res.json({
      success: true,
      message: 'Notification migration completed successfully'
    });
  } catch (error) {
    console.error('❌ Notification migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Notification migration failed',
      error: error.message
    });
  }
};
