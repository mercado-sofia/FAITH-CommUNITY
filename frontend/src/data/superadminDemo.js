import { SAMPLE_ORGANIZATIONS } from './organizations';
import { SAMPLE_PROGRAMS } from './programs';
import { SAMPLE_FAQS } from './faqs';
import { getDemoSuperadminProfile } from './demoUsers';
import {
  getHeroSectionApiResponse,
  getMissionVisionResponse,
  getFooterApiResponse,
  getBrandingPublicApiResponse,
  getSiteNamePublicApiResponse,
  getAboutUsPublicApiResponse,
  getHeadsFacesApiResponse,
} from './siteContent';

const DEMO_APPROVALS = [
  {
    id: 3001,
    section: 'programs',
    status: 'pending',
    submitted_at: '2025-05-16T09:00:00.000Z',
    org: 'FABCOMMS',
    orgName: 'FAITH Broadcasting & Communications Society',
    submitted_by_org_id: 1,
    proposed_data: { title: 'Community Radio Training', category: 'Education' },
  },
  {
    id: 3002,
    section: 'organization',
    status: 'pending',
    submitted_at: '2025-05-15T14:00:00.000Z',
    org: 'FAICES',
    orgName: 'FAITH Computer Engineering Society',
    submitted_by_org_id: 2,
    proposed_data: { description: 'Updated org profile for FAICES.' },
  },
  {
    id: 3003,
    section: 'news',
    status: 'approved',
    submitted_at: '2025-05-14T11:30:00.000Z',
    org: 'FACTS',
    orgName: 'FAITH Computer and Technology Society',
    submitted_by_org_id: 8,
    proposed_data: { title: 'Extension Week Highlights', status: 'published' },
  },
  {
    id: 3004,
    section: 'highlights',
    status: 'pending',
    submitted_at: '2025-05-13T16:00:00.000Z',
    org: 'FAIEES',
    orgName: 'FAITH Electrical Engineering Society',
    submitted_by_org_id: 3,
    proposed_data: { title: 'Solar Panel Installation', year: 2025 },
  },
  {
    id: 3005,
    section: 'programs',
    status: 'rejected',
    submitted_at: '2025-05-12T08:00:00.000Z',
    org: 'JPIA',
    orgName: 'Junior Philippine Institute of Accountants',
    submitted_by_org_id: 12,
    proposed_data: { title: 'Financial Literacy Seminar' },
    rejection_reason: 'Incomplete program details.',
  },
  {
    id: 3006,
    section: 'heads',
    status: 'pending',
    submitted_at: '2025-05-11T10:00:00.000Z',
    org: 'FABCOMMS',
    orgName: 'FAITH Broadcasting & Communications Society',
    submitted_by_org_id: 1,
    proposed_data: { head_name: 'Carlos Rivera', role: 'Treasurer' },
  },
  {
    id: 3007,
    section: 'advocacies',
    status: 'approved',
    submitted_at: '2025-05-10T13:00:00.000Z',
    org: 'FAHSS',
    orgName: 'FAITH Arts, Humanities and Social Sciences',
    submitted_by_org_id: 6,
    proposed_data: { advocacy: 'Arts for community development.' },
  },
  {
    id: 3008,
    section: 'programs',
    status: 'pending',
    submitted_at: '2025-05-09T15:30:00.000Z',
    org: 'FTL',
    orgName: 'FAITH Tourism League',
    submitted_by_org_id: 9,
    proposed_data: { title: 'Heritage Site Clean-Up' },
  },
];

const DEMO_ADMINS = SAMPLE_ORGANIZATIONS.slice(0, 8).map((org, index) => ({
  id: 100 + index,
  email: `admin.${org.acronym.toLowerCase()}@faith.edu.ph`,
  organization_id: org.id,
  org: org.acronym,
  orgName: org.name,
  is_active: index % 5 !== 0,
  role: 'admin',
}));

