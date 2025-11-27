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

export const addAdvocacy = async (req, res) => {
  const { organization_id, advocacy } = req.body

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  if (advocacy !== undefined && advocacy !== null && advocacy.trim().length > 0 && advocacy.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Advocacy description must be at least 10 characters if provided",
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

    const [existing] = await db.execute("SELECT * FROM advocacies WHERE organization_id = ?", [organization_id])

    const advocacyValue = (advocacy !== undefined && advocacy !== null) ? advocacy.trim() : "";
    
    if (existing.length > 0) {
      await db.execute("UPDATE advocacies SET advocacy = ? WHERE organization_id = ?", [
        advocacyValue,
        organization_id,
      ])
      res.json({
        success: true,
        message: "Advocacy updated successfully",
      })
    } else {
      await db.execute("INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)", [
        organization_id,
        advocacyValue,
      ])
      res.status(201).json({
        success: true,
        message: "Advocacy added successfully",
      })
    }
  } catch (error) {
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
    
    const normalizedRows = rows.map(row => ({
      ...row,
      advocacy: normalizeTextData(row.advocacy)
    }))
    
    res.json({
      success: true,
      data: normalizedRows,
    })
  } catch (error) {
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
      SELECT a.*, o.orgName, o.org 
      FROM advocacies a 
      LEFT JOIN organizations o ON a.organization_id = o.id 
      ORDER BY o.orgName
    `)
    
    const normalizedRows = rows.map(row => ({
      ...row,
      advocacy: normalizeTextData(row.advocacy)
    }))
    
    res.json({
      success: true,
      data: normalizedRows,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advocacies",
      error: error.message,
    })
  }
}