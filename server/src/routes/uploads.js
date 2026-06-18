// src/routes/uploads.js
// Image upload endpoint — receives a file via multipart/form-data,
// uploads it to Cloudinary, and returns the secure CDN URL.
// The URL is then saved in MongoDB by the caller (providers, users, etc.)
const router  = require('express').Router();
const multer  = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
const { protect }      = require('../middleware/auth');
const { ok, fail }     = require('../utils/helpers');

// Store files in memory (buffer) — no disk writes on the server
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },   // 5 MB max per file
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG and WebP images are allowed.'));
  },
});

// POST /api/uploads/image
// Body: multipart/form-data with field "image"
// Optional query: ?folder=nearby/providers  (overrides default folder)
// Optional query: ?type=avatar|provider|banner  (controls crop/size)
router.post('/image', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'No image file provided.');

    const folder = req.query.folder || 'Nearby';
    const type   = req.query.type   || 'provider';

    // Different transform profiles per image type
    const transforms = {
      avatar:   [{ width: 400,  height: 400,  crop: 'fill', gravity: 'face', quality: 'auto:good', fetch_format: 'auto' }],
      provider: [{ width: 1200, height: 900,  crop: 'limit',                 quality: 'auto:good', fetch_format: 'auto' }],
      banner:   [{ width: 1600, height: 500,  crop: 'fill',                  quality: 'auto:good', fetch_format: 'auto' }],
    };

    const { url, publicId } = await uploadBuffer(req.file.buffer, {
      folder,
      transformation: transforms[type] || transforms.provider,
    });

    ok(res, { url, publicId }, 'Image uploaded successfully.');
  } catch (err) {
    // Multer errors (file too large, wrong type)
    if (err.message) return fail(res, err.message, 400);
    next(err);
  }
});

// POST /api/uploads/images  — upload up to 5 images at once
router.post('/images', protect, upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return fail(res, 'No images provided.');

    const folder = req.query.folder || 'Nearby/providers';
    const results = await Promise.all(
      req.files.map(f =>
        uploadBuffer(f.buffer, {
          folder,
          transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
        })
      )
    );

    ok(res, { images: results }, `${results.length} image(s) uploaded.`);
  } catch (err) {
    if (err.message) return fail(res, err.message, 400);
    next(err);
  }
});

module.exports = router;
