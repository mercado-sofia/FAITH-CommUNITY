/**
 * Static sample asset paths for API fallback data (`frontend/src/data/*`).
 * Legacy UI placeholders use root files: /samples/sample1.jpg … sample8.jpg (not these).
 */

export const SAMPLE_HERO_VIDEO = '/samples/video/sample_video.mp4';

export const SAMPLE_PROGRAM_IMAGES = [
  '/samples/programs/2.jpg',
  '/samples/programs/3.jpeg',
  '/samples/programs/4.jpg',
  '/samples/programs/5.jpg',
  '/samples/programs/6.jpg',
  '/samples/programs/7.png',
  '/samples/programs/8.jpg',
  '/samples/programs/9.jpg',
  '/samples/programs/10.jpg',
  '/samples/programs/11.jpg',
  '/samples/programs/12.jpg',
  '/samples/programs/13.jpg',
  '/samples/programs/14.jpg',
  '/samples/programs/15.jpg',
  '/samples/programs/16.jpg',
  '/samples/programs/17.jpg',
  '/samples/programs/18.jpg',
  '/samples/programs/19.jpg',
  '/samples/programs/20.jpg',
  '/samples/programs/21.jpg',
  '/samples/programs/22.jpg',
  '/samples/programs/23.jpg',
  '/samples/programs/24.jpg',
  '/samples/programs/25.jpg',
  '/samples/programs/26.jpg',
  '/samples/programs/27.jpg',
];

export const SAMPLE_HEAD_PHOTOS = [
  '/samples/id/id1.jpg',
  '/samples/id/id2.jpg',
  '/samples/id/id3.jpg',
  '/samples/id/id4.jpg',
  '/samples/id/id5.jpg',
  '/samples/id/id6.jpg',
];

/** Hero carousel stills for fallback API hero-section data only */
export const HERO_CAROUSEL_IMAGES = [
  '/samples/programs/2.jpg',
  '/samples/programs/8.jpg',
  '/samples/programs/3.jpeg',
];

/** About-us image for fallback API data only */
export const DEFAULT_ABOUT_IMAGE = '/samples/programs/2.jpg';

const LOGO_EXTENSIONS = {
  FAIPS: 'png',
};

export function logoForAcronym(acronym) {
  const key = (acronym || '').toUpperCase();
  const ext = LOGO_EXTENSIONS[key] || 'jpg';
  return `/samples/logo/${key.toLowerCase()}_logo.${ext}`;
}

export function programImageAt(index) {
  return SAMPLE_PROGRAM_IMAGES[index % SAMPLE_PROGRAM_IMAGES.length];
}
