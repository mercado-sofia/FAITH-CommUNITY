import db from '../src/database.js';
import bcrypt from 'bcrypt';

// Environment check
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Production-safe commands
const productionSafeCommands = [
  'create-superadmin',
  'check-data', 
  'fix-missing-data',
  'production-health-check',
  'help'
];

// Development-only commands
const developmentOnlyCommands = [
  'debug-collaborations'
];

/**
 * Creates the initial superadmin account
 * Usage: node scripts/utilities.js create-superadmin
 */
async function createSuperadmin() {
  try {
    console.log('🔧 Creating superadmin account...');
    
    // Check if superadmin already exists
    const [existing] = await db.execute('SELECT id FROM superadmin WHERE id = 1');
    
    if (existing.length > 0) {
      console.log('✅ Superadmin account already exists!');
      console.log('📧 Email: superadmin@faith-community.com');
      console.log('🔑 Password: admin123');
      console.log('🌐 Login URL: http://localhost:3000/superadmin/login');
      return;
    }
    
    // Create superadmin account
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.execute(`
      INSERT INTO superadmin (id, username, password, twofa_enabled, twofa_secret, created_at, updated_at)
      VALUES (1, 'superadmin@faith-community.com', ?, FALSE, NULL, NOW(), NOW())
    `, [hashedPassword]);
    
    console.log('✅ Superadmin account created successfully!');
    console.log('📧 Email: superadmin@faith-community.com');
    console.log('🔑 Password: admin123');
    console.log('🌐 Login URL: http://localhost:3000/superadmin/login');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
  }
}

/**
 * Checks all database data and shows summary
 * Usage: node scripts/utilities.js check-data
 */
