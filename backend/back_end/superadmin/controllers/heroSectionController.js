import db from '../../database.js';
import { 
  deleteFromCloudinary, 
  extractPublicIdFromUrl,
  CLOUDINARY_FOLDERS 
} from '../../utils/cloudinaryConfig.js';
import { uploadSingleToCloudinary } from '../../utils/cloudinaryUpload.js';

// Get hero section data
export const getHeroSection = async (req, res) => {
  try {
    // Get main hero section data
    const [heroRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    // Get hero section images
    const [imageRows] = await db.query('SELECT * FROM hero_section_images ORDER BY display_order ASC');
    
    if (heroRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hero section data not found' 
      });
    }

    const heroData = heroRows[0];
    
    // Format images data to match frontend expectations
    const images = imageRows.map(row => ({
      id: row.image_id,
      url: row.image_url,
      heading: row.heading,
      subheading: row.subheading
    }));

    res.json({
      success: true,
      data: {
        tag: heroData.tag,
        heading: heroData.heading,
        video_url: heroData.video_url,
        video_link: heroData.video_link,
        video_type: heroData.video_type,
        images: images
      }
    });
  } catch (error) {
    console.error('Error fetching hero section:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch hero section data' 
    });
  }
};

// Update hero section text content
export const updateHeroSectionText = async (req, res) => {
  try {
    const { field, value } = req.body;

    if (!field || !value) {
      return res.status(400).json({ 
        success: false, 
        message: 'Field and value are required' 
      });
    }

    if (!['tag', 'heading'].includes(field)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid field. Must be "tag" or "heading"' 
      });
    }

    // Check if hero section record exists
    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      // Create new hero section record
      await db.query(
        'INSERT INTO hero_section (tag, heading) VALUES (?, ?)',
        [field === 'tag' ? value : 'Welcome to FAITH CommUNITY', 
         field === 'heading' ? value : 'A Unified Platform for Community Extension Programs']
      );
    } else {
      // Update existing hero section record
      const updateQuery = field === 'tag' 
        ? 'UPDATE hero_section SET tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE hero_section SET heading = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      await db.query(updateQuery, [value, existingRows[0].id]);
    }

    // Fetch updated hero section data
    const [updatedRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');

    res.json({
      success: true,
      message: `${field} updated successfully`,
      data: {
        [field]: value
      }
    });
  } catch (error) {
    console.error('Error updating hero section text:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update hero section text' 
    });
  }
};

// Update hero section image text content
export const updateHeroSectionImageText = async (req, res) => {
  try {
    const { imageId, field, value } = req.body;

    if (!imageId || !field || !value) {
      return res.status(400).json({ 
        success: false, 
        message: 'ImageId, field, and value are required' 
      });
    }

    if (!['heading', 'subheading'].includes(field)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid field. Must be "heading" or "subheading"' 
      });
    }

    // Check if image record exists
    const [existingRows] = await db.query('SELECT * FROM hero_section_images WHERE image_id = ?', [imageId]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    // Update image text
    const updateQuery = field === 'heading' 
      ? 'UPDATE hero_section_images SET heading = ?, updated_at = CURRENT_TIMESTAMP WHERE image_id = ?'
      : 'UPDATE hero_section_images SET subheading = ?, updated_at = CURRENT_TIMESTAMP WHERE image_id = ?';
    
    await db.query(updateQuery, [value, imageId]);

    res.json({
      success: true,
      message: 'Image text updated successfully',
      data: {
        imageId: imageId,
        [field]: value
      }
    });
  } catch (error) {
    console.error('Error updating hero section image text:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update image text' 
    });
  }
};

// Upload hero section video
export const uploadHeroSectionVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file provided' 
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING, // Using branding folder for now, can create a separate hero folder later
      { prefix: 'hero_video_' }
    );

    const videoUrl = uploadResult.url;

    // Update hero section with new video URL
    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO hero_section (tag, heading, video_url, video_type) VALUES (?, ?, ?, ?)',
        ['Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs', videoUrl, 'upload']
      );
    } else {
      // Delete old video from Cloudinary if it exists
      if (existingRows[0].video_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].video_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
            console.warn('Failed to delete old video from Cloudinary:', deleteError.message);
          }
        }
      }
      
      await db.query(
        'UPDATE hero_section SET video_url = ?, video_link = NULL, video_type = "upload", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [videoUrl, existingRows[0].id]
      );
    }

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: { 
        video_url: videoUrl,
        public_id: uploadResult.public_id,
        cloudinary_info: {
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      }
    });
  } catch (error) {
    console.error('Error uploading hero section video:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload video',
      error: error.message 
    });
  }
};

