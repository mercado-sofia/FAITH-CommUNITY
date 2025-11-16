import db from '../../database.js';
import { 
  deleteFromCloudinary, 
  extractPublicIdFromUrl,
  CLOUDINARY_FOLDERS 
} from '../../utils/cloudinaryConfig.js';
import { uploadSingleToCloudinary } from '../../utils/cloudinaryUpload.js';

export const getHeroSection = async (req, res) => {
  try {
    const [heroRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    const [imageRows] = await db.query('SELECT * FROM hero_section_images ORDER BY display_order ASC');
    
    if (heroRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hero section data not found' 
      });
    }

    const heroData = heroRows[0];
    
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch hero section data' 
    });
  }
};

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

    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO hero_section (tag, heading) VALUES (?, ?)',
        [field === 'tag' ? value : 'Welcome to FAITH CommUNITY', 
         field === 'heading' ? value : 'A Unified Platform for Community Extension Programs']
      );
    } else {
      const updateQuery = field === 'tag' 
        ? 'UPDATE hero_section SET tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE hero_section SET heading = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      await db.query(updateQuery, [value, existingRows[0].id]);
    }

    const [updatedRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');

    res.json({
      success: true,
      message: `${field} updated successfully`,
      data: {
        [field]: value
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update hero section text' 
    });
  }
};

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

    const [existingRows] = await db.query('SELECT * FROM hero_section_images WHERE image_id = ?', [imageId]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update image text' 
    });
  }
};

export const uploadHeroSectionVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file provided' 
      });
    }

    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING, // Using branding folder for now, can create a separate hero folder later
      { prefix: 'hero_video_' }
    );

    const videoUrl = uploadResult.url;

    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO hero_section (tag, heading, video_url, video_type) VALUES (?, ?, ?, ?)',
        ['Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs', videoUrl, 'upload']
      );
    } else {
      if (existingRows[0].video_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].video_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload video',
      error: error.message 
    });
  }
};

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

    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING, // Using branding folder for now, can create a separate hero folder later
      { prefix: `hero_image_${imageId}_` }
    );

    const imageUrl = uploadResult.url;

    const [existingRows] = await db.query('SELECT * FROM hero_section_images WHERE image_id = ?', [imageId]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image record not found' 
      });
    }

    if (existingRows[0].image_url) {
      const oldPublicId = extractPublicIdFromUrl(existingRows[0].image_url);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (deleteError) {
        }
      }
    }
    
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
};

export const deleteHeroSectionVideo = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0 || !existingRows[0].video_url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    const publicId = extractPublicIdFromUrl(existingRows[0].video_url);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (deleteError) {
      }
    }

    await db.query(
      'UPDATE hero_section SET video_url = NULL, video_link = NULL, video_type = "upload", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existingRows[0].id]
    );

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete video' 
    });
  }
};

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

    let processedVideoLink = video_link;
    if (video_type === 'link') {
      const videoLinkRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv|facebook\.com|instagram\.com|tiktok\.com)/i;
      if (!videoLinkRegex.test(video_link)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide a valid video link from supported platforms (YouTube, Vimeo, etc.)' 
        });
      }

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
      else if (video_link.includes('vimeo.com/')) {
        const videoId = video_link.match(/vimeo\.com\/(\d+)/);
        if (videoId) {
          processedVideoLink = `https://player.vimeo.com/video/${videoId[1]}`;
        }
      }
    }

    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO hero_section (tag, heading, video_link, video_type) VALUES (?, ?, ?, ?)',
        ['Welcome to FAITH CommUNITY', 'A Unified Platform for Community Extension Programs', processedVideoLink, video_type]
      );
    } else {
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update video link' 
    });
  }
};

export const updateHeroSection = async (req, res) => {
  try {
    const { tag, heading, video_url, video_link, video_type, images } = req.body;

    if (!tag || !heading) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tag and heading are required' 
      });
    }

    const [existingRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    let heroId;
    if (existingRows.length === 0) {
      const [insertResult] = await db.query(
        'INSERT INTO hero_section (tag, heading, video_url, video_link, video_type) VALUES (?, ?, ?, ?, ?)',
        [tag, heading, video_url || null, video_link || null, video_type || 'upload']
      );
      heroId = insertResult.insertId;
    } else {
      heroId = existingRows[0].id;
      await db.query(
        'UPDATE hero_section SET tag = ?, heading = ?, video_url = ?, video_link = ?, video_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [tag, heading, video_url || null, video_link || null, video_type || 'upload', heroId]
      );
    }

    if (images && Array.isArray(images)) {
      for (const image of images) {
        if (image.id && (image.heading !== undefined || image.subheading !== undefined)) {
          const [imageRows] = await db.query('SELECT * FROM hero_section_images WHERE image_id = ?', [image.id]);
          
          if (imageRows.length === 0) {
            await db.query(
              'INSERT INTO hero_section_images (image_id, heading, subheading, display_order) VALUES (?, ?, ?, ?)',
              [image.id, image.heading || '', image.subheading || '', image.id]
            );
          } else {
            const updateFields = [];
            const updateValues = [];
            
            if (image.heading !== undefined) {
              updateFields.push('heading = ?');
              updateValues.push(image.heading);
            }
            if (image.subheading !== undefined) {
              updateFields.push('subheading = ?');
              updateValues.push(image.subheading);
            }
            
            if (updateFields.length > 0) {
              updateFields.push('updated_at = CURRENT_TIMESTAMP');
              updateValues.push(image.id);
              
              await db.query(
                `UPDATE hero_section_images SET ${updateFields.join(', ')} WHERE image_id = ?`,
                updateValues
              );
            }
          }
        }
      }
    }

    const [updatedHeroRows] = await db.query('SELECT * FROM hero_section WHERE id = ?', [heroId]);
    const [updatedImageRows] = await db.query('SELECT * FROM hero_section_images ORDER BY display_order ASC');
    
    const heroData = updatedHeroRows[0];
    const formattedImages = updatedImageRows.map(row => ({
      id: row.image_id,
      url: row.image_url,
      heading: row.heading,
      subheading: row.subheading
    }));

    res.json({
      success: true,
      message: 'Hero section updated successfully',
      data: {
        tag: heroData.tag,
        heading: heroData.heading,
        video_url: heroData.video_url,
        video_link: heroData.video_link,
        video_type: heroData.video_type,
        images: formattedImages
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update hero section' 
    });
  }
};

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

    if (existingRows[0].image_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].image_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
        }
      }
    }

    await db.query(
      'UPDATE hero_section_images SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE image_id = ?',
      [imageId]
    );

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete image' 
    });
  }
};
