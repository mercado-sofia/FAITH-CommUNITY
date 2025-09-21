import db from "../../database.js"

// Get footer content
export const getFooterContent = async (req, res) => {
  try {
    // Get all footer content from database
    const [rows] = await db.query(`
      SELECT * FROM footer_content 
      WHERE is_active = 1 
      ORDER BY section_type, display_order
    `);

    // Organize data by section type
    const footerData = {
      contact: {},
      quickLinks: [],
      services: [],
      socialMedia: {},
      copyright: {}
    };

    rows.forEach(row => {
      switch (row.section_type) {
        case 'contact':
          footerData.contact[row.title] = {
            content: row.content,
            url: row.url,
            icon: row.icon
          };
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
          footerData.socialMedia[row.title.toLowerCase()] = {
            url: row.url,
            icon: row.icon
          };
          break;
        case 'copyright':
          footerData.copyright = {
            content: row.content
          };
          break;
      }
    });

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

// Update contact information
export const updateContactInfo = async (req, res) => {
  try {
    const { phone, email } = req.body;

    // Update phone
    if (phone !== undefined) {
      await db.query(
        'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE section_type = ? AND title = ?',
        [phone, 'contact', 'phone']
      );
    }

    // Update email
    if (email !== undefined) {
      await db.query(
        'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE section_type = ? AND title = ?',
        [email, 'contact', 'email']
      );
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

// Update social media URLs
export const updateSocialMedia = async (req, res) => {
  try {
    const { facebook, instagram, twitter } = req.body;

    // Update Facebook
    if (facebook !== undefined) {
      await db.query(
        'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE section_type = ? AND title = ?',
        [facebook, 'social_media', 'Facebook']
      );
    }

    // Update Instagram
    if (instagram !== undefined) {
      await db.query(
        'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE section_type = ? AND title = ?',
        [instagram, 'social_media', 'Instagram']
      );
    }

    // Update Twitter/X
    if (twitter !== undefined) {
      await db.query(
        'UPDATE footer_content SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE section_type = ? AND title = ?',
        [twitter, 'social_media', 'Twitter']
      );
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

// Update copyright text
export const updateCopyright = async (req, res) => {
  try {
    const { content } = req.body;

    await db.query(
      'UPDATE footer_content SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE section_type = ?',
      [content, 'copyright']
    );

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

// Get all services
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

// Add new service
export const addService = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Service name is required"
      });
    }

    // Get the next display order
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

// Update service
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

// Delete service
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
