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
