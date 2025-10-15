#!/usr/bin/env node

import DatabaseMerger from './databaseMerger.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🔄 Database Merger Tool');
  console.log('========================\n');

  try {
    // Get source database name
    const sourceDb = await askQuestion('Enter source database name (database to merge FROM): ');
    if (!sourceDb.trim()) {
      console.log('❌ Source database name is required');
      process.exit(1);
    }

    // Get target database name
    const targetDb = await askQuestion('Enter target database name (database to merge TO): ');
    if (!targetDb.trim()) {
      console.log('❌ Target database name is required');
      process.exit(1);
    }

    // Get conflict resolution strategy
    console.log('\nConflict Resolution Strategies:');
    console.log('1. keep_latest - Keep the record with the most recent timestamp');
    console.log('2. keep_source - Always keep the source database record');
    console.log('3. keep_target - Always keep the target database record');
    console.log('4. merge_fields - Merge non-null fields from source into target');
    
    const conflictChoice = await askQuestion('\nChoose conflict resolution strategy (1-4): ');
    const conflictStrategies = {
      '1': 'keep_latest',
      '2': 'keep_source',
      '3': 'keep_target',
      '4': 'merge_fields'
    };
    
    const conflictResolution = conflictStrategies[conflictChoice] || 'keep_latest';

    // Confirm backup
    const createBackup = await askQuestion('\nCreate backup of target database? (y/n): ');
    const backupTarget = createBackup.toLowerCase() === 'y' || createBackup.toLowerCase() === 'yes';

    // Get specific tables to merge (optional)
    const specificTables = await askQuestion('\nEnter specific tables to merge (comma-separated, or press Enter for all): ');
    const tablesToMerge = specificTables.trim() ? specificTables.split(',').map(t => t.trim()) : null;

    // Final confirmation
    console.log('\n📋 Merge Configuration:');
    console.log(`Source Database: ${sourceDb}`);
    console.log(`Target Database: ${targetDb}`);
    console.log(`Conflict Resolution: ${conflictResolution}`);
    console.log(`Create Backup: ${backupTarget ? 'Yes' : 'No'}`);
    console.log(`Tables to Merge: ${tablesToMerge ? tablesToMerge.join(', ') : 'All matching tables'}`);
    
    const confirm = await askQuestion('\nProceed with merge? (y/n): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Merge cancelled');
      process.exit(0);
    }

    // Initialize merger and start merge
    const merger = new DatabaseMerger();
    
    console.log('\n🚀 Starting database merge...');
    await merger.mergeDatabases(sourceDb, targetDb, {
      conflictResolution,
      backupTarget,
      tablesToMerge
    });

    console.log('\n✅ Database merge completed successfully!');
    console.log('📊 Check the backup directory for detailed merge reports.');

  } catch (error) {
    console.error('\n❌ Merge failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the main function
main().catch(console.error);
