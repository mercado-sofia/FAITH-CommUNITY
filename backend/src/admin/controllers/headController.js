//db table: organization_heads

import db from "../../database.js"

export const getHeads = async (req, res) => {
  const { organization_id } = req.params

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM organization_heads WHERE organization_id = ? ORDER BY priority ASC, display_order ASC, id ASC", 
      [organization_id]
    )
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error("Get heads error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve organization heads",
      error: error.message,
    })
  }
}

export const addHead = async (req, res) => {
  const { organization_id, head_name, role, facebook, email, photo, priority, display_order } = req.body

  // Input validation
  if (!organization_id || !head_name || !role) {
    return res.status(400).json({
      success: false,
      message: "Organization ID, head name, and role are required",
    })
  }

  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    })
  }

  if (facebook && !facebook.includes("facebook.com")) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid Facebook URL",
    })
  }

  try {
    // Check if organization exists
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    if (orgCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    // Handle Cloudinary upload for photo if provided
    let finalPhoto = photo?.trim() || null
    if (req.file) {
      try {
        const { uploadSingleToCloudinary, CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
        const { uploadSingleToCloudinary: uploadToCloudinary } = await import('../../utils/cloudinaryUpload.js');
        
        // Upload new photo to Cloudinary
        const uploadResult = await uploadToCloudinary(
          req.file, 
          CLOUDINARY_FOLDERS.ORGANIZATIONS.HEADS,
          { prefix: 'org_head_' }
        );
        finalPhoto = uploadResult.url;
      } catch (uploadError) {
        console.error('Error uploading organization head photo to Cloudinary:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload organization head photo' 
        });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO organization_heads (organization_id, head_name, role, priority, display_order, facebook, email, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id, 
        head_name.trim(), 
        role.trim(), 
        priority || 999, 
        display_order || 999, 
        facebook?.trim() || '', 
        email?.trim() || null, 
        finalPhoto
      ],
    )

    res.status(201).json({
      success: true,
      message: "Organization head added successfully",
      data: { id: result.insertId },
    })
  } catch (error) {
    console.error("Add head error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add organization head",
      error: error.message,
    })
  }
}

export const updateHead = async (req, res) => {
  const { id } = req.params
  const { head_name, role, facebook, email, photo, priority, display_order } = req.body

  // Individual head update request
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Head ID is required",
    })
  }

  if (!head_name || !role) {
    return res.status(400).json({
      success: false,
      message: "Head name and role are required",
    })
  }

  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    })
  }

  if (facebook && !facebook.includes("facebook.com")) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid Facebook URL",
    })
  }

  try {
    // Handle Cloudinary upload for photo if provided
    let finalPhoto = photo?.trim() || null
    if (req.file) {
      try {
        const { deleteFromCloudinary, extractPublicIdFromUrl, CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
        const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
        
        // Get current head to check for existing photo
        const [currentHead] = await db.execute("SELECT photo FROM organization_heads WHERE id = ?", [id]);
        if (currentHead.length > 0 && currentHead[0].photo) {
          // Delete old photo from Cloudinary
          const oldPublicId = extractPublicIdFromUrl(currentHead[0].photo);
          if (oldPublicId) {
            try {
              await deleteFromCloudinary(oldPublicId);
            } catch (deleteError) {
              console.warn('Failed to delete old organization head photo from Cloudinary:', deleteError.message);
            }
          }
        }
        
        // Upload new photo to Cloudinary
        const uploadResult = await uploadSingleToCloudinary(
          req.file, 
          CLOUDINARY_FOLDERS.ORGANIZATIONS.HEADS,
          { prefix: 'org_head_' }
        );
        finalPhoto = uploadResult.url;
      } catch (uploadError) {
        console.error('Error uploading organization head photo to Cloudinary:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload organization head photo' 
        });
      }
    }

    const [result] = await db.execute(
      `UPDATE organization_heads 
       SET head_name = ?, role = ?, priority = ?, display_order = ?, facebook = ?, email = ?, photo = ? 
       WHERE id = ?`,
      [
        head_name.trim(), 
        role.trim(), 
        priority || 999, 
        display_order || 999, 
        facebook?.trim() || '', 
        email?.trim() || null, 
        finalPhoto, 
        id
      ],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization head not found",
      })
    }

    // Individual head update completed successfully
    res.json({
      success: true,
      message: "Organization head updated successfully",
    })
  } catch (error) {
    console.error("Update head error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update organization head",
      error: error.message,
    })
  }
}

export const deleteHead = async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Head ID is required",
    })
  }

  try {
    const [result] = await db.execute("DELETE FROM organization_heads WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization head not found",
      })
    }

    res.json({
      success: true,
      message: "Organization head deleted successfully",
    })
  } catch (error) {
    console.error("Delete head error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete organization head",
      error: error.message,
    })
  }
}

