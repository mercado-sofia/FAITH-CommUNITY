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
        pp.submitted_by_name,
        pp.submitted_by_role,
        pp.edited_by_name,
        pp.edited_by_role,
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
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    const statisticsQuery = `
      SELECT 
        COUNT(*) as total_programs,
        SUM(CASE WHEN LOWER(status) = 'upcoming' THEN 1 ELSE 0 END) as upcoming_programs,
        SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_programs,
        COUNT(DISTINCT organization_id) as total_organizations,
        -- Completed programs in current year
        SUM(CASE 
          WHEN LOWER(status) = 'completed' 
          AND (
            (date_completed IS NOT NULL AND YEAR(date_completed) = ?)
            OR (date_completed IS NULL AND YEAR(updated_at) = ? AND LOWER(status) = 'completed')
          )
          THEN 1 
          ELSE 0 
        END) as completed_this_year,
        -- Completed programs in previous year
        SUM(CASE 
          WHEN LOWER(status) = 'completed' 
          AND (
            (date_completed IS NOT NULL AND YEAR(date_completed) = ?)
            OR (date_completed IS NULL AND YEAR(updated_at) = ? AND LOWER(status) = 'completed')
          )
          THEN 1 
          ELSE 0 
        END) as completed_previous_year
      FROM programs_projects
    `;
    
    const [results] = await db.execute(statisticsQuery, [currentYear, currentYear, previousYear, previousYear]);
    
    const data = results[0];
    const completedThisYear = parseInt(data.completed_this_year) || 0;
    const completedPreviousYear = parseInt(data.completed_previous_year) || 0;
    
    // Calculate percentage change
    let percentageChange = 0;
    if (completedPreviousYear > 0) {
      percentageChange = ((completedThisYear - completedPreviousYear) / completedPreviousYear) * 100;
    } else if (completedThisYear > 0) {
      // If previous year had 0, but current year has programs, it's 100% increase
      percentageChange = 100;
    }
    
    res.json({
      success: true,
      data: {
        ...data,
        completed_this_year: completedThisYear,
        completed_previous_year: completedPreviousYear,
        percentage_change: Math.round(percentageChange * 10) / 10 // Round to 1 decimal place
      }
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
        pp.submitted_by_name,
        pp.submitted_by_role,
        pp.edited_by_name,
        pp.edited_by_role,
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

// Get program completion trends (time-series data for charts)
export const getProgramCompletionTrends = async (req, res) => {
  try {
    // Get completion trends for the last 12 months
    const query = `
      SELECT 
        DATE_FORMAT(
          COALESCE(date_completed, updated_at), 
          '%Y-%m'
        ) as month,
        COUNT(*) as count
      FROM programs_projects
      WHERE LOWER(status) = 'completed'
        AND (
          (date_completed IS NOT NULL AND date_completed >= DATE_SUB(NOW(), INTERVAL 12 MONTH))
          OR (date_completed IS NULL AND updated_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) AND LOWER(status) = 'completed')
        )
      GROUP BY DATE_FORMAT(
        COALESCE(date_completed, updated_at), 
        '%Y-%m'
      )
      ORDER BY month ASC
    `;
    
    const [results] = await db.execute(query);
    
    // Format the data for frontend consumption
    // Filter out any rows with invalid month values
    const trends = results
      .filter(row => row.month && typeof row.month === 'string' && row.month.length > 0)
      .map(row => ({
        month: String(row.month).trim(),
        count: parseInt(row.count) || 0
      }));
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program completion trends',
      error: error.message
    });
  }
};

