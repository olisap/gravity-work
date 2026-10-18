import { supabase } from '../config/supabase.js';

export async function uploadMedia(req, res) {
  try {
    const { file, fileName, folder = 'general' } = req.body;
    const storeId = req.storeId || 'default_store';

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'No file data provided. Expected base64 data URL.' });
    }

    // Match base64 data URL: data:image/png;base64,.... or data:video/mp4;base64,....
    const matches = file.match(/^data:([a-zA-Z0-9_\-\.\/]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid data format. File must be a valid base64 data URL.' });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 50 MB safety limit
    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'File size exceeds maximum 50MB limit.' });
    }

    const isVideo = mimeType.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(fileName || '');
    const isImage = mimeType.startsWith('image/');

    if (!isVideo && !isImage) {
      return res.status(400).json({ error: `Unsupported file type: ${mimeType}. Please upload an image or video.` });
    }

    // Determine clean file extension
    let ext = mimeType.split('/')[1] || (isVideo ? 'mp4' : 'jpg');
    ext = ext.replace('jpeg', 'jpg').replace('quicktime', 'mov').replace('svg+xml', 'svg').replace('x-matroska', 'mkv');

    const cleanBaseName = (fileName || (isVideo ? 'video' : 'media'))
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .replace(/\.[^/.]+$/, '');
    
    const uniqueFileName = `${cleanBaseName}_${Date.now()}.${ext}`;
    const storagePath = `stores/${storeId}/${folder}/${uniqueFileName}`;

    const targetBucket = folder === 'logos' ? 'logos' : 'product-media';

    if (supabase) {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(targetBucket)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadErr) {
        console.error(`❌ [UploadController] Supabase upload error in bucket "${targetBucket}":`, uploadErr.message);
        return res.status(502).json({ error: 'Storage upload failed', details: uploadErr.message });
      }

      const { data: pubUrlData } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(storagePath);

      if (pubUrlData && pubUrlData.publicUrl) {
        console.log(`✅ [UploadController] Uploaded ${isVideo ? 'video' : 'image'} (${buffer.length} bytes) to ${pubUrlData.publicUrl}`);
        return res.json({
          success: true,
          url: pubUrlData.publicUrl,
          type: isVideo ? 'video' : 'image',
          mimeType,
          fileName: uniqueFileName,
          size: buffer.length
        });
      }
    }

    // Mock fallback if supabase is not available in local dev
    return res.json({
      success: true,
      url: file,
      type: isVideo ? 'video' : 'image',
      fileName: uniqueFileName,
      size: buffer.length,
      isMock: true
    });
  } catch (err) {
    console.error('❌ [UploadController] Unexpected error in uploadMedia:', err);
    res.status(500).json({ error: 'Internal server upload error', details: err.message });
  }
}