function mapSuperadminProgram(program) {
  const org = SAMPLE_ORGANIZATIONS.find((o) => o.acronym === program.orgID);
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    category: program.category,
    status: program.status,
    image: program.image,
    event_start_date: program.event_start_date,
    event_end_date: program.event_end_date,
    multiple_dates: program.multiple_dates,
    created_at: program.created_at,
    updated_at: program.created_at,
    organization_id: org?.id ?? 1,
    organization_name: org?.name ?? program.orgName,
    organization_acronym: org?.acronym ?? program.orgAcronym,
    organization_color: org?.color ?? program.orgColor,
    orgLogo: org?.logo ?? program.orgLogo,
    is_collaborative: program.is_collaborative,
    collaborators: program.collaborators,
    manual_status_override: program.manual_status_override,
    accepts_volunteers: program.accepts_volunteers,
    submitted_by_name: 'Demo Admin',
    submitted_by_role: 'President',
  };
}

export function getSuperadminAdminsApiResponse() {
  return DEMO_ADMINS;
}

export function getSuperadminApprovalsApiResponse() {
  return { success: true, data: DEMO_APPROVALS };
}

export function getSuperadminPendingApprovalsApiResponse() {
  const pending = DEMO_APPROVALS.filter((a) => a.status === 'pending');
  return { success: true, data: pending };
}

export function getSuperadminOrganizationsApiResponse() {
  return {
    success: true,
    data: SAMPLE_ORGANIZATIONS.map((org) => ({
      id: org.id,
      acronym: org.acronym,
      name: org.name,
      logo: org.logo,
      color: org.color,
    })),
  };
}

export function getSuperadminProgramStatisticsApiResponse() {
  const upcoming = SAMPLE_PROGRAMS.filter((p) => p.status === 'Upcoming').length;
  const active = 3;
  const completed = 4;

  return {
    success: true,
    data: {
      upcoming_programs: upcoming,
      active_programs: active,
      completed_programs: completed,
      completed_this_year: completed,
      completed_previous_year: 2,
      percentage_change: 12.5,
      total_programs: SAMPLE_PROGRAMS.length,
      archived_programs: 1,
      featured_programs: 3,
      total_organizations: SAMPLE_ORGANIZATIONS.length,
    },
  };
}

export function getSuperadminCompletionTrendsApiResponse() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return {
    success: true,
    data: months.map((month, index) => ({
      month,
      completed: 2 + (index % 3),
      year: 2025,
    })),
  };
}

export function getSuperadminTopOrganizationsApiResponse() {
  return {
    success: true,
    data: SAMPLE_ORGANIZATIONS.slice(0, 8).map((org, index) => ({
      id: org.id,
      acronym: org.acronym,
      name: org.name,
      logo: org.logo,
      color: org.color,
      program_count: 8 - index,
    })),
  };
}

export function getSuperadminAllProgramsApiResponse() {
  return {
    success: true,
    data: SAMPLE_PROGRAMS.map(mapSuperadminProgram),
  };
}

export function getSuperadminProgramProjectsStatisticsApiResponse() {
  const stats = getSuperadminProgramStatisticsApiResponse().data;
  return {
    success: true,
    data: {
      total_programs: stats.total_programs,
      upcoming_programs: stats.upcoming_programs,
      active_programs: stats.active_programs,
      completed_programs: stats.completed_programs,
      archived_programs: stats.archived_programs,
      featured_programs: stats.featured_programs,
      total_organizations: stats.total_organizations,
    },
  };
}

export function getSuperadminFaqsApiResponse() {
  return SAMPLE_FAQS;
}

export function getSuperadminProfileApiResponse() {
  return getDemoSuperadminProfile();
}

export function getSuperadminBrandingApiResponse() {
  return getBrandingPublicApiResponse();
}

export function getSuperadminSiteNameApiResponse() {
  return getSiteNamePublicApiResponse();
}

export function getSuperadminHeroSectionApiResponse() {
  return getHeroSectionApiResponse();
}

export function getSuperadminAboutUsApiResponse() {
  return getAboutUsPublicApiResponse();
}

export function getSuperadminHeadsFacesApiResponse() {
  return getHeadsFacesApiResponse();
}

export function getSuperadminFooterApiResponse() {
  return getFooterApiResponse();
}

export function getSuperadminMissionVisionApiResponse() {
  return getMissionVisionResponse();
}

export function getSuperadminSubmissionDetailApiResponse(id) {
  const approval = DEMO_APPROVALS.find((a) => String(a.id) === String(id));
  if (!approval) {
    return { success: false, message: 'Submission not found' };
  }
  return { success: true, data: approval };
}
