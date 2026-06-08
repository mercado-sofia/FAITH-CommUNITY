import { getOrganizationsApiResponse } from './organizations';
import { getOrganizationByOrgApiResponse } from './organizationByOrg';
import {
  getProgramsApiResponse,
  getProgramsByOrgApiResponse,
  getApprovedUpcomingApiResponse,
} from './programs';
import { getFeaturedProjectsApiResponse } from './featuredProjects';
import { getFeaturedHighlightsResponse } from './highlights';
import { SAMPLE_FAQS } from './faqs';
import { SAMPLE_NEWS, getNewsBySlug } from './news';
import {
  getHeroSectionApiResponse,
  getMissionVisionResponse,
  getFooterApiResponse,
  getBrandingPublicApiResponse,
  getSiteNamePublicApiResponse,
  getAboutUsPublicApiResponse,
  getHeadsFacesApiResponse,
  getOrganizationAdvisersApiResponse,
} from './siteContent';
import {
  getAdminVolunteersApiResponse,
  getAdminProgramsApiResponse,
  getAdminOrganizationApiResponse,
  getAdminAdvocaciesApiResponse,
  getAdminCompetenciesApiResponse,
  getAdminHeadsApiResponse,
  getAdminSubmissionsApiResponse,
  getAdminSubmissionDetailApiResponse,
  getAdminProfileApiResponse,
} from './adminDemo';
import {
  getSuperadminAdminsApiResponse,
  getSuperadminApprovalsApiResponse,
  getSuperadminPendingApprovalsApiResponse,
  getSuperadminOrganizationsApiResponse,
  getSuperadminProgramStatisticsApiResponse,
  getSuperadminCompletionTrendsApiResponse,
  getSuperadminTopOrganizationsApiResponse,
  getSuperadminAllProgramsApiResponse,
  getSuperadminProgramProjectsStatisticsApiResponse,
  getSuperadminFaqsApiResponse,
  getSuperadminProfileApiResponse,
  getSuperadminBrandingApiResponse,
  getSuperadminSiteNameApiResponse,
  getSuperadminHeroSectionApiResponse,
  getSuperadminAboutUsApiResponse,
  getSuperadminHeadsFacesApiResponse,
  getSuperadminFooterApiResponse,
  getSuperadminMissionVisionApiResponse,
  getSuperadminSubmissionDetailApiResponse,
} from './superadminDemo';

/**
 * Normalize request URL to pathname for matching.
 */
export function normalizeFallbackPath(url) {
  if (!url) return '';
  try {
    const parsed = url.startsWith('http') ? new URL(url) : new URL(url, 'http://localhost');
    return parsed.pathname.replace(/\/+$/, '') || '/';
  } catch {
    const withoutQuery = url.split('?')[0];
    return withoutQuery.replace(/\/+$/, '') || '/';
  }
}

function unwrapForSwr(apiBody) {
  if (apiBody && typeof apiBody === 'object' && 'success' in apiBody && 'data' in apiBody) {
    return apiBody.data;
  }
  return apiBody;
}

const ROUTES = [
  {
    pattern: /^\/api\/organization\/org\/([^/]+)$/i,
    resolve: (match) => getOrganizationByOrgApiResponse(match[1]),
  },
  {
    pattern: /^\/api\/organizations$/i,
    resolve: () => getOrganizationsApiResponse(),
  },
  {
    pattern: /^\/api\/programs\/approved\/upcoming$/i,
    resolve: () => getApprovedUpcomingApiResponse(),
  },
  {
    pattern: /^\/api\/programs\/featured$/i,
    resolve: () => getFeaturedProjectsApiResponse(),
  },
  {
    pattern: /^\/api\/programs\/org\/([^/]+)$/i,
    resolve: (match) => getProgramsByOrgApiResponse(match[1]),
  },
  {
    pattern: /^\/api\/programs$/i,
    resolve: () => getProgramsApiResponse(),
  },
  {
    pattern: /^\/api\/highlights\/public\/featured$/i,
    resolve: () => getFeaturedHighlightsResponse(),
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/faqs\/active$/i,
    resolve: () => SAMPLE_FAQS,
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/news\/slug\/([^/]+)$/i,
    resolve: (match) => getNewsBySlug(match[1]),
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/news$/i,
    resolve: () => SAMPLE_NEWS,
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/hero-section$/i,
    resolve: () => getHeroSectionApiResponse(),
  },
  {
    pattern: /^\/api\/mission-vision$/i,
    resolve: () => getMissionVisionResponse(),
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/superadmin\/footer$/i,
    resolve: () => getFooterApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/branding\/public$/i,
    resolve: () => getBrandingPublicApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/branding\/site-name\/public$/i,
    resolve: () => getSiteNamePublicApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/about-us\/public$/i,
    resolve: () => getAboutUsPublicApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/heads-faces$/i,
    resolve: () => getHeadsFacesApiResponse(),
  },
  {
    pattern: /^\/api\/organization-advisers$/i,
    resolve: () => getOrganizationAdvisersApiResponse(),
  },
];

