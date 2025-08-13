import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const baseUploadsDir = path.join(__dirname, "../uploads");
const oldUploadsDir = path.join(__dirname, "../back_end/uploads");

// Migration mapping
const migrationRules = [
  // Volunteer ID files
  {
    pattern: /^valid-id-/,
    destination: path.join(baseUploadsDir, "volunteers", "valid-ids"),
    description: "Volunteer valid ID files"
  },
  // Organization logo files
  {
    pattern: /_logo-/,
    destination: path.join(baseUploadsDir, "organizations", "logos"),
    description: "Organization logo files"
  },
  // Organization head files
  {
    pattern: /_head-/,
    destination: path.join(baseUploadsDir, "organizations", "heads"),
    description: "Organization head files"
  },
  // ID files (id1, id2, etc.)
  {
    pattern: /^id\d+/,
    destination: path.join(baseUploadsDir, "volunteers", "valid-ids"),
    description: "ID files"
  }
];

// Create destination directories
const createDirectories = () => {
  const directories = [
    path.join(baseUploadsDir, "programs", "main-images"),
    path.join(baseUploadsDir, "programs", "additional-images"),
    path.join(baseUploadsDir, "programs", "thumbnails"),
    path.join(baseUploadsDir, "organizations", "logos"),
    path.join(baseUploadsDir, "organizations", "heads"),
    path.join(baseUploadsDir, "volunteers", "valid-ids"),
    path.join(baseUploadsDir, "news", "images"),
    path.join(baseUploadsDir, "temp", "processing")
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

// Move file to destination
const moveFile = (sourcePath, destinationPath) => {
  try {
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destinationPath);
      console.log(`✅ Moved: ${path.basename(sourcePath)}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error moving ${sourcePath}:`, error.message);
  }
  return false;
};

// Get all files from a directory recursively
const getAllFiles = (dirPath) => {
  const files = [];
  
  if (fs.existsSync(dirPath)) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    });
  }
  
  return files;
};

// Main migration function
const migrateUploads = () => {
  console.log('🚀 Starting upload migration...\n');
  
  // Create new directory structure
  createDirectories();
  
  // Get all files from old uploads directory
  const allFiles = getAllFiles(baseUploadsDir);
  const oldFiles = getAllFiles(oldUploadsDir);
  
  const filesToProcess = [...allFiles, ...oldFiles];
  
  console.log(`📁 Found ${filesToProcess.length} files to process\n`);
  
  let movedCount = 0;
  let skippedCount = 0;
  
  filesToProcess.forEach(filePath => {
    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);
    
    // Skip if already in correct structure
    if (fileDir.includes('programs') || 
        fileDir.includes('organizations') || 
        fileDir.includes('volunteers') || 
        fileDir.includes('news')) {
      skippedCount++;
      return;
    }
    
    // Find matching migration rule
    const rule = migrationRules.find(r => r.pattern.test(fileName));
    
    if (rule) {
      const destinationPath = path.join(rule.destination, fileName);
      
      // Check if destination file already exists
      if (fs.existsSync(destinationPath)) {
        console.log(`⚠️  Skipped (exists): ${fileName}`);
        skippedCount++;
      } else {
        if (moveFile(filePath, destinationPath)) {
          movedCount++;
        }
      }
    } else {
      // Move to temp for manual review
      const tempPath = path.join(baseUploadsDir, "temp", "processing", fileName);
      if (moveFile(filePath, tempPath)) {
        console.log(`📦 Moved to temp for review: ${fileName}`);
        movedCount++;
      }
    }
  });
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Files moved: ${movedCount}`);
  console.log(`⏭️  Files skipped: ${skippedCount}`);
  console.log(`📦 Files in temp for review: ${getAllFiles(path.join(baseUploadsDir, "temp", "processing")).length}`);
  
  console.log('\n🎯 Next steps:');
  console.log('1. Review files in uploads/temp/processing/');
  console.log('2. Manually move or delete files as needed');
  console.log('3. Update any hardcoded file paths in your code');
  console.log('4. Test file uploads with the new structure');
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUploads();
}

export default migrateUploads;
