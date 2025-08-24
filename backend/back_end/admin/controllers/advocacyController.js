import db from "../../database.js"

export const addAdvocacy = async (req, res) => {
  const { organization_id, advocacy } = req.body

  // Input validation
  if (!organization_id || !advocacy) {
    return res.status(400).json({
      success: false,
      message: "Organization ID and advocacy description are required",
    })
  }

  if (advocacy.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Advocacy description must be at least 10 characters",
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

    // Check if an entry already exists
    const [existing] = await db.execute("SELECT * FROM advocacies WHERE organization_id = ?", [organization_id])

    if (existing.length > 0) {
      // Update if it exists
      await db.execute("UPDATE advocacies SET advocacy = ? WHERE organization_id = ?", [
        advocacy.trim(),
        organization_id,
      ])
      res.json({
        success: true,
        message: "Advocacy updated successfully",
      })
    } else {
      // Otherwise insert
      await db.execute("INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)", [
        organization_id,
        advocacy.trim(),
      ])
      res.status(201).json({
        success: true,
        message: "Advocacy added successfully",
      })
    }
  } catch (error) {
    console.error("Add/Update advocacy error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to save advocacy",
      error: error.message,
    })
  }
}

export const getAdvocacies = async (req, res) => {
  const { organization_id } = req.params

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  try {
    const [rows] = await db.execute("SELECT * FROM advocacies WHERE organization_id = ?", [organization_id])
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error("Get advocacies error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advocacies",
      error: error.message,
    })
  }
}

export const deleteAdvocacy = async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Advocacy ID is required",
    })
  }

  try {
    const [result] = await db.execute("DELETE FROM advocacies WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Advocacy not found",
      })
    }

    res.json({
      success: true,
      message: "Advocacy deleted successfully",
    })
  } catch (error) {
    console.error("Delete advocacy error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete advocacy",
      error: error.message,
    })
  }
}

export const getAllAdvocacies = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT a.*, admins.orgName, admins.org 
      FROM advocacies a 
      LEFT JOIN organizations o ON a.organization_id = o.id 
      LEFT JOIN admins ON a.organization_id = admins.organization_id
      ORDER BY admins.orgName
    `)
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error("Get all advocacies error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advocacies",
      error: error.message,
    })
  }
}