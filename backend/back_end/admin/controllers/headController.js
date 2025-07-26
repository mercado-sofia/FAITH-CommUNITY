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
    const [rows] = await db.execute("SELECT * FROM organization_heads WHERE organization_id = ? ORDER BY id", [
      organization_id,
    ])
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
  const { organization_id, head_name, role, facebook, email, photo } = req.body

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
      `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organization_id, head_name.trim(), role.trim(), facebook || null, email || null, photo || null],
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
  const { head_name, role, facebook, email, photo } = req.body

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
       SET head_name = ?, role = ?, facebook = ?, email = ?, photo = ?, updated_at = NOW() 
       WHERE id = ?`,
      [head_name.trim(), role.trim(), facebook || null, email || null, photo || null, id],
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

export const bulkUpdateHeads = async (req, res) => {
  const { organization_id, heads } = req.body

  if (!organization_id || !Array.isArray(heads)) {
    return res.status(400).json({
      success: false,
      message: "Organization ID and heads array are required",
    })
  }

  try {
    // Start transaction
    await db.execute("START TRANSACTION")

    // Verify organization exists
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    if (orgCheck.length === 0) {
      await db.execute("ROLLBACK")
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    // Delete existing heads for this organization
    await db.execute("DELETE FROM organization_heads WHERE organization_id = ?", [organization_id])

    // Insert new heads
    for (const head of heads) {
      if (!head.head_name || !head.role) {
        await db.execute("ROLLBACK")
        return res.status(400).json({
          success: false,
          message: "Each head must have a name and role",
        })
      }

      // Validate email if provided
      if (head.email && !/\S+@\S+\.\S+/.test(head.email)) {
        await db.execute("ROLLBACK")
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        })
      }

      // Validate Facebook URL if provided
      if (head.facebook && !head.facebook.includes("facebook.com")) {
        await db.execute("ROLLBACK")
        return res.status(400).json({
          success: false,
          message: "Please provide a valid Facebook URL",
        })
      }

      await db.execute(
        `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          organization_id,
          head.head_name.trim(),
          head.role.trim(),
          head.facebook || null,
          head.email || null,
          head.photo || null,
        ],
      )
    }

    // Commit transaction
    await db.execute("COMMIT")

    res.json({
      success: true,
      message: "Organization heads updated successfully",
      count: heads.length,
    })
  } catch (error) {
    await db.execute("ROLLBACK")
    console.error("Bulk update heads error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update organization heads",
      error: error.message,
    })
  }
}