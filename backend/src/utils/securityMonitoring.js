import db from "../database.js"
import pino from "pino"

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['password', 'token', 'secret'],
    remove: true
  }
})

export class SecurityMonitoring {
  // Track security events
  static async logSecurityEvent(type, severity, details, req = null) {
    await this.ensureSecurityLogsTable()
    
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null
    const userAgent = req?.headers?.['user-agent'] || null
    const userId = req?.admin?.id || req?.user?.id || null
    const userType = req?.admin ? 'admin' : req?.user ? 'user' : null
    
    try {
      await db.execute(
        `INSERT INTO security_logs (event_type, severity, details, user_id, user_type, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, severity, JSON.stringify(details), userId, userType, ipAddress, userAgent]
      )
      
      // Log to structured logger
      logger[severity]({
        event: 'security_event',
        type,
        severity,
        details,
        userId,
        userType,
        ipAddress,
        userAgent
      })
      
      // Check if alert should be triggered
      await this.checkAlertThresholds(type, ipAddress, userId)
      
    } catch (error) {
      logger.error('Failed to log security event:', error)
    }
  }
  
  // Check for alert thresholds
  static async checkAlertThresholds(eventType, ipAddress, userId) {
    const now = new Date()
    const oneHour = new Date(now.getTime() - 60 * 60 * 1000)
    const fifteenMin = new Date(now.getTime() - 15 * 60 * 1000)
    
    // Check for spikes in 401s (15+ in 15 minutes)
    if (eventType === 'failed_login') {
      const [count] = await db.execute(
        `SELECT COUNT(*) as count FROM security_logs 
         WHERE event_type = 'failed_login' AND created_at > ? AND ip_address = ?`,
        [fifteenMin, ipAddress]
      )
      
      if (count[0]?.count >= 15) {
        await this.triggerAlert('high_failed_login_rate', {
          ipAddress,
          count: count[0].count,
          timeWindow: '15 minutes'
        })
      }
    }
    
    // Check for repeated password reset requests (5+ in 1 hour)
    if (eventType === 'password_reset_request') {
      const [count] = await db.execute(
        `SELECT COUNT(*) as count FROM security_logs 
         WHERE event_type = 'password_reset_request' AND created_at > ? AND ip_address = ?`,
        [oneHour, ipAddress]
      )
      
      if (count[0]?.count >= 5) {
        await this.triggerAlert('excessive_password_resets', {
          ipAddress,
          count: count[0].count,
          timeWindow: '1 hour'
        })
      }
    }
    
    // Check for admin actions outside usual hours (10 PM - 6 AM)
    if (eventType === 'admin_action') {
      const hour = now.getHours()
      if (hour >= 22 || hour <= 6) {
        await this.triggerAlert('admin_action_unusual_hours', {
          userId,
          hour,
          ipAddress
        })
      }
    }
  }
  
  // Trigger security alert
  static async triggerAlert(alertType, details) {
    await this.ensureAlertsTable()
    
    // Check if similar alert was already sent recently (avoid spam)
    const recentAlert = await db.execute(
      `SELECT id FROM security_alerts 
       WHERE alert_type = ? AND details = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [alertType, JSON.stringify(details)]
    )
    
    if (recentAlert[0]?.length > 0) {
      return // Don't spam alerts
    }
    
    await db.execute(
      `INSERT INTO security_alerts (alert_type, details, status) VALUES (?, ?, 'pending')`,
      [alertType, JSON.stringify(details)]
    )
    
    logger.warn({
      event: 'security_alert',
      alertType,
      details
    })
    
    // In production, this would send notifications (email, Slack, etc.)
    // Security alert logged
  }
  
  // Get security metrics
  static async getSecurityMetrics(timeRange = '24h') {
    const timeMap = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    }
    
    const hours = timeMap[timeRange] || 24
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const [events] = await db.execute(
      `SELECT event_type, severity, COUNT(*) as count 
       FROM security_logs 
       WHERE created_at > ? 
       GROUP BY event_type, severity`,
      [since]
    )
    
    const [alerts] = await db.execute(
      `SELECT alert_type, status, COUNT(*) as count 
       FROM security_alerts 
       WHERE created_at > ? 
       GROUP BY alert_type, status`,
      [since]
    )
    
    return {
      timeRange,
      events: events || [],
      alerts: alerts || []
    }
  }
  
  // Ensure security logs table
  static async ensureSecurityLogsTable() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS security_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          severity ENUM('info', 'warn', 'error', 'fatal') NOT NULL,
          details JSON NULL,
          user_id INT NULL,
          user_type ENUM('user', 'admin', 'superadmin') NULL,
          ip_address VARCHAR(45) NULL,
          user_agent VARCHAR(500) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_event_type (event_type),
          INDEX idx_severity (severity),
          INDEX idx_created (created_at),
          INDEX idx_ip (ip_address)
        )
      `)
    } catch (error) {
      // Table might already exist
    }
  }
  
  // Ensure security alerts table
  static async ensureAlertsTable() {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS security_alerts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          alert_type VARCHAR(100) NOT NULL,
          details JSON NULL,
          status ENUM('pending', 'acknowledged', 'resolved') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          acknowledged_at TIMESTAMP NULL,
          resolved_at TIMESTAMP NULL,
          INDEX idx_alert_type (alert_type),
          INDEX idx_status (status),
          INDEX idx_created (created_at)
        )
      `)
    } catch (error) {
      // Table might already exist
    }
  }
}

// Middleware to log security events
export const logSecurityEvent = (eventType, severity = 'info') => {
  return (req, res, next) => {
    // Log the event after response
    res.on('finish', () => {
      SecurityMonitoring.logSecurityEvent(eventType, severity, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: res.get('X-Response-Time')
      }, req)
    })
    next()
  }
}

export default SecurityMonitoring
