// ============================================
// CLOUDINARY CONFIGURATION & UPLOAD SERVICE
// ============================================
// Real Cloudinary integration for REVIVAL OF V
// Dashboard: https://cloudinary.com/console

// Get credentials from environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Validate credentials
if (!CLOUDINARY_CLOUD_NAME) {
  console.error('❌ Missing VITE_CLOUDINARY_CLOUD_NAME in .env file');
}

if (!CLOUDINARY_UPLOAD_PRESET) {
  console.error('❌ Missing VITE_CLOUDINARY_UPLOAD_PRESET in .env file');
}

// ============================================
// TYPES
// ============================================

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
}

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'limit' | 'scale';
  gravity?: 'auto' | 'face' | 'center';
}

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload image to Cloudinary
 * @param file - File object to upload
 * @param folder - Folder name in Cloudinary (default: 'products')
 * @returns Upload response with URL and metadata
 */
export const uploadToCloudinary = async (
  file: File,
  folder: string = 'products'
): Promise<CloudinaryUploadResponse> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing');
  }

  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  // Auto transformations for optimization
  formData.append('transformation', JSON.stringify([
    { quality: 'auto' },
    { fetch_format: 'auto' },
    { width: 1200, crop: 'limit' }
  ]));

  try {
    console.log(`📤 Uploading to Cloudinary folder: ${folder}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();

    console.log('✅ Image uploaded successfully:', data.secure_url);

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
      duration: data.duration,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of File objects
 * @param folder - Folder name in Cloudinary
 * @returns Array of upload responses
 */
export const uploadMultipleToCloudinary = async (
  files: File[],
  folder: string = 'products'
): Promise<CloudinaryUploadResponse[]> => {
  const results: CloudinaryUploadResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    console.log(`📤 Uploading image ${i + 1} of ${files.length}`);
    const result = await uploadToCloudinary(files[i], folder);
    results.push(result);
  }

  return results;
};

// ============================================
// URL GENERATION FUNCTIONS
// ============================================

/**
 * Generate optimized Cloudinary URL with transformations
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export const getCloudinaryUrl = (
  publicId: string,
  options: CloudinaryTransformOptions = {}
): string => {
  if (!CLOUDINARY_CLOUD_NAME) return '';
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    gravity = 'auto',
  } = options;

  let transformations = `q_${quality},f_${format}`;

  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  if (crop) transformations += `,c_${crop}`;
  if (gravity) transformations += `,g_${gravity}`;

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
};

/**
 * Get thumbnail URL (small size)
 */
export const getThumbnailUrl = (publicId: string): string => {
  return getCloudinaryUrl(publicId, {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'auto',
  });
};

/**
 * Get product card URL (medium size)
 */
export const getProductCardUrl = (publicId: string): string => {
  return getCloudinaryUrl(publicId, {
    width: 600,
    height: 800,
    crop: 'limit',
  });
};

/**
 * Get product detail URL (large size)
 */
export const getProductDetailUrl = (publicId: string): string => {
  return getCloudinaryUrl(publicId, {
    width: 1200,
    height: 1600,
    crop: 'limit',
  });
};

/**
 * Get hero banner URL (extra large)
 */
export const getHeroBannerUrl = (publicId: string): string => {
  return getCloudinaryUrl(publicId, {
    width: 1920,
    height: 1080,
    crop: 'limit',
  });
};

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete image from Cloudinary
 * Note: Requires backend with API secret for security
 * This is a placeholder - implement in backend
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  console.warn('⚠️ Delete function requires backend implementation with API secret');
  console.log('Delete request for:', publicId);

  // In production, this should call your backend API
  // which will use the API secret to delete the image

  return false;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicId = (url: string): string | null => {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Check if URL is a Cloudinary URL
 */
export const isCloudinaryUrl = (url: string): boolean => {
  return url.includes(`res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`);
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// ============================================
// EXPORTS
// ============================================

export default {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  getCloudinaryUrl,
  getThumbnailUrl,
  getProductCardUrl,
  getProductDetailUrl,
  getHeroBannerUrl,
  deleteFromCloudinary,
  extractPublicId,
  isCloudinaryUrl,
  formatFileSize,
};
