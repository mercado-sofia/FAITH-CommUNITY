import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUploadsDir = path.join(__dirname, "uploads");

const directories = [
  "programs/main-images",
  "programs/additional-images", 
  "programs/thumbnails",
  "organizations/logos",
  "organizations/heads",
  "volunteers/valid-ids",
  "news/images",
  "temp/processing"
];

console.log('📁 Creating upload directory structure...');

directories.forEach(dir => {
  const fullPath = path.join(baseUploadsDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  } else {
    console.log(`⏭️  Exists: ${dir}`);
  }
});

console.log('📁 Upload directory structure ready!');
