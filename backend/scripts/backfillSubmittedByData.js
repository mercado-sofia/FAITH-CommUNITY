// Script to backfill submitted_by_name and submitted_by_role from submissions to programs
import db from '../src/database.js';

const backfillSubmittedByData = async () => {
  try {
    console.log('Backfilling submitted_by_name and submitted_by_role from submissions...\n');
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get all approved program submissions
      const [submissions] = await connection.execute(`
        SELECT 
          id,
          section,
          proposed_data,
          submitted_at,
          status
        FROM submissions
        WHERE section = 'programs' 
          AND status = 'approved'
        ORDER BY submitted_at DESC
      `);
      
      console.log(`Found ${submissions.length} approved program submissions\n`);
      
      let updated = 0;
      let skipped = 0;
      
      for (const submission of submissions) {
        try {
          const proposedData = JSON.parse(submission.proposed_data);
          const submittedByName = proposedData.submitted_by_name && proposedData.submitted_by_name.trim() 
            ? proposedData.submitted_by_name.trim() 
            : null;
          const submittedByRole = proposedData.submitted_by_role && proposedData.submitted_by_role.trim() 
            ? proposedData.submitted_by_role.trim() 
            : null;
          
          // Skip if no data
          if (!submittedByName && !submittedByRole) {
            skipped++;
            continue;
          }
          
          // Find the program by title (matching the submission)
          const [programs] = await connection.execute(`
            SELECT id, title, submitted_by_name, submitted_by_role
            FROM programs_projects
            WHERE title = ?
            ORDER BY created_at DESC
            LIMIT 1
          `, [proposedData.title]);
          
          if (programs.length > 0) {
            const program = programs[0];
            
            // Only update if the program doesn't already have this data
            if (!program.submitted_by_name && !program.submitted_by_role) {
              await connection.execute(`
                UPDATE programs_projects
                SET submitted_by_name = ?,
                    submitted_by_role = ?
                WHERE id = ?
              `, [submittedByName, submittedByRole, program.id]);
              
              console.log(`✓ Updated Program ID ${program.id} ("${program.title}")`);
              console.log(`  - Submitted by: ${submittedByName || 'N/A'}`);
              console.log(`  - Role: ${submittedByRole || 'N/A'}\n`);
              updated++;
            } else {
              console.log(`- Skipped Program ID ${program.id} ("${program.title}") - already has data\n`);
              skipped++;
            }
          } else {
            console.log(`- Could not find program with title: "${proposedData.title}"\n`);
            skipped++;
          }
        } catch (error) {
          console.log(`- Error processing submission ${submission.id}: ${error.message}\n`);
          skipped++;
        }
      }
      
      await connection.commit();
      
      console.log('\n' + '='.repeat(100));
      console.log(`\nSummary:`);
      console.log(`  Programs updated: ${updated}`);
      console.log(`  Programs skipped: ${skipped}`);
      console.log(`  Total submissions processed: ${submissions.length}`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
    await db.end();
    console.log('\n✓ Backfill completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error backfilling data:', error);
    process.exit(1);
  }
};

backfillSubmittedByData();