// Upload hero section image
export const uploadHeroSectionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    const { imageId } = req.body;

    if (!imageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image ID is required' 
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING, // Using branding folder for now, can create a separate hero folder later
      { prefix: `hero_image_${imageId}_` }
    );

    const imageUrl = uploadResult.url;

    // Check if image record exists
    const [existingRows] = await db.query('SELECT * FROM hero_section_images WHERE image_id = ?', [imageId]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image record not found' 
      });
    }

    // Delete old image from Cloudinary if it exists
    if (existingRows[0].image_url) {
      const oldPublicId = extractPublicIdFromUrl(existingRows[0].image_url);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (deleteError) {
          console.warn('Failed to delete old image from Cloudinary:', deleteError.message);
        }
      }
    }
    
    // Update image URL
    await db.query(
      'UPDATE hero_section_images SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE image_id = ?',
      [imageUrl, imageId]
    );

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: { 
        url: imageUrl,
        public_id: uploadResult.public_id,
        cloudinary_info: {
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      }
    });
  } catch (error) {
    console.error('Error uploading hero section image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
};

// Delete hero section video
export const deleteHeroSectionVideo = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0 || !existingRows[0].video_url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Delete from Cloudinary
    const publicId = extractPublicIdFromUrl(existingRows[0].video_url);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (deleteError) {
        console.warn('Failed to delete video from Cloudinary:', deleteError.message);
      }
    }

    // Update database
    await db.query(
      'UPDATE hero_section SET video_url = NULL, video_link = NULL, video_type = "upload", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existingRows[0].id]
    );

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hero section video:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete video' 
    });
  }
};

// Update hero section video link
export const updateHeroSectionVideoLink = async (req, res) => {
  try {
    const { video_link, video_type } = req.body;

    if (!video_link || !video_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video link and video type are required' 
      });
    }

    if (!['upload', 'link'].includes(video_type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid video type. Must be "upload" or "link"' 
      });
    }

    // Validate and convert video link format for common platforms
    let processedVideoLink = video_link;
    if (video_type === 'link') {
      const videoLinkRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv|facebook\.com|instagram\.com|tiktok\.com)/i;
      if (!videoLinkRegex.test(video_link)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide a valid video link from supported platforms (YouTube, Vimeo, etc.)' 
        });
      }

      // Convert YouTube watch URLs to embed URLs
      if (video_link.includes('youtube.com/watch')) {
        const videoId = video_link.match(/[?&]v=([^&]+)/);
        if (videoId) {
          processedVideoLink = `https://www.youtube.com/embed/${videoId[1]}`;
        }
      } else if (video_link.includes('youtu.be/')) {
        const videoId = video_link.match(/youtu\.be\/([^?&]+)/);
        if (videoId) {
          processedVideoLink = `https://www.youtube.com/embed/${videoId[1]}`;
        }
      }
      // Convert Vimeo URLs to embed format
      else if (video_link.includes('vimeo.com/')) {
        const videoId = video_link.match(/vimeo\.com\/(\d+)/);
        if (videoId) {
          processedVideoLink = `https://player.vimeo.com/video/${videoId[1]}`;
        }
      }
    }

    // Check if hero section record exists
    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      // Create new hero section record
      await db.query(
        'INSERT INTO hero_section (tag, heading, video_link, video_type) VALUES (?, ?, ?, ?)',
        ['Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs', processedVideoLink, video_type]
      );
    } else {
      // Update existing hero section record
      await db.query(
        'UPDATE hero_section SET video_link = ?, video_type = ?, video_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [processedVideoLink, video_type, existingRows[0].id]
      );
    }

    res.json({
      success: true,
      message: 'Video link updated successfully',
      data: {
        video_link: processedVideoLink,
        video_type: video_type
      }
    });
  } catch (error) {
    console.error('Error updating hero section video link:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update video link' 
    });
  }
};

// Delete hero section image
export const deleteHeroSectionImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!imageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image ID is required' 
      });
    }

    const [existingRows] = await db.query('SELECT * FROM hero_section_images WHERE image_id = ?', [imageId]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    // Delete from Cloudinary if image exists
    if (existingRows[0].image_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].image_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
          console.warn('Failed to delete image from Cloudinary:', deleteError.message);
        }
      }
    }

    // Update database - set image_url to NULL but keep the record
    await db.query(
      'UPDATE hero_section_images SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE image_id = ?',
      [imageId]
    );

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hero section image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete image' 
    });
  }
};
