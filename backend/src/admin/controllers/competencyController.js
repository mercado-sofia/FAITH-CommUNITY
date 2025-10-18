//db table: competencies

import db from "../../database.js"

export const addCompetency = async (req, res) => {
  const { organization_id, competency } = req.body

  // Input validation
  if (!organization_id || !competency) {
    return res.status(400).json({
      success: false,
      message: "Organization ID and competency description are required",
    })
  }

  if (competency.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Competency description must be at least 10 characters",
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
    const [existing] = await db.execute("SELECT * FROM competencies WHERE organization_id = ?", [organization_id])

    if (existing.length > 0) {
      // Update if it exists
      await db.execute("UPDATE competencies SET competency = ? WHERE organization_id = ?", [
        competency.trim(),
        organization_id,
      ])
      res.json({
        success: true,
        message: "Competency updated successfully",
      })
    } else {
      // Otherwise insert
      await db.execute("INSERT INTO competencies (organization_id, competency) VALUES (?, ?)", [
        organization_id,
        competency.trim(),
      ])
      res.status(201).json({
        success: true,
        message: "Competency added successfully",
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save competency",
      error: error.message,
    })
  }
}

export const getCompetencies = async (req, res) => {
  const { organization_id } = req.params

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  try {
    const [rows] = await db.execute("SELECT * FROM competencies WHERE organization_id = ?", [organization_id])
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve competencies",
      error: error.message,
    })
  }
}

export const getAllCompetencies = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.*, o.orgName, o.org 
      FROM competencies c 
      LEFT JOIN organizations o ON c.organization_id = o.id 
      ORDER BY o.orgName
    `)
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve competencies",
      error: error.message,
    })
  }
}

export const deleteCompetency = async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Competency ID is required",
    })
  }

  try {
    const [result] = await db.execute("DELETE FROM competencies WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Competency not found",
      })
    }

    res.json({
      success: true,
      message: "Competency deleted successfully",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete competency",
      error: error.message,
    })
  }
}