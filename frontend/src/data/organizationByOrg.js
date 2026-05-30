import { SAMPLE_HEAD_PHOTOS } from './assets';
import { getOrganizationByAcronym } from './organizations';
import { getProgramsByOrgAcronym } from './programs';

function buildHeads(organizationId) {
  return [
    {
      head_name: 'Maria Santos',
      role: 'President',
      facebook: 'https://facebook.com',
      email: 'president@faith.edu.ph',
      photo: SAMPLE_HEAD_PHOTOS[0],
      display_order: 1,
    },
    {
      head_name: 'Juan Dela Cruz',
      role: 'Vice President',
      facebook: 'https://facebook.com',
      email: 'vp@faith.edu.ph',
      photo: SAMPLE_HEAD_PHOTOS[1],
      display_order: 2,
    },
    {
      head_name: 'Ana Reyes',
      role: 'Secretary',
      facebook: 'https://facebook.com',
      email: 'secretary@faith.edu.ph',
      photo: SAMPLE_HEAD_PHOTOS[2],
      display_order: 3,
    },
  ].map((head, index) => ({ ...head, organization_id: organizationId, id: organizationId * 10 + index + 1 }));
}

export function getOrganizationDetailByAcronym(acronym) {
  const org = getOrganizationByAcronym(acronym);
  if (!org) return null;

  const programs = getProgramsByOrgAcronym(org.acronym);

  return {
    id: org.id,
    org: org.acronym,
    orgName: org.name,
    logo: org.logo,
    email: `contact.${org.acronym.toLowerCase()}@faith.edu.ph`,
    facebook: 'https://facebook.com/faithcommunity',
    description: `${org.name} leads community extension programs that empower students and partner communities through service, leadership, and collaboration.`,
    org_color: org.color,
    status: 'ACTIVE',
    advocacies:
      'We advocate for inclusive community development, student leadership, and sustainable outreach that creates lasting positive impact.',
    competencies:
      'Program planning, community engagement, volunteer coordination, partnership building, and impact assessment.',
    heads: buildHeads(org.id),
    featuredProjects: programs.slice(0, 3),
  };
}

export function getOrganizationByOrgApiResponse(acronym) {
  const data = getOrganizationDetailByAcronym(acronym);
  if (!data) {
    return { success: false, message: 'Organization not found' };
  }
  return { success: true, data };
}
