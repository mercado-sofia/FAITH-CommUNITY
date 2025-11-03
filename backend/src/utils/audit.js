import db from "../database.js"
import pino from "pino"
import { getClientIpAddress } from "./ipAddressHelper.js"

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['password', 'token', 'secret'],
    remove: true
  }
})

// Input validation functions
function validateAuditInput(userId, action, details) {
  if (!userId || typeof userId !== 'number' || userId <= 0) {
    logger.warn({
      event: 'audit_validation_failed',
      field: 'userId',
      value: userId,
      reason: 'Must be a positive number'
    }, 'Invalid user ID provided for audit logging');
    return false;
  }
  if (!action || typeof action !== 'string' || action.trim().length === 0) {
    logger.warn({
      event: 'audit_validation_failed',
      field: 'action',
      value: action,
      reason: 'Must be a non-empty string'
    }, 'Invalid action provided for audit logging');
    return false;
  }
  if (action.length > 100) {
    logger.warn({
      event: 'audit_validation_failed',
      field: 'action',
      value: action,
      reason: `Too long: ${action.length} characters. Maximum 100 allowed`
    }, 'Action too long for audit logging');
    return false;
  }
  if (details && typeof details !== 'string') {
    logger.warn({
      event: 'audit_validation_failed',
      field: 'details',
      value: typeof details,
      reason: 'Must be a string'
    }, 'Invalid details format for audit logging');
    return false;
  }
  if (details && details.length > 65535) { // TEXT field limit
    logger.warn({
      event: 'audit_validation_failed',
      field: 'details',
      value: details.length,
      reason: 'Too long: Maximum 65535 characters allowed'
    }, 'Details too long for audit logging');
    return false;
  }
  return true;
}

function validateUserType(userType) {
  if (!userType || !['admin', 'superadmin'].includes(userType)) {
    logger.warn({
      event: 'audit_validation_failed',
      field: 'userType',
      value: userType,
      reason: 'Must be admin or superadmin'
    }, 'Invalid user type for audit logging');
    return false;
  }
  return true;
}

export async function ensureAuditTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_type ENUM('admin', 'superadmin') NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_user_type (user_type),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      )
    `)
    logger.info('Audit table ensured successfully');
  } catch (e) {
    logger.error({
      event: 'audit_table_creation_failed',
      error: e.message,
      stack: e.stack
    }, 'CRITICAL: Failed to ensure audit table exists');
    throw new Error(`Database setup failed: ${e.message}`);
  }
}

export async function logAdminAction(adminId, action, details, req) {
  try {
    // Validate input parameters
    if (!validateAuditInput(adminId, action, details)) {
      return false;
    }
    
    await ensureAuditTable();
    const ip = req ? getClientIpAddress(req) : null;
    const ua = req?.headers?.['user-agent'] || null;
    
    await db.execute(
      `INSERT INTO audit_logs (user_id, user_type, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin', action, details || null, ip, ua]
    );
    
    logger.info({
      event: 'audit_log_created',
      userType: 'admin',
      userId: adminId,
      action,
      ipAddress: ip
    }, `Audit log created: Admin ${adminId} performed action '${action}'`);
    
    return true;
  } catch (e) {
    logger.error({
      event: 'audit_log_failed',
      userType: 'admin',
      userId: adminId,
      action,
      details: details ? details.substring(0, 100) + '...' : null,
      error: e.message,
      stack: e.stack,
      ipAddress: req ? getClientIpAddress(req) : null
    }, 'CRITICAL: Failed to log admin action');
    
    // Don't throw the error to prevent breaking the main operation
    // but log it as a critical security event
    return false;
  }
}

