import db from "../../database.js"

export const getFooterContent = async (req, res) => {
  try {
    // For contact section, get only the latest entry for each title (phone/email) using subquery
    const [rows] = await db.query(`
      SELECT fc1.* 
      FROM footer_content fc1
      LEFT JOIN (
        SELECT section_type, title, MAX(id) as max_id
        FROM footer_content
        WHERE section_type = 'contact' AND is_active = 1
        GROUP BY section_type, title
      ) fc2 ON fc1.section_type = fc2.section_type 
        AND fc1.title = fc2.title 
        AND fc1.id = fc2.max_id
      WHERE fc1.is_active = 1 
        AND (fc1.section_type != 'contact' OR fc2.max_id IS NOT NULL)
      ORDER BY fc1.section_type, fc1.display_order, fc1.id DESC
    `);

    const footerData = {
      contact: {},
      quickLinks: [],
      services: [],
      socialMedia: [],
      copyright: {}
    };

    rows.forEach(row => {
      switch (row.section_type) {
        case 'contact':
          if (!footerData.contact[row.title] || 
              (footerData.contact[row.title].id && footerData.contact[row.title].id < row.id)) {
            footerData.contact[row.title] = {
              content: row.content,
              url: row.url,
              icon: row.icon
            };
          }
          break;
        case 'quick_links':
          footerData.quickLinks.push({
            name: row.title,
            url: row.url,
            icon: row.icon
          });
          break;
        case 'services':
          footerData.services.push({
            id: row.id,
            name: row.title,
            content: row.content
          });
          break;
        case 'social_media':
          footerData.socialMedia.push({
            id: row.id,
            platform: row.title,
            url: row.url,
            icon: row.icon,
            displayOrder: row.display_order
          });
          break;
        case 'copyright':
          footerData.copyright = {
            content: row.content
          };
          break;
      }
    });

    footerData.socialMedia.sort((a, b) => a.displayOrder - b.displayOrder);

    res.json({
      success: true,
      data: footerData
    });
  } catch (error) {
    console.error("Error getting footer content:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get footer content",
      error: error.message
    });
  }
}

// UPSERT: create if doesn't exist, update if exists
export const updateContactInfo = async (req, res) => {
  try {
    const { phone, email } = req.body;

    if (phone !== undefined) {
      const phoneValue = phone && phone.trim() ? phone.trim() : null;
      
      const [allPhoneEntries] = await db.query(
        'SELECT id FROM footer_content WHERE section_type = ? AND title = ? ORDER BY id DESC',
        ['contact', 'phone']
      );

      if (allPhoneEntries.length > 0) {
        const latestPhone = allPhoneEntries[0];
        
        await db.query(
          'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [phoneValue, latestPhone.id]
        );
        
        if (allPhoneEntries.length > 1) {
          const duplicateIds = allPhoneEntries.slice(1).map(entry => entry.id);
          if (duplicateIds.length > 0) {
            await db.query(
              `DELETE FROM footer_content WHERE id IN (${duplicateIds.map(() => '?').join(',')})`,
              duplicateIds
            );
          }
        }
      } else {
        await db.query(
          'INSERT INTO footer_content (section_type, title, url, display_order, is_active) VALUES (?, ?, ?, ?, 1)',
          ['contact', 'phone', phoneValue, 1]
        );
      }
    }

    if (email !== undefined) {
      const emailValue = email && email.trim() ? email.trim() : null;
      
      const [allEmailEntries] = await db.query(
        'SELECT id FROM footer_content WHERE section_type = ? AND title = ? ORDER BY id DESC',
        ['contact', 'email']
      );

      if (allEmailEntries.length > 0) {
        const latestEmail = allEmailEntries[0];
        
        await db.query(
          'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [emailValue, latestEmail.id]
        );
        
        if (allEmailEntries.length > 1) {
          const duplicateIds = allEmailEntries.slice(1).map(entry => entry.id);
          if (duplicateIds.length > 0) {
            await db.query(
              `DELETE FROM footer_content WHERE id IN (${duplicateIds.map(() => '?').join(',')})`,
              duplicateIds
            );
          }
        }
      } else {
        await db.query(
          'INSERT INTO footer_content (section_type, title, url, display_order, is_active) VALUES (?, ?, ?, ?, 1)',
          ['contact', 'email', emailValue, 2]
        );
      }
    }

    res.json({
      success: true,
      message: "Contact information updated successfully"
    });
  } catch (error) {
    console.error("Error updating contact info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact information",
      error: error.message
    });
  }
};

