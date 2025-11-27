import db from "../../database.js"

const normalizeTextData = (value) => {
  if (!value) return ""
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
        return ""
      }
      if (typeof parsed === 'string') {
        return parsed
      }
      return ""
    } catch (e) {
      return value
    }
  }
  
  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value).length === 0) {
      return ""
    }
    return JSON.stringify(value)
  }
  
  return String(value)
}

export const addCompetency = async (req, res) => {
  const { organization_id, competency } = req.body

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  if (competency !== undefined && competency !== null && competency.trim().length > 0 && competency.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Competency description must be at least 10 characters if provided",
    })
  }

  try {
    const [orgCheck] = await db.execute("SELECT id FROM organizations WHERE id = ?", [organization_id])
    if (orgCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    const [existing] = await db.execute("SELECT * FROM competencies WHERE organization_id = ?", [organization_id])

    const competencyValue = (competency !== undefined && competency !== null) ? competency.trim() : "";
    
    if (existing.length > 0) {
      await db.execute("UPDATE competencies SET competency = ? WHERE organization_id = ?", [
        competencyValue,
        organization_id,
      ])
      res.json({
        success: true,
        message: "Competency updated successfully",
      })
    } else {
      await db.execute("INSERT INTO competencies (organization_id, competency) VALUES (?, ?)", [
        organization_id,
        competencyValue,
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
    
    const normalizedRows = rows.map(row => ({
      ...row,
      competency: normalizeTextData(row.competency)
    }))
    
    res.json({
      success: true,
      data: normalizedRows,
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
    
    const normalizedRows = rows.map(row => ({
      ...row,
      competency: normalizeTextData(row.competency)
    }))
    
    res.json({
      success: true,
      data: normalizedRows,
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