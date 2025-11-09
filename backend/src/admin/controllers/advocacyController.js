//db table: advocacies

import db from "../../database.js"

// Helper function to normalize advocacy/competency data
const normalizeTextData = (value) => {
  if (!value) return ""
  
  // If it's already a string, check if it's a JSON string
  if (typeof value === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value)
      // If parsed result is an object (like {}), return empty string
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
        return ""
      }
      // If parsed result is a string, return it
      if (typeof parsed === 'string') {
        return parsed
      }
      // Otherwise return empty string for other object types
      return ""
    } catch (e) {
      // Not JSON, return as-is
      return value
    }
  }
  
  // If it's an object, check if it's empty
  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value).length === 0) {
      return ""
    }
    // If object has content, try to stringify (shouldn't happen, but handle it)
    return JSON.stringify(value)
  }
  
  // For other types, convert to string
  return String(value)
}

export const addAdvocacy = async (req, res) => {
  const { organization_id, advocacy } = req.body

  // Input validation
  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  // Allow empty advocacy, but if provided, it must be at least 10 characters
  if (advocacy !== undefined && advocacy !== null && advocacy.trim().length > 0 && advocacy.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Advocacy description must be at least 10 characters if provided",
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

    // Normalize advocacy value (handle undefined/null/empty)
    const advocacyValue = (advocacy !== undefined && advocacy !== null) ? advocacy.trim() : "";
    
    if (existing.length > 0) {
      // Update if it exists
      await db.execute("UPDATE advocacies SET advocacy = ? WHERE organization_id = ?", [
        advocacyValue,
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
    
    // Normalize the advocacy field to ensure it's always a string
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
    
    // Normalize the advocacy field to ensure it's always a string
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