export const updateSocialMedia = async (req, res) => {
  try {
    const { socialMedia } = req.body;

    if (!socialMedia || !Array.isArray(socialMedia)) {
      return res.status(400).json({
        success: false,
        message: "Social media data must be an array"
      });
    }

    await db.query(
      'UPDATE footer_content SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE section_type = ?',
      ['social_media']
    );

    for (let i = 0; i < socialMedia.length; i++) {
      const { platform, url, icon } = socialMedia[i];
      
      if (!platform || !url) {
        continue;
      }

      const [existing] = await db.query(
        'SELECT id FROM footer_content WHERE section_type = ? AND title = ?',
        ['social_media', platform]
      );

      if (existing.length > 0) {
        await db.query(
          'UPDATE footer_content SET url = ?, icon = ?, is_active = 1, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [url, icon || '', i + 1, existing[0].id]
        );
      } else {
        await db.query(
          'INSERT INTO footer_content (section_type, title, url, icon, display_order, is_active) VALUES (?, ?, ?, ?, ?, 1)',
          ['social_media', platform, url, icon || '', i + 1]
        );
      }
    }

    res.json({
      success: true,
      message: "Social media URLs updated successfully"
    });
  } catch (error) {
    console.error("Error updating social media:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update social media URLs",
      error: error.message
    });
  }
};

// UPSERT: create if doesn't exist, update if exists
export const updateCopyright = async (req, res) => {
  try {
    const { content } = req.body;

    const contentValue = content && content.trim() ? content.trim() : null;
    const [existingCopyright] = await db.query(
      'SELECT id FROM footer_content WHERE section_type = ?',
      ['copyright']
    );

    if (existingCopyright.length > 0) {
      await db.query(
        'UPDATE footer_content SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [contentValue, existingCopyright[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO footer_content (section_type, title, content, display_order, is_active) VALUES (?, ?, ?, ?, 1)',
        ['copyright', 'copyright', contentValue, 1]
      );
    }

    res.json({
      success: true,
      message: "Copyright text updated successfully"
    });
  } catch (error) {
    console.error("Error updating copyright:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update copyright text",
      error: error.message
    });
  }
};

export const getServices = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM footer_content 
      WHERE section_type = 'services' AND is_active = 1 
      ORDER BY display_order
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error getting services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get services",
      error: error.message
    });
  }
};

export const addService = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Service name is required"
      });
    }

    const [maxOrder] = await db.query(`
      SELECT MAX(display_order) as max_order FROM footer_content 
      WHERE section_type = 'services'
    `);
    
    const nextOrder = (maxOrder[0].max_order || 0) + 1;

    const [result] = await db.query(`
      INSERT INTO footer_content (section_type, title, content, display_order, is_active) 
      VALUES (?, ?, ?, ?, 1)
    `, ['services', name.trim(), name.trim(), nextOrder]);

    res.json({
      success: true,
      message: "Service added successfully",
      data: { id: result.insertId, name: name.trim() }
    });
  } catch (error) {
    console.error("Error adding service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add service",
      error: error.message
    });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Service name is required"
      });
    }

    await db.query(`
      UPDATE footer_content 
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND section_type = 'services'
    `, [name.trim(), name.trim(), id]);

    res.json({
      success: true,
      message: "Service updated successfully"
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      UPDATE footer_content 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND section_type = 'services'
    `, [id]);

    res.json({
      success: true,
      message: "Service deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message
    });
  }
};
