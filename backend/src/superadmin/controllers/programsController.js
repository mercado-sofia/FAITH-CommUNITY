//db table: programs_projects
import db from '../../database.js';
import { getOrganizationLogoUrl } from '../../utils/imageUrlUtils.js';

// Get all programs grouped by organization for superadmin
export const getAllProgramsByOrganization = async (req, res) => {
  // Disable caching to ensure fresh data (especially for collaboration data)
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.event_start_date,
        pp.event_end_date,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        pp.is_collaborative,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      ORDER BY o.orgName ASC, pp.created_at DESC
    `;
    
    const [results] = await db.execute(query);
    
    // Get multiple dates and additional images for each program
    const programsWithDates = await Promise.all(results.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      // Get collaboration data if program is collaborative
      let collaborators = [];
      
      // Debug: Log is_collaborative value for testinggg
      if (program.title === 'testinggg') {
        console.log('🔍 Backend Debug - testinggg:', {
          id: program.id,
          is_collaborative_raw: program.is_collaborative,
          is_collaborative_type: typeof program.is_collaborative,
          is_collaborative_truthy: Boolean(program.is_collaborative)
        });
      }
      
      // Check if program is collaborative (handle both 0/1 from MySQL and boolean)
      const isCollaborativeProgram = program.is_collaborative === 1 || 
                                     program.is_collaborative === true || 
                                     program.is_collaborative === '1' ||
                                     Boolean(program.is_collaborative);
      
      if (isCollaborativeProgram) {
        // Get all organizations involved in the collaboration
        // This includes both the primary organization and accepted collaborators
        const [collaborationRows] = await db.execute(`
          SELECT DISTINCT
            o.orgName as organization_name,
            o.org as organization_acronym,
            o.org_color as organization_color,
            CASE 
              WHEN o.id = ? THEN 'primary'
              ELSE 'collaborator'
            END as role
          FROM (
            -- Primary organization (the one that created the program)
            SELECT ? as org_id, 'primary' as role
            
            UNION ALL
            
            -- Collaborator organizations (those who accepted collaboration)
            SELECT o.id as org_id, 'collaborator' as role
            FROM program_collaborations pc
            LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE pc.program_id = ? AND pc.status = 'accepted'
          ) org_roles
          LEFT JOIN organizations o ON org_roles.org_id = o.id
          WHERE o.id IS NOT NULL
          ORDER BY 
            CASE WHEN org_roles.role = 'primary' THEN 0 ELSE 1 END,
            o.orgName ASC
        `, [program.organization_id, program.organization_id, program.id]);
        
        // Get admin details for each collaborator organization
        const collaboratorsWithAdmins = await Promise.all(collaborationRows.map(async (collab) => {
          if (collab.role === 'primary') {
            // For primary, get the admin who created the program
            const [adminRows] = await db.execute(`
              SELECT a.id, a.email
              FROM admins a
              WHERE a.organization_id = ? AND a.is_active = TRUE
              LIMIT 1
            `, [program.organization_id]);
            return {
              organization_name: collab.organization_name,
              organization_acronym: collab.organization_acronym,
              organization_color: collab.organization_color,
              admin_id: adminRows[0]?.id || null,
              admin_email: adminRows[0]?.email || null,
              role: collab.role
              // Primary doesn't need collaboration_status
            };
          } else {
            // For collaborators, get the admin who accepted the collaboration
            const [adminRows] = await db.execute(`
              SELECT a.id, a.email
              FROM program_collaborations pc
              LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
              LEFT JOIN organizations o ON a.organization_id = o.id
              WHERE pc.program_id = ? AND o.orgName = ? AND pc.status = 'accepted'
              LIMIT 1
            `, [program.id, collab.organization_name]);
            return {
              organization_name: collab.organization_name,
              organization_acronym: collab.organization_acronym,
              organization_color: collab.organization_color,
              admin_id: adminRows[0]?.id || null,
              admin_email: adminRows[0]?.email || null,
              role: collab.role,
              collaboration_status: 'accepted' // All collaborators in superadmin are accepted
            };
          }
        }));
        
        collaborators = collaboratorsWithAdmins;
        
        // Debug: Log collaborators for testinggg
        if (program.title === 'testinggg') {
          console.log('🔍 Backend Debug - testinggg collaborators:', {
            count: collaborators.length,
            collaborators: collaborators.map(c => ({ 
              role: c.role, 
              org: c.organization_name,
              has_status: !!c.collaboration_status
            }))
          });
        }
      }

      // Construct proper logo URL
      let logoUrl;
      if (program.orgLogo) {
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }

      // Ensure is_collaborative is explicitly set (handle MySQL returning 0/1 as Buffer or number)
      // MySQL TINYINT(1) returns 0 or 1 as numbers
      // Convert to boolean explicitly
      let isCollaborativeValue = false;
      if (program.is_collaborative === 1 || 
          program.is_collaborative === true || 
          program.is_collaborative === '1' ||
          String(program.is_collaborative) === '1' ||
          (program.is_collaborative && program.is_collaborative !== 0)) {
        isCollaborativeValue = true;
      }
      
      // Debug: Log final return value for testinggg
      if (program.title === 'testinggg') {
        console.log('🔍 Backend Debug - testinggg RETURN:', {
          id: program.id,
          is_collaborative_original: program.is_collaborative,
          is_collaborative_final: isCollaborativeValue,
          collaborators_count: collaborators.length,
          collaborators: collaborators.map(c => ({ role: c.role, org: c.organization_name }))
        });
      }
      
      return {
        ...program,
        orgLogo: logoUrl,
        multiple_dates: multipleDates,
        additional_images: additionalImages,
        collaborators: collaborators,
        // Override is_collaborative to ensure it's set correctly (use the same value we checked)
        is_collaborative: isCollaborativeValue
      };
    }));
    
    // Remove ETag to prevent 304 responses (already set cache headers at start)
    res.removeHeader('ETag');
    
    res.json({
      success: true,
      data: programsWithDates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs by organization',
      error: error.message
    });
  }
};

// Get programs statistics for superadmin dashboard
export const getProgramsStatistics = async (req, res) => {
  try {
    const statisticsQuery = `
      SELECT 
        COUNT(*) as total_programs,
        SUM(CASE WHEN LOWER(status) = 'upcoming' THEN 1 ELSE 0 END) as upcoming_programs,
        SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_programs,
        COUNT(DISTINCT organization_id) as total_organizations
      FROM programs_projects
    `;
    
    const [results] = await db.execute(statisticsQuery);
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs statistics',
      error: error.message
    });
  }
};

// Get program by ID with organization details
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.event_start_date,
        pp.event_end_date,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        pp.is_collaborative,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.id = ?
    `;
    
    const [results] = await db.execute(query, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    const program = results[0];
    
    // Get multiple dates for this program
    let multipleDates = [];
    
    // If program has event_start_date and event_end_date, check if they're the same (single day)
    if (program.event_start_date && program.event_end_date) {
      if (program.event_start_date === program.event_end_date) {
        // Single day program
        multipleDates = [program.event_start_date];
      }
    } else {
      // Check for multiple dates in program_event_dates table
      const [dateRows] = await db.execute(
        'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
        [program.id]
      );
      multipleDates = dateRows.map(row => row.event_date);
    }

    // Get additional images for this program
    const [imageRows] = await db.execute(
      'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
      [program.id]
    );
    const additionalImages = imageRows.map(row => row.image_data);

    // Get collaboration data if program is collaborative
    let collaborators = [];
    if (program.is_collaborative) {
      // Get all organizations involved in the collaboration
      const [collaborationRows] = await db.execute(`
        SELECT DISTINCT
          o.orgName as organization_name,
          o.org as organization_acronym,
          o.org_color as organization_color,
          o.logo as organization_logo,
          CASE 
            WHEN o.id = ? THEN 'primary'
            ELSE 'collaborator'
          END as role
        FROM (
          -- Primary organization (the one that created the program)
          SELECT ? as org_id, 'primary' as role
          
          UNION ALL
          
          -- Collaborator organizations (those who accepted collaboration)
          SELECT o.id as org_id, 'collaborator' as role
          FROM program_collaborations pc
          LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
          LEFT JOIN organizations o ON a.organization_id = o.id
          WHERE pc.program_id = ? AND pc.status = 'accepted'
        ) org_roles
        LEFT JOIN organizations o ON org_roles.org_id = o.id
        WHERE o.id IS NOT NULL
        ORDER BY 
          CASE WHEN org_roles.role = 'primary' THEN 0 ELSE 1 END,
          o.orgName ASC
      `, [program.organization_id, program.organization_id, program.id]);
      
      // Get admin details for each collaborator organization
      const collaboratorsWithAdmins = await Promise.all(collaborationRows.map(async (collab) => {
        if (collab.role === 'primary') {
          // For primary, get the admin who created the program
          const [adminRows] = await db.execute(`
            SELECT a.id, a.email
            FROM admins a
            WHERE a.organization_id = ? AND a.is_active = TRUE
            LIMIT 1
          `, [program.organization_id]);
          return {
            organization_name: collab.organization_name,
            organization_acronym: collab.organization_acronym,
            organization_color: collab.organization_color,
            organization_logo: collab.organization_logo,
            admin_id: adminRows[0]?.id || null,
            admin_email: adminRows[0]?.email || null,
            role: collab.role
            // Primary doesn't need collaboration_status
          };
        } else {
          // For collaborators, get the admin who accepted the collaboration
          const [adminRows] = await db.execute(`
            SELECT a.id, a.email
            FROM program_collaborations pc
            LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE pc.program_id = ? AND o.orgName = ? AND pc.status = 'accepted'
            LIMIT 1
          `, [program.id, collab.organization_name]);
          return {
            organization_name: collab.organization_name,
            organization_acronym: collab.organization_acronym,
            organization_color: collab.organization_color,
            organization_logo: collab.organization_logo,
            admin_id: adminRows[0]?.id || null,
            admin_email: adminRows[0]?.email || null,
            role: collab.role,
            collaboration_status: 'accepted' // All collaborators in superadmin are accepted
          };
        }
      }));
      
      collaborators = collaboratorsWithAdmins;
    }

    // Construct proper logo URL
    let logoUrl;
    if (program.orgLogo) {
      if (program.orgLogo.includes('/')) {
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      }
    } else {
      // Fallback to default logo
      logoUrl = `/logo/faith_community_logo.png`;
    }

    const programWithDates = {
      ...program,
      orgLogo: logoUrl,
      multiple_dates: multipleDates,
      additional_images: additionalImages,
      collaborators: collaborators
    };
    
    res.json({
      success: true,
      data: programWithDates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program',
      error: error.message
    });
  }
};

// Get programs by organization ID
export const getProgramsByOrganizationId = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.event_start_date,
        pp.event_end_date,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.organization_id = ?
      ORDER BY pp.created_at DESC
    `;
    
    const [results] = await db.execute(query, [orgId]);
    
    // Get multiple dates for each program
    const programsWithDates = await Promise.all(results.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Construct proper logo URL
      let logoUrl;
      if (program.orgLogo) {
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }

      return {
        ...program,
        orgLogo: logoUrl,
        multiple_dates: multipleDates
      };
    }));
    
    res.json({
      success: true,
      data: programsWithDates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs by organization',
      error: error.message
    });
  }
};
