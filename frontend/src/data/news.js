import { DEFAULT_ABOUT_IMAGE, programImageAt } from './assets';

export const SAMPLE_NEWS = [
  {
    id: 1,
    title: 'Extension Programs Launch for 2025',
    slug: 'extension-programs-launch-2025',
    content:
      '<p>Student organizations across FAITH Colleges are launching new community extension initiatives for the academic year.</p>',
    excerpt: 'New community extension initiatives are underway across campus organizations.',
    image_url: programImageAt(5),
    status: 'published',
    published_at: '2025-02-01T00:00:00.000Z',
    created_at: '2025-02-01T00:00:00.000Z',
    organization_acronym: 'FAHSS',
    organization_name: 'FAITH Arts, Humanities and Social Sciences',
  },
  {
    id: 2,
    title: 'Volunteer Drive Reaches New Milestone',
    slug: 'volunteer-drive-milestone',
    content:
      '<p>Thank you to all volunteers who participated in recent outreach activities. Your impact continues to grow.</p>',
    excerpt: 'Volunteers made a strong impact in recent outreach activities.',
    image_url: programImageAt(8),
    status: 'published',
    published_at: '2025-02-10T00:00:00.000Z',
    created_at: '2025-02-10T00:00:00.000Z',
    organization_acronym: 'FACTS',
    organization_name: 'FAITH Computer and Technology Society',
  },
  {
    id: 3,
    title: 'Partnership Spotlight: Local Communities',
    slug: 'partnership-spotlight-local-communities',
    content:
      '<p>Organizations are strengthening partnerships with barangays and local institutions to expand program reach.</p>',
    excerpt: 'Campus organizations expand partnerships with local communities.',
    image_url: DEFAULT_ABOUT_IMAGE,
    status: 'published',
    published_at: '2025-02-20T00:00:00.000Z',
    created_at: '2025-02-20T00:00:00.000Z',
    organization_acronym: 'JPIA',
    organization_name: 'Junior Philippine Institute of Accountants',
  },
];

export function getNewsBySlug(slug) {
  return SAMPLE_NEWS.find((article) => article.slug === slug) || null;
}