export const bulkDeleteHeads = async (req, res) => {
  const { organization_id, head_ids } = req.body

  // Bulk delete heads request

  if (!organization_id || !Array.isArray(head_ids) || head_ids.length === 0) {
    // Validation failed: Missing organization_id or head_ids is not array or empty
    return res.status(400).json({
      success: false,
      message: "Organization ID and head IDs array are required",
    })
  }

  try {
    // Verify organization exists first
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    // Organization check result
    
    if (orgCheck.length === 0) {
      // Organization not found
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    // Verify all heads belong to this organization
    const placeholders = head_ids.map(() => '?').join(',');
    const [headsCheck] = await db.execute(
      `SELECT id FROM organization_heads WHERE id IN (${placeholders}) AND organization_id = ?`,
      [...head_ids, organization_id]
    );

    if (headsCheck.length !== head_ids.length) {
      return res.status(400).json({
        success: false,
        message: "Some heads do not belong to this organization or do not exist",
      })
    }

    // Delete the heads
    const [result] = await db.execute(
      `DELETE FROM organization_heads WHERE id IN (${placeholders}) AND organization_id = ?`,
      [...head_ids, organization_id]
    );


    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "No heads were deleted",
      })
    }

    res.json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} organization head(s)`,
      deletedCount: result.affectedRows,
    })
  } catch (error) {
    console.error("Bulk delete heads error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete organization heads",
      error: error.message,
    })
  }
}

export const bulkUpdateHeads = async (req, res) => {
  const { organization_id, heads } = req.body

  

  if (!organization_id || !Array.isArray(heads)) {
    return res.status(400).json({
      success: false,
      message: "Organization ID and heads array are required",
    })
  }

  try {
    // Verify organization exists first
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    // Organization check result
    
    if (orgCheck.length === 0) {
      // Organization not found
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    // Delete existing heads for this organization
    await db.execute("DELETE FROM organization_heads WHERE organization_id = ?", [organization_id])

    // Insert new heads
    for (let i = 0; i < heads.length; i++) {
      const head = heads[i];
      
      if (!head.head_name || !head.role) {
        return res.status(400).json({
          success: false,
          message: "Each head must have a name and role",
        })
      }

      // Validate email if provided
      if (head.email && !/\S+@\S+\.\S+/.test(head.email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        })
      }

      // Validate Facebook URL if provided
      if (head.facebook && !head.facebook.includes("facebook.com")) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid Facebook URL",
        })
      }

      // Auto-assign priority based on role if not provided
      const getRolePriority = (role) => {
        const roleStr = role.toLowerCase();
        if (roleStr.includes('org adviser') || roleStr.includes('adviser')) return 1;
        if (roleStr.includes('president') && !roleStr.includes('vice')) return 2;
        if (roleStr.includes('vice') && roleStr.includes('president')) return 3;
        if (roleStr.includes('secretary')) return 4;
        if (roleStr.includes('treasurer')) return 5;
        if (roleStr.includes('director')) return 6;
        if (roleStr.includes('manager')) return 7;
        if (roleStr.includes('coordinator')) return 8;
        if (roleStr.includes('member')) return 9;
        return 999;
      };

      const priority = head.priority || getRolePriority(head.role);
      const display_order = head.display_order || priority;

      // Clean up photo field - remove base64 data and limit length
      let cleanPhoto = head.photo?.trim() || null;
      if (cleanPhoto && cleanPhoto.startsWith('data:')) {
        cleanPhoto = null;
      }
      if (cleanPhoto && cleanPhoto.length > 500) {
        cleanPhoto = cleanPhoto.substring(0, 500);
      }

      
      await db.execute(
        `INSERT INTO organization_heads (organization_id, head_name, role, priority, display_order, facebook, email, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          organization_id,
          head.head_name.trim(),
          head.role.trim(),
          priority,
          display_order,
          head.facebook?.trim() || '',
          head.email?.trim() || null,
          cleanPhoto,
        ],
      )
      
    }

    res.json({
      success: true,
      message: "Organization heads updated successfully",
      count: heads.length,
    })
  } catch (error) {
    console.error("Bulk update heads error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update organization heads",
      error: error.message,
    })
  }
}

// Reorder heads for an organization
export const reorderHeads = async (req, res) => {
  const { heads } = req.body;

  if (!heads || !Array.isArray(heads)) {
    return res.status(400).json({
      success: false,
      message: "Heads array is required"
    });
  }

  try {
    // Update display_order for each head
    for (const head of heads) {
      if (head.id && head.display_order !== undefined) {
        await db.execute(
          "UPDATE organization_heads SET display_order = ? WHERE id = ?",
          [head.display_order, head.id]
        );
      }
    }

    res.json({
      success: true,
      message: "Organization heads reordered successfully"
    });
  } catch (error) {
    console.error("Reorder heads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder organization heads",
      error: error.message
    });
  }
}