// Get top organizations by program count
export const getTopOrganizationsByProgramCount = async (req, res) => {
  const startTime = Date.now();
  let debugInfo = {
    step: 'initialized',
    queryParams: req.query,
    limit: null,
    queryExecuted: false,
    resultsCount: 0,
    error: null
  };

  try {
    const limit = parseInt(req.query.limit) || 10; // Default to top 10
    debugInfo.limit = limit;
    debugInfo.step = 'parameters_parsed';

    // First, gather diagnostic information
    let diagnosticData = {};
    try {
      const [programCheck] = await db.execute('SELECT COUNT(*) as total FROM programs_projects');
      const [orgCheck] = await db.execute("SELECT COUNT(*) as total FROM organizations WHERE status = 'ACTIVE'");
      const [allOrgs] = await db.execute("SELECT COUNT(*) as total FROM organizations");
      const [orgWithProgramsCheck] = await db.execute(`
        SELECT COUNT(DISTINCT o.id) as total 
        FROM organizations o 
        INNER JOIN programs_projects pp ON o.id = pp.organization_id 
        WHERE o.status = 'ACTIVE'
      `);
      const [samplePrograms] = await db.execute(`
        SELECT pp.id, pp.organization_id, pp.title, o.status as org_status, o.org, o.orgName
        FROM programs_projects pp
        LEFT JOIN organizations o ON pp.organization_id = o.id
        LIMIT 5
      `);
      
      diagnosticData = {
        totalPrograms: programCheck[0]?.total || 0,
        totalOrganizations: allOrgs[0]?.total || 0,
        activeOrganizations: orgCheck[0]?.total || 0,
        activeOrgsWithPrograms: orgWithProgramsCheck[0]?.total || 0,
        samplePrograms: samplePrograms
      };
      
      console.log('[getTopOrganizationsByProgramCount] Diagnostic data:', JSON.stringify(diagnosticData, null, 2));
      debugInfo.diagnosticData = diagnosticData;
    } catch (diagError) {
      console.error('[getTopOrganizationsByProgramCount] Error gathering diagnostics:', diagError);
      debugInfo.diagnosticError = diagError.message;
    }

    debugInfo.step = 'diagnostics_complete';
    
    // Query to get organizations with their program counts
    // Start from programs_projects (like other working queries) and join to organizations
    // This ensures we only count organizations that actually have programs
    // Count all programs (both approved and unapproved) for dashboard statistics
    const query = `
      SELECT 
        o.id,
        o.org as acronym,
        o.orgName as name,
        COUNT(DISTINCT pp.id) as program_count
      FROM programs_projects pp
      INNER JOIN organizations o ON pp.organization_id = o.id
      WHERE o.status = 'ACTIVE'
      GROUP BY o.id, o.org, o.orgName
      HAVING program_count > 0
      ORDER BY program_count DESC
      LIMIT ?
    `;
    
    debugInfo.step = 'query_prepared';
    debugInfo.query = query;
    
    const [results] = await db.execute(query, [limit]);
    debugInfo.queryExecuted = true;
    debugInfo.resultsCount = results.length;
    debugInfo.step = 'query_executed';
    
    // Log results for debugging
    console.log(`[getTopOrganizationsByProgramCount] Query executed. Found ${results.length} organizations with programs`);
    if (results.length > 0) {
      console.log('[getTopOrganizationsByProgramCount] Sample result:', JSON.stringify(results[0], null, 2));
      console.log('[getTopOrganizationsByProgramCount] All results:', JSON.stringify(results, null, 2));
    } else {
      console.warn('[getTopOrganizationsByProgramCount] No results found. Diagnostic data:', diagnosticData);
    }
    
    // Format the data for frontend consumption
    const organizations = results.map(row => {
      const formatted = {
        id: row.id,
        acronym: row.acronym || 'N/A',
        name: row.name || 'Unknown Organization',
        programCount: parseInt(row.program_count) || 0
      };
      // Validate data
      if (!formatted.id || formatted.programCount <= 0) {
        console.warn('[getTopOrganizationsByProgramCount] Invalid row data:', row);
      }
      return formatted;
    });
    
    debugInfo.step = 'data_formatted';
    debugInfo.formattedCount = organizations.length;
    console.log('[getTopOrganizationsByProgramCount] Formatted organizations:', JSON.stringify(organizations, null, 2));
    
    const responseTime = Date.now() - startTime;
    debugInfo.responseTime = responseTime;
    debugInfo.step = 'success';
    
    // Always return success with data array (even if empty)
    // Include debug info in development or when no data
    const response = {
      success: true,
      data: organizations,
      ...(process.env.NODE_ENV !== 'production' || organizations.length === 0 ? { debug: debugInfo } : {})
    };
    
    res.json(response);
  } catch (error) {
    debugInfo.step = 'error';
    debugInfo.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    };
    
    // Extract the most specific error message
    const specificError = error.sqlMessage || error.message || 'Unknown error occurred';
    
    console.error('[getTopOrganizationsByProgramCount] Error:', error);
    console.error('[getTopOrganizationsByProgramCount] Error message:', specificError);
    console.error('[getTopOrganizationsByProgramCount] Error stack:', error.stack);
    console.error('[getTopOrganizationsByProgramCount] Debug info:', JSON.stringify(debugInfo, null, 2));
    
    const responseTime = Date.now() - startTime;
    res.status(500).json({
      success: false,
      message: `Failed to fetch top organizations by program count: ${specificError}`,
      error: specificError,
      errorDetails: {
        type: error.name || 'Error',
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        originalMessage: error.message
      },
      debug: debugInfo,
      responseTime
    });
  }
};