export async function logSuperadminAction(superadminId, action, details, req) {
  try {
    // Validate input parameters
    if (!validateAuditInput(superadminId, action, details)) {
      return false;
    }
    
    await ensureAuditTable();
    const ip = req ? getClientIpAddress(req) : null;
    const ua = req?.headers?.['user-agent'] || null;
    
    await db.execute(
      `INSERT INTO audit_logs (user_id, user_type, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
      [superadminId, 'superadmin', action, details || null, ip, ua]
    );
    
    logger.info({
      event: 'audit_log_created',
      userType: 'superadmin',
      userId: superadminId,
      action,
      ipAddress: ip
    }, `Audit log created: Superadmin ${superadminId} performed action '${action}'`);
    
    return true;
  } catch (e) {
    logger.error({
      event: 'audit_log_failed',
      userType: 'superadmin',
      userId: superadminId,
      action,
      details: details ? details.substring(0, 100) + '...' : null,
      error: e.message,
      stack: e.stack,
      ipAddress: req ? getClientIpAddress(req) : null
    }, 'CRITICAL: Failed to log superadmin action');
    
    // Don't throw the error to prevent breaking the main operation
    // but log it as a critical security event
    return false;
  }
}

// Utility functions for querying audit logs
export async function getAuditLogs(userType = null, userId = null, limit = 100) {
  try {
    // Validate input parameters
    if (userType && !validateUserType(userType)) {
      return [];
    }
    if (userId && (typeof userId !== 'number' || userId <= 0)) {
      logger.warn({
        event: 'audit_query_validation_failed',
        field: 'userId',
        value: userId,
        reason: 'Must be a positive number'
      }, 'Invalid user ID for audit query');
      return [];
    }
    if (typeof limit !== 'number' || limit <= 0 || limit > 1000) {
      logger.warn({
        event: 'audit_query_validation_failed',
        field: 'limit',
        value: limit,
        reason: 'Must be a positive number between 1 and 1000'
      }, 'Invalid limit for audit query');
      return [];
    }

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (userType) {
      query += ' AND user_type = ?';
      params.push(userType);
    }
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const [rows] = await db.execute(query, params);
    logger.info({
      event: 'audit_logs_retrieved',
      userType,
      userId,
      limit,
      count: rows.length
    }, `Retrieved ${rows.length} audit logs`);
    return rows;
  } catch (e) {
    logger.error({
      event: 'audit_logs_retrieval_failed',
      userType,
      userId,
      limit,
      error: e.message,
      stack: e.stack
    }, 'Failed to retrieve audit logs');
    return [];
  }
}

export async function getAdminAuditLogs(adminId, limit = 100) {
  try {
    if (!adminId || typeof adminId !== 'number' || adminId <= 0) {
      logger.warn({
        event: 'admin_audit_logs_validation_failed',
        adminId,
        limit,
        reason: 'Invalid admin ID - must be a positive number'
      }, 'Invalid admin ID for audit logs query');
      return [];
    }
    return await getAuditLogs('admin', adminId, limit);
  } catch (e) {
    logger.error({
      event: 'admin_audit_logs_retrieval_failed',
      adminId,
      limit,
      error: e.message,
      stack: e.stack
    }, 'Failed to retrieve admin audit logs');
    return [];
  }
}

export async function getSuperadminAuditLogs(superadminId, limit = 100) {
  try {
    if (!superadminId || typeof superadminId !== 'number' || superadminId <= 0) {
      logger.warn({
        event: 'superadmin_audit_logs_validation_failed',
        superadminId,
        limit,
        reason: 'Invalid superadmin ID - must be a positive number'
      }, 'Invalid superadmin ID for audit logs query');
      return [];
    }
    return await getAuditLogs('superadmin', superadminId, limit);
  } catch (e) {
    logger.error({
      event: 'superadmin_audit_logs_retrieval_failed',
      superadminId,
      limit,
      error: e.message,
      stack: e.stack
    }, 'Failed to retrieve superadmin audit logs');
    return [];
  }
}

export async function getAllAuditLogs(limit = 100) {
  try {
    return await getAuditLogs(null, null, limit);
  } catch (e) {
    logger.error({
      event: 'all_audit_logs_retrieval_failed',
      limit,
      error: e.message,
      stack: e.stack
    }, 'Failed to retrieve all audit logs');
    return [];
  }
}

export default { 
  ensureAuditTable, 
  logAdminAction, 
  logSuperadminAction,
  getAuditLogs,
  getAdminAuditLogs,
  getSuperadminAuditLogs,
  getAllAuditLogs
}