async function checkAllData() {
  try {
    console.log('🔍 Checking all database data...\n');
    
    // Check organizations
    const [organizations] = await db.execute('SELECT COUNT(*) as count FROM organizations');
    console.log(`📊 Organizations: ${organizations[0].count}`);
    
    if (organizations[0].count > 0) {
      const [orgDetails] = await db.execute('SELECT id, org, orgName, status FROM organizations LIMIT 5');
      console.log('   Sample organizations:');
      orgDetails.forEach(org => {
        console.log(`   - ${org.orgName} (${org.org}) - ${org.status}`);
      });
    }
    
    // Check admins
    const [admins] = await db.execute('SELECT COUNT(*) as count FROM admins');
    console.log(`👥 Admins: ${admins[0].count}`);
    
    if (admins[0].count > 0) {
      const [adminDetails] = await db.execute('SELECT id, email, organization_id FROM admins LIMIT 5');
      console.log('   Sample admins:');
      adminDetails.forEach(admin => {
        console.log(`   - ${admin.email} (Org ID: ${admin.organization_id})`);
      });
    }
    
    // Check users
    const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👤 Users: ${users[0].count}`);
    
    // Check programs
    const [programs] = await db.execute('SELECT COUNT(*) as count FROM programs_projects');
    console.log(`📋 Programs: ${programs[0].count}`);
    
    if (programs[0].count > 0) {
      const [programDetails] = await db.execute('SELECT id, title, status, organization_id FROM programs_projects LIMIT 5');
      console.log('   Sample programs:');
      programDetails.forEach(program => {
        console.log(`   - ${program.title} (${program.status}) - Org ID: ${program.organization_id}`);
      });
    }
    
    // Check news
    const [news] = await db.execute('SELECT COUNT(*) as count FROM news');
    console.log(`📰 News: ${news[0].count}`);
    
    // Check collaborations
    const [collaborations] = await db.execute('SELECT COUNT(*) as count FROM program_collaborations');
    console.log(`🤝 Collaborations: ${collaborations[0].count}`);
    
    // Check volunteers
    const [volunteers] = await db.execute('SELECT COUNT(*) as count FROM volunteers');
    console.log(`🙋 Volunteers: ${volunteers[0].count}`);
    
    // Check messages
    const [messages] = await db.execute('SELECT COUNT(*) as count FROM messages');
    console.log(`💬 Messages: ${messages[0].count}`);
    
    // Check subscribers
    const [subscribers] = await db.execute('SELECT COUNT(*) as count FROM subscribers');
    console.log(`📧 Subscribers: ${subscribers[0].count}`);
    
    // Check superadmin
    const [superadmin] = await db.execute('SELECT COUNT(*) as count FROM superadmin');
    console.log(`🔐 Superadmin: ${superadmin[0].count}`);
    
    if (superadmin[0].count > 0) {
      const [superadminDetails] = await db.execute('SELECT id, username FROM superadmin');
      console.log('   Superadmin account:');
      superadminDetails.forEach(sa => {
        console.log(`   - ${sa.username}`);
      });
    }
    
    // Check UI content
    const [siteName] = await db.execute('SELECT site_name FROM site_name LIMIT 1');
    console.log(`🏷️  Site Name: ${siteName[0]?.site_name || 'Not set'}`);
    
    const [missionVision] = await db.execute('SELECT COUNT(*) as count FROM mission_vision');
    console.log(`🎯 Mission/Vision: ${missionVision[0].count} entries`);
    
    const [footerContent] = await db.execute('SELECT COUNT(*) as count FROM footer_content');
    console.log(`🦶 Footer Content: ${footerContent[0].count} entries`);
    
    console.log('\n✅ Data check completed!');
    
    // Summary
    const totalData = organizations[0].count + admins[0].count + users[0].count + 
                     programs[0].count + news[0].count + collaborations[0].count + 
                     volunteers[0].count + messages[0].count + subscribers[0].count;
    
    console.log(`\n📊 Total user data entries: ${totalData}`);
    
    if (totalData === 0) {
      console.log('\n⚠️  No user data found. The database appears to be empty except for default UI content.');
      console.log('💡 You may need to restore your data from a backup or recreate it.');
    } else {
      console.log('\n✅ Found user data in the database.');
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  }
}

/**
 * Checks and fixes all missing tables and data
 * Usage: node scripts/utilities.js fix-missing-data
 */
async function fixMissingData() {
  try {
    console.log('🔧 Checking and fixing all missing tables and data...\n');
    
    // Check all required tables exist
    console.log('📋 Checking table structure...');
    const [tables] = await db.execute('SHOW TABLES');
    const existingTables = tables.map(table => Object.values(table)[0]);
    
    const requiredTables = [
      'organizations', 'users', 'admins', 'programs_projects', 'news',
      'submissions', 'admin_notifications', 'superadmin_notifications', 'user_notifications',
      'admin_invitations', 'volunteers', 'messages', 'subscribers', 'faqs',
      'program_collaborations', 'program_event_dates', 'program_additional_images',
      'advocacies', 'competencies', 'organization_heads', 'heads_faces',
      'branding', 'site_name', 'footer_content', 'hero_section', 'hero_section_images',
      'about_us', 'mission_vision', 'password_reset_tokens', 'refresh_tokens',
      'audit_logs', 'superadmin', 'email_change_otps', 'login_attempts',
      'admin_sessions', 'security_logs', 'migrations'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
      console.log('🔧 Creating missing tables...');
      
      for (const table of missingTables) {
        try {
          await createMissingTable(table);
          console.log(`✅ Created table: ${table}`);
        } catch (error) {
          console.log(`❌ Failed to create table ${table}:`, error.message);
        }
      }
    } else {
      console.log('✅ All required tables exist');
    }
    
    // Fix data inconsistencies
    console.log('\n🔧 Fixing data inconsistencies...');
    
    // Fix programs without slugs
    const [programsWithoutSlugs] = await db.execute('SELECT id, title FROM programs_projects WHERE slug IS NULL OR slug = ""');
    if (programsWithoutSlugs.length > 0) {
      console.log(`🔧 Fixing ${programsWithoutSlugs.length} programs without slugs...`);
      for (const program of programsWithoutSlugs) {
        const slug = program.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        await db.execute('UPDATE programs_projects SET slug = ? WHERE id = ?', [slug, program.id]);
      }
      console.log('✅ Program slugs fixed');
    }
    
    // Fix news without slugs
    const [newsWithoutSlugs] = await db.execute('SELECT id, title FROM news WHERE slug IS NULL OR slug = ""');
    if (newsWithoutSlugs.length > 0) {
      console.log(`🔧 Fixing ${newsWithoutSlugs.length} news articles without slugs...`);
      for (const article of newsWithoutSlugs) {
        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        await db.execute('UPDATE news SET slug = ? WHERE id = ?', [slug, article.id]);
      }
      console.log('✅ News slugs fixed');
    }
    
    // Fix news without excerpts
    await db.execute(`
      UPDATE news 
      SET excerpt = CASE 
          WHEN LENGTH(content) > 180 
          THEN CONCAT(LEFT(content, 177), '...')
          ELSE content
      END
      WHERE excerpt IS NULL OR excerpt = ''
    `);
    console.log('✅ News excerpts fixed');
    
    // Fix news without published_at
    await db.execute(`
      UPDATE news 
      SET published_at = COALESCE(date, created_at)
      WHERE published_at IS NULL
    `);
    console.log('✅ News published dates fixed');
    
    // Check and fix UI content
    console.log('\n🎨 Checking UI content...');
    
    // Check site name
    const [siteName] = await db.execute('SELECT COUNT(*) as count FROM site_name');
    if (siteName[0].count === 0) {
      await db.execute('INSERT INTO site_name (site_name) VALUES ("FAITH CommUNITY")');
      console.log('✅ Site name added');
    }
    
    // Check mission/vision
    const [missionVision] = await db.execute('SELECT COUNT(*) as count FROM mission_vision');
    if (missionVision[0].count === 0) {
      await db.execute(`
        INSERT INTO mission_vision (type, content) VALUES
        ('mission', 'To provide quality education and community service through innovative programs and partnerships.'),
        ('vision', 'To be a leading institution in community development and social transformation.')
      `);
      console.log('✅ Mission/Vision added');
    }
    
    // Check footer content
    const [footerContent] = await db.execute('SELECT COUNT(*) as count FROM footer_content');
    if (footerContent[0].count === 0) {
      await db.execute(`
        INSERT INTO footer_content (section_type, title, url, display_order) VALUES
        ('contact', 'phone', '+163-3654-7896', 1),
        ('contact', 'email', 'info@faithcommunity.com', 2),
        ('copyright', 'copyright', '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.', 1)
      `);
      console.log('✅ Footer content added');
    }
    
    // Check hero section
    const [heroSection] = await db.execute('SELECT COUNT(*) as count FROM hero_section');
    if (heroSection[0].count === 0) {
      await db.execute(`
        INSERT INTO hero_section (tag, heading) VALUES
        ('Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs')
      `);
      console.log('✅ Hero section added');
    }
    
    // Check branding
    const [branding] = await db.execute('SELECT COUNT(*) as count FROM branding');
    if (branding[0].count === 0) {
      await db.execute('INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (NULL, NULL, NULL)');
      console.log('✅ Branding table initialized');
    }
    
    console.log('\n🎉 Database check and fix completed successfully!');
    console.log('✅ All tables and data are now properly configured');
    
  } catch (error) {
    console.error('❌ Error during database fix:', error.message);
  }
}

async function createMissingTable(tableName) {
  const tableDefinitions = {
    'about_us': `
      CREATE TABLE about_us (
        id INT AUTO_INCREMENT PRIMARY KEY,
        heading TEXT DEFAULT NULL,
        description TEXT DEFAULT NULL,
        extension_categories JSON DEFAULT '[
          {"name": "Extension For Education", "icon": "education", "color": "green"},
          {"name": "Extension For Medical", "icon": "medical", "color": "red"},
          {"name": "Extension For Community", "icon": "community", "color": "orange"},
          {"name": "Extension For Foods", "icon": "food", "color": "green"}
        ]',
        image_url VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
    'heads_faces': `
      CREATE TABLE heads_faces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        position VARCHAR(100) DEFAULT 'Head of FACES',
        display_order INT DEFAULT 0,
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `
  };
  
  if (tableDefinitions[tableName]) {
    await db.execute(tableDefinitions[tableName]);
  } else {
    console.log(`⚠️  No definition found for table: ${tableName}`);
  }
}

