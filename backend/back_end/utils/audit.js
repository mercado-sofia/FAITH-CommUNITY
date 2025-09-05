import db from "../database.js"

export async function ensureAuditTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
      )
    `)
  } catch (e) {
    // best-effort
  }
}

export async function logAdminAction(adminId, action, details, req) {
  try {
    await ensureAuditTable()
    const ip = req?.ip || null
    const ua = req?.headers?.['user-agent'] || null
    await db.execute(
      `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)`,
      [adminId, action, details || null, ip, ua]
    )
  } catch (e) {
    // swallow
  }
}

export default { ensureAuditTable, logAdminAction }


