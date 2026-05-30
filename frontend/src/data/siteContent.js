import {
  DEFAULT_ABOUT_IMAGE,
  HERO_CAROUSEL_IMAGES,
  SAMPLE_HEAD_PHOTOS,
  SAMPLE_HERO_VIDEO,
} from './assets';
import { FALLBACK_FAVICON_URL, FALLBACK_TEXT_LOGO_URL } from '@/utils/shared/brandingDefaults';

export function getHeroSectionApiResponse() {
  return {
    success: true,
    data: {
      tag: 'Welcome to FAITH CommUNITY',
      heading: 'A Unified Platform for Community Extension Programs',
      video_url: SAMPLE_HERO_VIDEO,
      video_link: null,
      video_type: 'upload',
      images: [
        {
          id: 1,
          url: HERO_CAROUSEL_IMAGES[0],
          heading: 'Inside the Initiative',
          subheading: 'Where Ideas Take Root',
        },
        {
          id: 2,
          url: HERO_CAROUSEL_IMAGES[1],
          heading: 'Collaboration',
          subheading: 'Working Together',
        },
        {
          id: 3,
          url: HERO_CAROUSEL_IMAGES[2],
          heading: 'Innovation',
          subheading: 'Building the Future',
        },
      ],
    },
  };
}

export function getMissionVisionResponse() {
  return [
    {
      id: 1,
      type: 'Mission',
      content:
        'To serve communities through education and engagement, fostering growth and development for a better tomorrow.',
    },
    {
      id: 2,
      type: 'Vision',
      content:
        'To be the leading platform for community extension programs, creating lasting positive impact in society.',
    },
  ];
}

export function getFooterApiResponse() {
  return {
    success: true,
    data: {
      contact: {
        phone: { content: '+63 46 123 4567', url: 'tel:+63461234567', icon: 'phone' },
        email: { content: 'info@faithcommunity.com', url: 'mailto:info@faithcommunity.com', icon: 'email' },
      },
      quickLinks: [
        { name: 'About Us', url: '/about' },
        { name: 'Programs & Services', url: '/programs' },
        { name: 'Faithree', url: '/faithree' },
        { name: 'Apply Now', url: '/apply' },
        { name: 'FAQs', url: '/faqs' },
      ],
      services: [
        { id: 1, name: 'Give Donation', content: 'Support community programs through giving.' },
        { id: 2, name: 'Education Support', content: 'Learning resources for partner communities.' },
        { id: 3, name: 'Food Support', content: 'Food distribution and nutrition initiatives.' },
        { id: 4, name: 'Health Support', content: 'Wellness fairs and health education.' },
        { id: 5, name: 'Our Campaign', content: 'Seasonal outreach campaigns across organizations.' },
      ],
      socialMedia: [
        { id: 1, platform: 'Facebook', url: 'https://facebook.com', icon: 'Facebook', displayOrder: 1 },
        { id: 2, platform: 'Instagram', url: 'https://instagram.com', icon: 'Instagram', displayOrder: 2 },
      ],
      copyright: {
        content: `© Copyright ${new Date().getFullYear()} FAITH CommUNITY. All Rights Reserved.`,
      },
    },
  };
}

export function getBrandingPublicApiResponse() {
  return {
    success: true,
    data: {
      logo_url: null,
      name_url: FALLBACK_TEXT_LOGO_URL,
      favicon_url: FALLBACK_FAVICON_URL,
    },
  };
}

export function getSiteNamePublicApiResponse() {
  return {
    success: true,
    data: {
      site_name: 'FAITH CommUNITY',
    },
  };
}

/** Extension category checklist items for About Us (public fallback) */
export const SAMPLE_EXTENSION_CATEGORIES = [
  { name: 'Give Donation', color: 'orange' },
  { name: 'Education Support', color: 'green' },
  { name: 'Food Support', color: 'amber' },
  { name: 'Health Support', color: 'red' },
  { name: 'Our Campaign', color: 'blue' },
];

export function normalizeExtensionCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return SAMPLE_EXTENSION_CATEGORIES;
  }

  return categories.map((category, index) => {
    if (typeof category === 'string') {
      const fallback = SAMPLE_EXTENSION_CATEGORIES[index % SAMPLE_EXTENSION_CATEGORIES.length];
      return { name: category, color: fallback?.color || 'green' };
    }
    return {
      name: category.name || '',
      color: category.color || 'green',
    };
  }).filter((category) => category.name);
}

export function getAboutUsPublicApiResponse() {
  return {
    success: true,
    data: {
      description:
        'FAITH CommUNITY brings together student organizations, volunteers, and partners to plan, run, and showcase community extension programs in one place.',
      image_url: DEFAULT_ABOUT_IMAGE,
      extension_categories: SAMPLE_EXTENSION_CATEGORIES,
    },
  };
}

export function getHeadsFacesApiResponse() {
  return {
    success: true,
    data: [
      {
        id: 1,
        name: 'Dr. Elena Mendoza',
        position: 'Director of Community Extension',
        description:
          'Leading FAITH CommUNITY initiatives that connect student organizations with communities through meaningful extension programs.',
        image_url: SAMPLE_HEAD_PHOTOS[3],
        status: 'ACTIVE',
        display_order: 1,
      },
    ],
  };
}

export function getOrganizationAdvisersApiResponse() {
  return {
    success: true,
    data: [
      {
        id: 1,
        name: 'Prof. Ricardo Gomez',
        role: 'Organization Adviser',
        photo: SAMPLE_HEAD_PHOTOS[4],
        email: 'ricardo.gomez@faith.edu.ph',
        facebook: 'https://www.facebook.com/FAHSS.FAITH',
        organization_acronym: 'FAHSS',
        organization_name: 'FAITH Arts, Humanities and Social Sciences',
        display_order: 1,
      },
      {
        id: 2,
        name: 'Prof. Lisa Fernandez',
        role: 'Organization Adviser',
        photo: SAMPLE_HEAD_PHOTOS[5],
        email: 'lisa.fernandez@faith.edu.ph',
        facebook: 'https://www.facebook.com/FACTS.FAITH',
        organization_acronym: 'FACTS',
        organization_name: 'FAITH Computer and Technology Society',
        display_order: 2,
      },
      {
        id: 3,
        name: 'Prof. Elena Mendoza',
        role: 'Organization Adviser',
        photo: SAMPLE_HEAD_PHOTOS[0],
        email: 'elena.mendoza@faith.edu.ph',
        facebook: 'https://www.facebook.com/FABCOMMS.FAITH',
        organization_acronym: 'FABCOMMS',
        organization_name: 'FAITH Broadcasting & Communications Society',
        display_order: 3,
      },
      {
        id: 4,
        name: 'Prof. Miguel Torres',
        role: 'Organization Adviser',
        photo: SAMPLE_HEAD_PHOTOS[1],
        email: 'miguel.torres@faith.edu.ph',
        facebook: 'https://www.facebook.com/FAICES.FAITH',
        organization_acronym: 'FAICES',
        organization_name: 'FAITH Computer Engineering Society',
        display_order: 4,
      },
      {
        id: 5,
        name: 'Prof. Sarah Aquino',
        role: 'Organization Adviser',
        photo: SAMPLE_HEAD_PHOTOS[2],
        email: 'sarah.aquino@faith.edu.ph',
        facebook: 'https://www.facebook.com/JPIA.FAITH',
        organization_acronym: 'JPIA',
        organization_name: 'Junior Philippine Institute of Accountants',
        display_order: 5,
      },
    ],
  };
}