/** Admin & superadmin portal demo fallback routes */
const PORTAL_ROUTES = [
  // Admin
  {
    pattern: /^\/api\/volunteers\/admin\/[^/]+$/i,
    resolve: () => getAdminVolunteersApiResponse(),
  },
  {
    pattern: /^\/api\/admin\/programs$/i,
    resolve: () => getAdminProgramsApiResponse(),
  },
  {
    pattern: /^\/api\/organization\/\d+$/i,
    resolve: () => getAdminOrganizationApiResponse(),
  },
  {
    pattern: /^\/api\/advocacies\/\d+$/i,
    resolve: () => getAdminAdvocaciesApiResponse(),
  },
  {
    pattern: /^\/api\/competencies\/\d+$/i,
    resolve: () => getAdminCompetenciesApiResponse(),
  },
  {
    pattern: /^\/api\/heads\/\d+$/i,
    resolve: () => getAdminHeadsApiResponse(),
  },
  {
    pattern: /^\/api\/submissions\/FABCOMMS$/i,
    resolve: () => getAdminSubmissionsApiResponse(),
  },
  {
    pattern: /^\/api\/submissions\/details\/(\d+)$/i,
    resolve: (match) => getAdminSubmissionDetailApiResponse(match[1]),
  },
  {
    pattern: /^\/api\/admin\/profile$/i,
    resolve: () => getAdminProfileApiResponse(),
  },
  // Superadmin
  {
    pattern: /^\/api\/admins$/i,
    resolve: () => getSuperadminAdminsApiResponse(),
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/approvals\/pending$/i,
    resolve: () => getSuperadminPendingApprovalsApiResponse(),
  },
  {
    pattern: /^\/api\/approvals$/i,
    resolve: () => getSuperadminApprovalsApiResponse(),
  },
  {
    pattern: /^\/api\/organizations$/i,
    resolve: () => getSuperadminOrganizationsApiResponse(),
  },
  {
    pattern: /^\/api\/projects\/superadmin\/statistics$/i,
    resolve: () => getSuperadminProgramStatisticsApiResponse(),
  },
  {
    pattern: /^\/api\/projects\/superadmin\/completion-trends$/i,
    resolve: () => getSuperadminCompletionTrendsApiResponse(),
  },
  {
    pattern: /^\/api\/projects\/superadmin\/top-organizations$/i,
    resolve: () => getSuperadminTopOrganizationsApiResponse(),
  },
  {
    pattern: /^\/api\/program-projects\/superadmin\/all$/i,
    resolve: () => getSuperadminAllProgramsApiResponse(),
  },
  {
    pattern: /^\/api\/program-projects\/superadmin\/statistics$/i,
    resolve: () => getSuperadminProgramProjectsStatisticsApiResponse(),
  },
  {
    pattern: /^\/api\/faqs\/?$/i,
    resolve: () => getSuperadminFaqsApiResponse(),
    skipUnwrap: true,
  },
  {
    pattern: /^\/api\/superadmin\/auth\/profile\/\d+$/i,
    resolve: () => getSuperadminProfileApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/branding\/site-name$/i,
    resolve: () => getSuperadminSiteNameApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/branding$/i,
    resolve: () => getSuperadminBrandingApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/hero-section$/i,
    resolve: () => getSuperadminHeroSectionApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/about-us$/i,
    resolve: () => getSuperadminAboutUsApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/heads-faces$/i,
    resolve: () => getSuperadminHeadsFacesApiResponse(),
  },
  {
    pattern: /^\/api\/superadmin\/footer$/i,
    resolve: () => getSuperadminFooterApiResponse(),
  },
  {
    pattern: /^\/api\/mission-vision$/i,
    resolve: () => getSuperadminMissionVisionApiResponse(),
    skipUnwrap: true,
  },
];

const ALL_ROUTES = [...ROUTES, ...PORTAL_ROUTES];

/**
 * Raw API-shaped body for RTK Query / raw fetch.
 */
export function resolveFallbackApi(url, options = {}) {
  const { method = 'GET' } = options;
  if (method !== 'GET') return null;

  const path = normalizeFallbackPath(url);
  for (const route of ALL_ROUTES) {
    const match = path.match(route.pattern);
    if (match) {
      return route.resolve(match);
    }
  }
  return null;
}

/**
 * Value returned from SWR fetcher (after success/data unwrap when applicable).
 */
export function resolveFallbackSwr(url, options = {}) {
  const apiBody = resolveFallbackApi(url, options);
  if (apiBody === null) return null;

  const path = normalizeFallbackPath(url);
  const route = ALL_ROUTES.find((r) => path.match(r.pattern));
  if (route?.skipUnwrap) {
    return apiBody;
  }
  return unwrapForSwr(apiBody);
}

export function hasFallback(url) {
  return resolveFallbackApi(url, { method: 'GET' }) !== null;
}

export { unwrapForSwr };
