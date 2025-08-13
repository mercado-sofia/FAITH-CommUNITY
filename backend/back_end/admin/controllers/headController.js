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
        photo?.trim() || null
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
    const [result] = await db.execute(
      `UPDATE organization_heads 
       SET head_name = ?, role = ?, priority = ?, display_order = ?, facebook = ?, email = ?, photo = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        head_name.trim(), 
        role.trim(), 
        priority || 999, 
        display_order || 999, 
        facebook?.trim() || '', 
        email?.trim() || null, 
        photo?.trim() || null, 
        id
      ],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization head not found",
      })
    }

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

  console.log('Bulk delete heads request:');
  console.log('Organization ID:', organization_id);
  console.log('Head IDs:', head_ids);

  if (!organization_id || !Array.isArray(head_ids) || head_ids.length === 0) {
    console.log('Validation failed: Missing organization_id or head_ids is not array or empty');
    return res.status(400).json({
      success: false,
      message: "Organization ID and head IDs array are required",
    })
  }

  try {
    // Verify organization exists first
    console.log('Checking if organization exists with ID:', organization_id);
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    console.log('Organization check result:', orgCheck);
    
    if (orgCheck.length === 0) {
      console.log('Organization not found');
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
      console.log('Some heads do not belong to this organization or do not exist');
      return res.status(400).json({
        success: false,
        message: "Some heads do not belong to this organization or do not exist",
      })
    }

    // Delete the heads
    console.log('Deleting heads with IDs:', head_ids);
    const [result] = await db.execute(
      `DELETE FROM organization_heads WHERE id IN (${placeholders}) AND organization_id = ?`,
      [...head_ids, organization_id]
    );

    console.log('Delete result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "No heads were deleted",
      })
    }

    console.log(`Successfully deleted ${result.affectedRows} heads`);
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

  console.log('Bulk update heads request:');
  console.log('Organization ID:', organization_id);
  console.log('Heads array:', heads);
  console.log('Request body:', req.body);
  
  // Log each head's photo field to check for issues
  if (heads && Array.isArray(heads)) {
    heads.forEach((head, index) => {
      console.log(`Head ${index + 1} photo:`, {
        hasPhoto: !!head.photo,
        photoType: typeof head.photo,
        photoLength: head.photo ? head.photo.length : 0,
        photoStartsWithData: head.photo ? head.photo.startsWith('data:') : false
      });
    });
  }

  if (!organization_id || !Array.isArray(heads)) {
    console.log('Validation failed: Missing organization_id or heads is not array');
    return res.status(400).json({
      success: false,
      message: "Organization ID and heads array are required",
    })
  }

  try {
    // Verify organization exists first
    console.log('Checking if organization exists with ID:', organization_id);
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    console.log('Organization check result:', orgCheck);
    
    if (orgCheck.length === 0) {
      console.log('Organization not found');
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    // Delete existing heads for this organization
    console.log('Deleting existing heads for organization:', organization_id);
    await db.execute("DELETE FROM organization_heads WHERE organization_id = ?", [organization_id])
    console.log('Existing heads deleted successfully');

    // Insert new heads
    console.log('Inserting', heads.length, 'new heads');
    for (let i = 0; i < heads.length; i++) {
      const head = heads[i];
      console.log(`Processing head ${i + 1}:`, head);
      
      if (!head.head_name || !head.role) {
        console.log('Validation failed: missing name or role for head', i + 1);
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
        if (roleStr.includes('president') && !roleStr.includes('vice')) return 1;
        if (roleStr.includes('vice') && roleStr.includes('president')) return 2;
        if (roleStr.includes('secretary')) return 3;
        if (roleStr.includes('treasurer')) return 4;
        if (roleStr.includes('director')) return 5;
        if (roleStr.includes('manager')) return 6;
        if (roleStr.includes('coordinator')) return 7;
        if (roleStr.includes('member')) return 8;
        return 999;
      };

      const priority = head.priority || getRolePriority(head.role);
      const display_order = head.display_order || priority;

      // Clean up photo field - remove base64 data and limit length
      let cleanPhoto = head.photo?.trim() || null;
      if (cleanPhoto && cleanPhoto.startsWith('data:')) {
        console.log(`Head ${i + 1}: Removing base64 photo data`);
        cleanPhoto = null;
      }
      if (cleanPhoto && cleanPhoto.length > 500) {
        console.log(`Head ${i + 1}: Photo field too long, truncating`);
        cleanPhoto = cleanPhoto.substring(0, 500);
      }

      console.log('Inserting head with data:', {
        organization_id,
        head_name: head.head_name.trim(),
        role: head.role.trim(),
        priority,
        display_order,
        facebook: head.facebook?.trim() || '',
        email: head.email?.trim() || null,
        photo: cleanPhoto,
      });
      
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
      
      console.log(`Head ${i + 1} inserted successfully`);
    }

    console.log('All heads inserted successfully');
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

    console.log('Heads reordered successfully');
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