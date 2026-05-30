import {
  DEFAULT_ABOUT_IMAGE,
  HERO_CAROUSEL_IMAGES,
  SAMPLE_HEAD_PHOTOS,
  SAMPLE_HERO_VIDEO,
  logoForAcronym,
} from './assets';

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
      logo_url: logoForAcronym('FAHSS'),
      name_url: null,
      favicon_url: null,
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

export function getAboutUsPublicApiResponse() {
  return {
    success: true,
    data: {
      description:
        'FAITH CommUNITY brings together student organizations, volunteers, and partners to plan, run, and showcase community extension programs in one place.',
      image_url: DEFAULT_ABOUT_IMAGE,
      extension_categories: [
        'Education',
        'Environment',
        'Health',
        'Outreach',
        'Skills Development',
        'Youth',
      ],
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
        title: 'Director of Community Extension',
        photo_url: SAMPLE_HEAD_PHOTOS[3],
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
        organization_acronym: 'FAHSS',
        organization_name: 'FAITH Arts, Humanities and Social Sciences',
        adviser_name: 'Prof. Ricardo Gomez',
        photo_url: SAMPLE_HEAD_PHOTOS[4],
      },
      {
        id: 2,
        organization_acronym: 'FACTS',
        organization_name: 'FAITH Computer and Technology Society',
        adviser_name: 'Prof. Lisa Fernandez',
        photo_url: SAMPLE_HEAD_PHOTOS[5],
      },
    ],
  };
}
