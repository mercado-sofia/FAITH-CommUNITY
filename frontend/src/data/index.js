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

/**
 * Raw API-shaped body for RTK Query / raw fetch.
 */
export function resolveFallbackApi(url, options = {}) {
  const { method = 'GET' } = options;
  if (method !== 'GET') return null;

  const path = normalizeFallbackPath(url);
  for (const route of ROUTES) {
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
  const route = ROUTES.find((r) => path.match(r.pattern));
  if (route?.skipUnwrap) {
    return apiBody;
  }
  return unwrapForSwr(apiBody);
}

export function hasFallback(url) {
  return resolveFallbackApi(url, { method: 'GET' }) !== null;
}

export { unwrapForSwr };
