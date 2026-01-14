import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// For now, using a simple file system
// In production, you might want to use AWS S3, Google Cloud Storage, etc.

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Ensure upload directory exists
 */
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  return { valid: true };
}

/**
 * Save uploaded file and return public URL
 */
export async function saveUploadedFile(file: Express.Multer.File): Promise<string> {
  await ensureUploadDir();
  
  const fileExt = path.extname(file.originalname);
  // Generate unique filename using timestamp and random bytes
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const fileName = `${timestamp}_${uniqueId}${fileExt}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  await fs.writeFile(filePath, file.buffer);

  // Return relative URL path (client will construct full URL)
  return `/uploads/${fileName}`;
}

/**
 * Validate drive link format
 */
export function isValidDriveLink(url: string): boolean {
  if (!url) return false;
  
  // Basic validation for Google Drive links
  const drivePattern = /^https:\/\/(drive\.google\.com|docs\.google\.com)/i;
  return drivePattern.test(url.trim());
}

/**
 * Delete uploaded file
 */
export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    // File might not exist, ignore error
    console.error('Error deleting file:', error);
  }
}
