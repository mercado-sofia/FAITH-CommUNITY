//db table: organizations

import db from "../../database.js"

export const getOrganizationByName = async (req, res) => {
  const { org_name } = req.params

  try {
    // Get organization details with org/orgName from organizations table
    const [orgRows] = await db.execute(
      `SELECT o.*, a.email 
       FROM organizations o
       LEFT JOIN admins a ON a.organization_id = o.id AND a.status = "ACTIVE"
       WHERE o.org = ? LIMIT 1`,
      [org_name]
    )

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    const org = orgRows[0]
    console.log("📦 Fetched org:", org)

    const [advocacies] = await db.execute("SELECT advocacy FROM advocacies WHERE organization_id = ?", [org.id])
    const [competencies] = await db.execute("SELECT competency FROM competencies WHERE organization_id = ?", [org.id])

    const [heads] = await db.execute(
      "SELECT head_name, role, facebook, email, photo, display_order FROM organization_heads WHERE organization_id = ?",
      [org.id],
    )

    // Transform heads to construct proper photo URLs
    const transformedHeads = heads.map(head => {
      let photoUrl;
      if (head.photo) {
        if (head.photo.includes('/')) {
          // Legacy path - extract filename
          const filename = head.photo.split('/').pop();
          photoUrl = `/uploads/organizations/heads/${filename}`;
        } else {
          // New structure - direct filename
          photoUrl = `/uploads/organizations/heads/${head.photo}`;
        }
      } else {
        // Fallback to default photo
        photoUrl = null;
      }

      return {
        ...head,
        photo: photoUrl
      };
    });

    // Construct proper logo URL
    let logoUrl;
    if (org.logo) {
      if (org.logo.includes('/')) {
        // Legacy path - extract filename
        const filename = org.logo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        // New structure - direct filename
        logoUrl = `/uploads/organizations/logos/${org.logo}`;
      }
    } else {
      // Fallback to expected logo path
      logoUrl = `/logo/${org.org.toLowerCase()}_logo.jpg`;
    }

    res.json({
      success: true,
      data: {
        ...org,
        org: org.org, // From organizations table
        orgName: org.orgName, // From organizations table
        logo: logoUrl, // Use the constructed logo URL
        email: org.email, // Email from admins table
        // Fix: Return single strings instead of arrays
        advocacies: advocacies.length > 0 ? advocacies[0].advocacy : "",
        competencies: competencies.length > 0 ? competencies[0].competency : "",
        heads: transformedHeads, // Use the transformed heads with proper photo URLs
      },
    })
  } catch (err) {
    console.error("Get organization error:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export const createOrganization = async (req, res) => {
  const { logo, orgName, org, facebook, description, status, orgColor } = req.body

  // Organization creation request received

  // Validate required fields
  if (!org || !orgName) {
    return res.status(400).json({ 
      success: false, 
      message: "Organization acronym and name are required" 
    })
  }

  // Convert empty strings to null for optional fields
  const finalLogo = logo === "" ? null : logo
  const finalFacebook = facebook === "" ? null : facebook
  const finalDescription = description === "" ? null : description
  const finalStatus = status || "ACTIVE"
  const finalOrgColor = orgColor || "#444444"

  try {
    // Check if organization with this acronym already exists in organizations table
    const [existingOrg] = await db.execute(
      'SELECT id FROM organizations WHERE org = ?',
      [org]
    )

    if (existingOrg.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Organization with this acronym already exists" 
      })
    }

    // Insert new organization with org/orgName fields
    const [result] = await db.execute(
      `INSERT INTO organizations (org, orgName, logo, facebook, description, status, org_color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [org, orgName, finalLogo, finalFacebook, finalDescription, finalStatus, finalOrgColor]
    )

    // Organization created successfully
    res.status(201).json({ 
      success: true, 
      message: "Organization created successfully",
      data: { id: result.insertId }
    })
  } catch (err) {
    console.error("❌ Backend: Create organization error:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export const updateOrganizationInfo = async (req, res) => {
  const { id } = req.params
  const { logo, orgName, org, facebook, description, status, orgColor } = req.body

  console.log("Backend: Received update request for Org ID:", id)
  console.log("Backend: Received body data:", { logo, orgName, org, facebook, description, status, orgColor })

  // Validate required fields
  if (!org || !orgName) {
    return res.status(400).json({ 
      success: false, 
      message: "Organization acronym and name are required" 
    })
  }

  // Convert empty strings and undefined values to null for optional fields
  const finalLogo = (logo === "" || logo === undefined) ? null : logo
  const finalFacebook = (facebook === "" || facebook === undefined) ? null : facebook
  const finalDescription = (description === "" || description === undefined) ? null : description
  const finalStatus = status || "ACTIVE" // Ensure status is always a string
  const finalOrgColor = orgColor || "#444444"

  console.log("Backend: Final processed values:", { 
    org,
    orgName,
    finalLogo, 
    finalFacebook, 
    finalDescription, 
    finalStatus, 
    finalOrgColor 
  })

  // Values prepared for database update
  // Now updating org and orgName in organizations table

  // Get a connection for transaction
  const connection = await db.getConnection()
  
  if (!connection) {
    console.error("❌ Backend: Failed to get database connection")
    return res.status(500).json({ success: false, error: "Database connection failed" })
  }
  
  try {
    // Start transaction using connection
    await connection.beginTransaction()

    // First, get the current organization data before updating
    const [currentOrgData] = await connection.execute(
      'SELECT id FROM organizations WHERE id = ?',
      [id]
    )

    if (currentOrgData.length === 0) {
      await connection.rollback()
      connection.release()
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    // Check if org acronym is being changed and if it conflicts with existing orgs
    if (org) {
      const [existingOrg] = await connection.execute(
        'SELECT id FROM organizations WHERE org = ? AND id != ?',
        [org, id]
      )

      if (existingOrg.length > 0) {
        await connection.rollback()
        connection.release()
        return res.status(409).json({ success: false, message: "Organization acronym already exists" })
      }
    }

    // Update the organizations table with all fields including org/orgName
    const [orgResult] = await connection.execute(
      `UPDATE organizations
       SET org = ?, orgName = ?, logo = ?, facebook = ?, description = ?, status = ?, org_color = ?
       WHERE id = ?`,
      [org, orgName, finalLogo, finalFacebook, finalDescription, finalStatus, finalOrgColor, id],
    )

    if (orgResult.affectedRows === 0) {
      await connection.rollback()
      connection.release()
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    // Organization data updated successfully

    // Commit the transaction
    await connection.commit()
    
    // Get the updated organization data to return
    const [updatedOrgData] = await connection.execute(
      'SELECT * FROM organizations WHERE id = ?',
      [id]
    )
    
    connection.release()

    // Organization data updated successfully
    res.json({ 
      success: true, 
      message: "Organization information updated successfully",
      data: updatedOrgData[0] || { id }
    })
  } catch (err) {
    // Rollback the transaction in case of error
    try {
      await connection.rollback()
    } catch (rollbackErr) {
      console.error("❌ Backend: Rollback error:", rollbackErr)
    } finally {
      connection.release()
    }
    
    console.error("❌ Backend: Update organization error:", err)
    console.error("❌ Backend: Error stack:", err.stack)
    console.error("❌ Backend: Error details:", {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    })
    res.status(500).json({ success: false, error: err.message })
  }
}

// Get organization by ID
export const getOrganizationById = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: "Invalid organization ID" })
  }

  try {
    // Get organization details with org/orgName from organizations table
    const [orgRows] = await db.execute(
      `SELECT o.*, a.email 
       FROM organizations o
       LEFT JOIN admins a ON a.organization_id = o.id AND a.status = "ACTIVE"
       WHERE o.id = ? LIMIT 1`,
      [id]
    )

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    const org = orgRows[0]
    console.log("📦 Fetched org by ID:", org)

    const [advocacies] = await db.execute("SELECT advocacy FROM advocacies WHERE organization_id = ?", [org.id])
    const [competencies] = await db.execute("SELECT competency FROM competencies WHERE organization_id = ?", [org.id])

    const [heads] = await db.execute(
      "SELECT head_name, role, facebook, email, photo, display_order FROM organization_heads WHERE organization_id = ?",
      [org.id],
    )

    // Transform heads to construct proper photo URLs
    const transformedHeads = heads.map(head => {
      let photoUrl;
      if (head.photo) {
        if (head.photo.includes('/')) {
          // Legacy path - extract filename
          const filename = head.photo.split('/').pop();
          photoUrl = `/uploads/organizations/heads/${filename}`;
        } else {
          // New structure - direct filename
          photoUrl = `/uploads/organizations/heads/${head.photo}`;
        }
      } else {
        // Fallback to default photo
        photoUrl = null;
      }

      return {
        ...head,
        photo: photoUrl
      };
    });

    // Construct proper logo URL
    let logoUrl;
    if (org.logo) {
      if (org.logo.includes('/')) {
        // Legacy path - extract filename
        const filename = org.logo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        // New structure - direct filename
        logoUrl = `/uploads/organizations/logos/${org.logo}`;
      }
    } else {
      logoUrl = null;
    }

    res.json({
      success: true,
      data: {
        id: org.id,
        org: org.org,
        orgName: org.orgName,
        email: org.email,
        logo: logoUrl,
        facebook: org.facebook,
        description: org.description,
        org_color: org.org_color,
        status: org.status,
        advocacies: advocacies.map(a => a.advocacy),
        competencies: competencies.map(c => c.competency),
        heads: transformedHeads
      }
    })
  } catch (err) {
    console.error("❌ Backend: Get organization by ID error:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}