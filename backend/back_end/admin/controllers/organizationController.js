// controllers/organizationController.js
import db from "../../database.js"

export const getOrganizationByName = async (req, res) => {
  const { org_name } = req.params
  console.log("🧪 org_name param:", org_name)

  try {
    const [orgRows] = await db.execute('SELECT * FROM organizations WHERE org = ? AND status = "ACTIVE"', [org_name])

    console.log("🔍 orgRows:", orgRows)

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    const org = orgRows[0]
    console.log("📦 Fetched org:", org)

    const [advocacies] = await db.execute("SELECT advocacy FROM advocacies WHERE organization_id = ?", [org.id])
    const [competencies] = await db.execute("SELECT competency FROM competencies WHERE organization_id = ?", [org.id])
    // Get email from admins table (Single Source of Truth)
    const [adminRows] = await db.execute(
      'SELECT email FROM admins WHERE org = ? AND status = "ACTIVE" LIMIT 1',
      [org.org]
    )
    const adminEmail = adminRows.length > 0 ? adminRows[0].email : null

    const [heads] = await db.execute(
      "SELECT head_name, role, facebook, email, photo, display_order FROM organization_heads WHERE organization_id = ?",
      [org.id],
    )

    res.json({
      success: true,
      data: {
        ...org,
        email: adminEmail, // Email from admins table
        // Fix: Return single strings instead of arrays
        advocacies: advocacies.length > 0 ? advocacies[0].advocacy : "",
        competencies: competencies.length > 0 ? competencies[0].competency : "",
        heads,
      },
    })
  } catch (err) {
    console.error("Get organization error:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export const createOrganization = async (req, res) => {
  const { logo, orgName, org, facebook, description, status } = req.body

  console.log("Backend: Received create request for new organization")
  console.log("Backend: Received body data:", { logo, orgName, org, facebook, description, status })

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

  try {
    // Check if organization with this acronym already exists
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

    // Insert new organization
    const [result] = await db.execute(
      `INSERT INTO organizations (logo, orgName, org, facebook, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [finalLogo, orgName, org, finalFacebook, finalDescription, finalStatus]
    )

    console.log("Backend: Successfully created organization with ID:", result.insertId)
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
  const { logo, orgName, org, facebook, description, status } = req.body

  console.log("Backend: Received update request for Org ID:", id)
  console.log("Backend: Received body data:", { logo, orgName, org, facebook, description, status })

  // Convert empty strings and undefined values to null for optional fields
  const finalLogo = (logo === "" || logo === undefined) ? null : logo
  const finalFacebook = (facebook === "" || facebook === undefined) ? null : facebook
  const finalDescription = (description === "" || description === undefined) ? null : description
  const finalStatus = status || "ACTIVE" // Ensure status is always a string

  console.log("Backend: Prepared values for DB:", {
    finalLogo,
    orgName,
    org,
    finalFacebook,
    finalDescription,
    finalStatus,
    id,
  })

  // Validate required fields
  if (!orgName || orgName === undefined) {
    return res.status(400).json({ success: false, error: "Organization name is required" })
  }
  if (!org || org === undefined) {
    return res.status(400).json({ success: false, error: "Organization acronym is required" })
  }

  // Get a connection for transaction
  const connection = await db.getConnection()
  
  try {
    // Start transaction using connection
    await connection.beginTransaction()

    // First, get the current organization data before updating
    const [currentOrgData] = await connection.execute(
      'SELECT org FROM organizations WHERE id = ?',
      [id]
    )

    if (currentOrgData.length === 0) {
      await connection.rollback()
      connection.release()
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    const currentOrgAcronym = currentOrgData[0].org

    // Update the organizations table
    const [orgResult] = await connection.execute(
      `UPDATE organizations
       SET logo = ?, orgName = ?, org = ?, facebook = ?, description = ?, status = ?
       WHERE id = ?`,
      [finalLogo, orgName, org, finalFacebook, finalDescription, finalStatus, id],
    )

    if (orgResult.affectedRows === 0) {
      await connection.rollback()
      connection.release()
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    // Update all admins that belong to this organization
    // Update org and orgName fields in the admins table (email stays in admins table)
    const [adminUpdateResult] = await connection.execute(
      `UPDATE admins 
       SET org = ?, orgName = ?
       WHERE org = ?`,
      [org, orgName, currentOrgAcronym]
    )

    console.log(`Backend: Updated ${adminUpdateResult.affectedRows} admin records`)

    // Commit the transaction
    await connection.commit()
    connection.release()

    console.log("Backend: Successfully updated organization and synced admin data")
    res.json({ 
      success: true, 
      message: "Organization info updated successfully and admin data synchronized" 
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
    res.status(500).json({ success: false, error: err.message })
  }
}