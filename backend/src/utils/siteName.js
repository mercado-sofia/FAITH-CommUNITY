import db from "../database.js";

/**
 * Get the site name from the database
 * @returns {Promise<string>} The site name, or 'FAITH CommUNITY' as fallback
 */
export async function getSiteName() {
  try {
    const [rows] = await db.query('SELECT site_name FROM site_name ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0 || !rows[0].site_name) {
      return 'FAITH CommUNITY'; // Fallback to default
    }

    return rows[0].site_name;
  } catch (error) {
    console.error('Error fetching site name:', error);
    return 'FAITH CommUNITY'; // Fallback to default on error
  }
}

