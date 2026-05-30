import { SAMPLE_PROGRAMS } from './programs';

export function getFeaturedProjectsApiResponse() {
  return {
    success: true,
    data: SAMPLE_PROGRAMS.slice(0, 6).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      image: p.image,
      status: p.status,
      event_start_date: p.event_start_date,
      event_end_date: p.event_end_date,
      orgAcronym: p.orgAcronym,
      orgName: p.orgName,
      orgColor: p.orgColor,
      category: p.category,
      created_at: p.created_at,
      slug: p.slug,
      is_collaborative: p.is_collaborative,
      collaborators: p.collaborators,
    })),
  };
}
