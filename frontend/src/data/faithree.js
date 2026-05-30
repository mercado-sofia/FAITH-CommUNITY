/**
 * FAITHree demo data — featured highlights for the 3D tree (live demo / API fallback).
 * Most organizations get 12 stars; FABCOMMS gets 5 and FAICES gets 3 for demo variety.
 */
import { programImageAt } from './assets';
import { SAMPLE_ORGANIZATIONS } from './organizations';

const DEFAULT_HIGHLIGHTS_PER_ORG = 12;
const IMPACT_LEVELS = ['low', 'average', 'high'];
const CURRENT_YEAR = new Date().getFullYear();

function highlightsCountForOrg(orgId) {
  if (orgId === 1) return 5;
  if (orgId === 2) return 3;
  return DEFAULT_HIGHLIGHTS_PER_ORG;
}

export function getFaithreeFeaturedHighlightsResponse() {
  const highlights = [];
  let highlightId = 1;

  SAMPLE_ORGANIZATIONS.forEach((org, orgIndex) => {
    const count = highlightsCountForOrg(org.id);
    for (let i = 0; i < count; i += 1) {
      const imageUrl = programImageAt(orgIndex + i);
      const mediaItem = { url: imageUrl, type: 'image' };

      highlights.push({
        highlight_id: highlightId,
        display_order: highlightId,
        impact_level: IMPACT_LEVELS[i % IMPACT_LEVELS.length],
        id: highlightId,
        title: `${org.acronym} Community Impact ${i + 1}`,
        description: `A featured extension highlight from ${org.name}, showcasing student-led outreach and community partnership.`,
        media_files: JSON.stringify([mediaItem]),
        media: [mediaItem],
        created_at: new Date(CURRENT_YEAR, i % 12, 1).toISOString(),
        organization_id: org.id,
        organization_name: org.name,
        organization_acronym: org.acronym,
        organization_logo: org.logo,
        organization_color: org.color,
        program_id: highlightId,
        program_title: `${org.acronym} Outreach Program`,
        year: CURRENT_YEAR - (i % 3),
      });

      highlightId += 1;
    }
  });

  return { highlights };
}
