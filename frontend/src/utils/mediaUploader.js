import { apiUrl } from './apiUrl';

/**
 * Upload a media file (Image or Video) directly to the CRM storage backend.
 * Converts the file to Base64, posts to /api/upload, and returns the public URL.
 * 
 * @param {File} file - File object from <input type="file" />
 * @param {string} folder - 'confirmation' | 'products' | 'banners' | 'logos'
 * @param {Function} [onProgress] - Optional progress callback ('reading' | 'uploading' | 'done' | 'error')
 * @returns {Promise<{ url: string, type: 'image' | 'video', fileName: string }>}
 */
export async function uploadMediaFile(file, folder = 'general', onProgress = null) {
  if (!file) throw new Error('No file provided');

  // Validate size (max 45MB to keep within 50MB JSON limit)
  if (file.size > 45 * 1024 * 1024) {
    throw new Error('File is too large. Maximum supported file size is 45MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file from your device.'));

    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const token = localStorage.getItem('gravity_crm_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        if (onProgress) onProgress('uploading');

        const res = await fetch(apiUrl('/api/upload'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            file: base64Data,
            fileName: file.name,
            folder
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || `Upload failed with status ${res.status}`);
        }

        const data = await res.json();
        if (onProgress) onProgress('done');
        resolve(data);
      } catch (err) {
        if (onProgress) onProgress('error');
        reject(err);
      }
    };

    if (onProgress) onProgress('reading');
    reader.readAsDataURL(file);
  });
}
