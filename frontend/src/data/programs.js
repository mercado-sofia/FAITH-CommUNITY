import { logoForAcronym, programImageAt } from './assets';
import { SAMPLE_ORGANIZATIONS } from './organizations';

const now = new Date();
const nextMonth = new Date(now);
nextMonth.setMonth(nextMonth.getMonth() + 1);
const eventStart = nextMonth.toISOString().split('T')[0];
const eventEnd = new Date(nextMonth);
eventEnd.setDate(eventEnd.getDate() + 2);
const eventEndStr = eventEnd.toISOString().split('T')[0];

const PROGRAM_TITLES = [
  { title: 'Community Outreach Drive', category: 'Outreach' },
  { title: 'Environmental Clean-Up', category: 'Environment' },
  { title: 'Literacy Support Program', category: 'Education' },
  { title: 'Health & Wellness Fair', category: 'Health' },
  { title: 'Skills Training Workshop', category: 'Skills Development' },
  { title: 'Youth Leadership Camp', category: 'Youth' },
  { title: 'Food Distribution Drive', category: 'Social Services' },
  { title: 'Digital Literacy Seminar', category: 'Education' },
  { title: 'Tree Planting Initiative', category: 'Environment' },
  { title: 'Senior Citizens Outreach', category: 'Outreach' },
];

function buildProgram(id, orgIndex, programIndex) {
  const org = SAMPLE_ORGANIZATIONS[orgIndex % SAMPLE_ORGANIZATIONS.length];
  const meta = PROGRAM_TITLES[programIndex % PROGRAM_TITLES.length];
  const slug = `${meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${org.acronym.toLowerCase()}-${id}`;

  return {
    id,
    title: `${meta.title} — ${org.acronym}`,
    description:
      'A community extension initiative connecting students with local partners to deliver meaningful service and learning experiences.',
    category: meta.category,
    status: 'Upcoming',
    date: eventStart,
    image: programImageAt(id),
    additional_images: [],
    event_start_date: eventStart,
    event_end_date: eventEndStr,
    multiple_dates: [eventStart],
    organization_id: org.id,
    organization_name: org.name,
    organization_acronym: org.acronym,
    orgID: org.acronym,
    orgName: org.name,
    orgAcronym: org.acronym,
    orgColor: org.color,
    orgLogo: org.logo || logoForAcronym(org.acronym),
    created_at: now.toISOString(),
    slug,
    is_collaborative: id % 4 === 0,
    collaborators: [],
    manual_status_override: false,
    accepts_volunteers: true,
    organization: org.acronym,
    org: org.acronym,
  };
}

/** Shape used by the public program details page (matches API slug response) */
function toDetailProgram(program) {
  if (!program) return null;
  return {
    ...program,
    organization_id: program.organization_id,
    organization_name: program.organization_name ?? program.orgName,
    organization_acronym: program.organization_acronym ?? program.orgAcronym ?? program.orgID,
    orgLogo: program.orgLogo,
    manual_status_override: program.manual_status_override === true,
    accepts_volunteers: program.accepts_volunteers !== false,
  };
}

export function getProgramBySlug(slug) {
  if (!slug) return null;
  const isNumeric = !Number.isNaN(Number(slug)) && String(slug).trim() !== '';
  const program = isNumeric
    ? SAMPLE_PROGRAMS.find((p) => p.id === parseInt(slug, 10))
    : SAMPLE_PROGRAMS.find((p) => p.slug === slug);
  return program ? toDetailProgram(program) : null;
}

export function getProgramBySlugApiResponse(slug) {
  const program = getProgramBySlug(slug);
  if (!program) return null;
  return { success: true, data: program };
}

export function getOtherProgramsByOrgApiResponse(orgIdOrAcronym, excludeProgramId) {
  const excludeId = parseInt(excludeProgramId, 10);
  const orgKey = String(orgIdOrAcronym || '').toUpperCase();
  const programs = SAMPLE_PROGRAMS.filter((p) => {
    const sameOrg =
      p.organization_id === parseInt(orgIdOrAcronym, 10) ||
      p.orgID === orgKey ||
      p.orgAcronym === orgKey;
    return sameOrg && p.id !== excludeId;
  })
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      status: p.status,
      image: p.image,
      slug: p.slug,
      created_at: p.created_at,
      accepts_volunteers: p.accepts_volunteers,
      organization_name: p.organization_name ?? p.orgName,
      organization_acronym: p.organization_acronym ?? p.orgAcronym,
      orgLogo: p.orgLogo,
    }));
  return { success: true, data: programs };
}

/** Full program list used across public endpoints */
export const SAMPLE_PROGRAMS = PROGRAM_TITLES.map((_, i) =>
  buildProgram(i + 1, i % 5, i)
);

export function getProgramsByOrgAcronym(acronym) {
  const key = (acronym || '').toUpperCase();
  return SAMPLE_PROGRAMS.filter((p) => p.orgID === key);
}

export function getProgramsApiResponse() {
  return { success: true, data: SAMPLE_PROGRAMS };
}

export function getProgramsByOrgApiResponse(acronym) {
  return { success: true, data: getProgramsByOrgAcronym(acronym) };
}

export function getApprovedUpcomingApiResponse() {
  return {
    success: true,
    data: SAMPLE_PROGRAMS.filter((p) => p.status === 'Upcoming' && p.accepts_volunteers),
  };
}
