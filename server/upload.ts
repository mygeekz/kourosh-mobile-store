// server/upload.ts
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_, file, cb) => {
  const ok = /^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.mimetype);
  cb(ok ? null : new Error('Unsupported file type'), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export default upload; // ← دیفالت اکسپورت تا ایمپورت ساده شود
