import { programImageAt } from './assets';
import { SAMPLE_ORGANIZATIONS } from './organizations';

export function getFeaturedHighlightsResponse() {
  const highlights = SAMPLE_ORGANIZATIONS.slice(0, 6).map((org, index) => ({
    highlight_id: index + 1,
    display_order: index + 1,
    impact_level: index % 3 === 0 ? 'high' : index % 3 === 1 ? 'average' : 'low',
    id: index + 1,
    title: `${org.acronym} Community Impact`,
    description: `Highlighting meaningful extension work led by ${org.name}.`,
    media_files: JSON.stringify([{ url: programImageAt(index + 3), type: 'image' }]),
    media: [{ url: programImageAt(index + 3), type: 'image' }],
    created_at: new Date().toISOString(),
    organization_id: org.id,
    organization_name: org.name,
    organization_acronym: org.acronym,
    organization_logo: org.logo,
    organization_color: org.color,
    program_id: index + 1,
    program_title: `${org.acronym} Outreach Program`,
    year: new Date().getFullYear(),
  }));

  return { highlights };
}