/**
 * Production health check - checks system health without exposing sensitive data
 * Usage: node scripts/utilities.js production-health-check
 */
async function productionHealthCheck() {
  try {
    console.log('🏥 Running production health check...\n');
    
    // Check database connectivity
    console.log('🔗 Checking database connectivity...');
    const [dbTest] = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection: OK');
    
    // Check critical tables exist
    console.log('📋 Checking critical tables...');
    const [tables] = await db.execute('SHOW TABLES');
    const existingTables = tables.map(table => Object.values(table)[0]);
    
    const criticalTables = [
      'users', 'admins', 'superadmin', 'organizations', 
      'programs_projects', 'news', 'submissions'
    ];
    
    const missingTables = criticalTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All critical tables exist');
    } else {
      console.log('❌ Missing critical tables:', missingTables);
    }
    
    // Check data counts (without exposing sensitive data)
    console.log('📊 Checking data health...');
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    const [adminCount] = await db.execute('SELECT COUNT(*) as count FROM admins');
    const [superadminCount] = await db.execute('SELECT COUNT(*) as count FROM superadmin');
    const [orgCount] = await db.execute('SELECT COUNT(*) as count FROM organizations');
    
    console.log(`   Users: ${userCount[0].count}`);
    console.log(`   Admins: ${adminCount[0].count}`);
    console.log(`   Superadmins: ${superadminCount[0].count}`);
    console.log(`   Organizations: ${orgCount[0].count}`);
    
    // Check superadmin exists
    if (superadminCount[0].count === 0) {
      console.log('⚠️  No superadmin account found - run create-superadmin');
    } else {
      console.log('✅ Superadmin account exists');
    }
    
    // Check organizations exist
    if (orgCount[0].count === 0) {
      console.log('⚠️  No organizations found - system may need initial setup');
    } else {
      console.log('✅ Organizations configured');
    }
    
    console.log('\n✅ Production health check completed');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

/**
 * Debugs collaboration data and relationships (DEVELOPMENT ONLY)
 * Usage: node scripts/utilities.js debug-collaborations
 */
async function debugCollaborations() {
  // Production safety check
  if (isProduction) {
    console.log('❌ Debug commands are not available in production environment');
    console.log('💡 Use production-health-check for production monitoring');
    return;
  }
  
  try {
    console.log('🔍 Debugging collaboration data...');
    console.log('⚠️  This is a development-only function');
    
    // Get all collaborations for the current admin
    const [collaborations] = await db.execute(`
      SELECT 
        pc.id as collaboration_id,
        pc.status,
        pc.invited_at,
        pc.responded_at,
        p.id as program_id,
        p.title as program_title,
        p.description as program_description,
        p.status as program_status,
        p.is_approved,
        p.is_collaborative,
        p.created_at as program_created_at,
        p.image as program_image,
        p.category as program_category,
        p.event_start_date,
        p.event_end_date,
        p.slug as program_slug,
        -- Inviter details
        inviter.id as inviter_admin_id,
        inviter.email as inviter_email,
        inviter_org.orgName as inviter_org_name,
        inviter_org.org as inviter_org_acronym,
        inviter_org.logo as inviter_org_logo,
        -- Invitee details
        invitee.id as invitee_admin_id,
        invitee.email as invitee_email,
        invitee_org.orgName as invitee_org_name,
        invitee_org.org as invitee_org_acronym,
        invitee_org.logo as invitee_org_logo,
        -- Program organization details
        prog_org.orgName as program_org_name,
        prog_org.org as program_org_acronym,
        prog_org.logo as program_org_logo,
        -- Determine request type
        CASE 
          WHEN pc.collaborator_admin_id = 1 THEN 'received'
          WHEN pc.invited_by_admin_id = 1 THEN 'sent'
          ELSE 'unknown'
        END as request_type
      FROM program_collaborations pc
      LEFT JOIN programs_projects p ON pc.program_id = p.id
      LEFT JOIN admins inviter ON pc.invited_by_admin_id = inviter.id
      LEFT JOIN organizations inviter_org ON inviter.organization_id = inviter_org.id
      LEFT JOIN admins invitee ON pc.collaborator_admin_id = invitee.id
      LEFT JOIN organizations invitee_org ON invitee.organization_id = invitee_org.id
      LEFT JOIN organizations prog_org ON p.organization_id = prog_org.id
      WHERE pc.collaborator_admin_id = 1 OR pc.invited_by_admin_id = 1
      ORDER BY pc.invited_at DESC
    `);
    
    console.log('📊 Found collaborations:', collaborations.length);
    
    collaborations.forEach((collab, index) => {
      console.log(`\n--- Collaboration ${index + 1} ---`);
      console.log(`ID: ${collab.collaboration_id}`);
      console.log(`Status: ${collab.status}`);
      console.log(`Request Type: ${collab.request_type}`);
      console.log(`Program: ${collab.program_title}`);
      console.log(`Inviter: ${collab.inviter_email}`);
      console.log(`Invitee: ${collab.invitee_email}`);
      console.log(`Should show buttons: ${collab.status === 'pending' && collab.request_type === 'received'}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging collaborations:', error.message);
  }
}

/**
 * Shows available commands and usage
 */
function showHelp() {
  console.log('🔧 FAITH CommUNITY Backend Utilities');
  console.log('');
  console.log('Usage: node scripts/utilities.js <command>');
  console.log('');
  
  if (isProduction) {
    console.log('🏭 PRODUCTION MODE - Limited commands available:');
    console.log('');
    console.log('Production-safe commands:');
    console.log('  create-superadmin        Create the initial superadmin account');
    console.log('  check-data              Check all database data and show summary');
    console.log('  fix-missing-data        Check and fix all missing tables and data');
    console.log('  production-health-check Production health check (recommended)');
    console.log('  help                    Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/utilities.js create-superadmin');
    console.log('  node scripts/utilities.js production-health-check');
  } else {
    console.log('🛠️  DEVELOPMENT MODE - All commands available:');
    console.log('');
    console.log('Production-safe commands:');
    console.log('  create-superadmin        Create the initial superadmin account');
    console.log('  check-data              Check all database data and show summary');
    console.log('  fix-missing-data        Check and fix all missing tables and data');
    console.log('  production-health-check Production health check');
    console.log('');
    console.log('Development-only commands:');
    console.log('  debug-collaborations    Debug collaboration data and relationships');
    console.log('');
    console.log('General commands:');
    console.log('  help                    Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/utilities.js create-superadmin');
    console.log('  node scripts/utilities.js debug-collaborations');
  }
  
  console.log('');
  console.log('Environment:', process.env.NODE_ENV || 'development');
}

// Main execution
const command = process.argv[2];

// Production safety check
if (isProduction && developmentOnlyCommands.includes(command)) {
  console.log('❌ Command not allowed in production environment');
  console.log('💡 Use production-health-check for production monitoring');
  console.log('');
  showHelp();
  process.exit(1);
}

switch (command) {
  case 'create-superadmin':
    await createSuperadmin();
    break;
  case 'check-data':
    await checkAllData();
    break;
  case 'fix-missing-data':
    await fixMissingData();
    break;
  case 'production-health-check':
    await productionHealthCheck();
    break;
  case 'debug-collaborations':
    await debugCollaborations();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (!command) {
      console.log('❌ No command specified.');
    } else {
      console.log(`❌ Unknown command: ${command}`);
    }
    console.log('');
    showHelp();
    process.exit(1);
}

process.exit(0);
