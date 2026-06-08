import { getOrganizationDetailByAcronym } from './organizationByOrg';
import { getProgramsByOrgAcronym } from './programs';
import { getDemoAdminProfile } from './demoUsers';

const DEMO_ORG = 'FABCOMMS';
const orgDetail = getOrganizationDetailByAcronym(DEMO_ORG);

function mapAdminPrograms() {
  const programs = getProgramsByOrgAcronym(DEMO_ORG);
  const statuses = ['Upcoming', 'Active', 'Completed', 'Upcoming', 'Active'];

  return programs.map((program, index) => ({
    ...program,
    organization_id: orgDetail?.id ?? 1,
    status: statuses[index % statuses.length],
    accepts_volunteers: true,
    has_approved_post_act_report: index % 2 === 0,
    manual_status_override: false,
    updated_at: program.created_at,
    date_completed: statuses[index % statuses.length] === 'Completed' ? program.event_end_date : null,
  }));
}

const DEMO_VOLUNTEERS = [
  {
    id: 1001,
    full_name: 'Elena Garcia',
    age: 20,
    gender: 'Female',
    email: 'elena.garcia@student.faith.edu.ph',
    contact_number: '+63 917 111 2233',
    address: 'Batangas City',
    occupation: 'Student',
    citizenship: 'Filipino',
    program_name: 'Community Outreach Drive — FABCOMMS',
    program_id: 1,
    user_id: 501,
    organization_name: orgDetail?.orgName,
    status: 'Approved',
    reason: '',
    valid_id: '/samples/sample1.jpg',
    profile_photo_url: null,
    created_at: '2025-05-10T08:30:00.000Z',
  },
  {
    id: 1002,
    full_name: 'Mark Reyes',
    age: 21,
    gender: 'Male',
    email: 'mark.reyes@student.faith.edu.ph',
    contact_number: '+63 918 222 3344',
    address: 'Lipa City',
    occupation: 'Student',
    citizenship: 'Filipino',
    program_name: 'Environmental Clean-Up — FABCOMMS',
    program_id: 2,
    user_id: 502,
    organization_name: orgDetail?.orgName,
    status: 'Pending',
    reason: '',
    valid_id: '/samples/sample2.jpg',
    profile_photo_url: null,
    created_at: '2025-05-12T14:00:00.000Z',
  },
  {
    id: 1003,
    full_name: 'Sofia Mendoza',
    age: 19,
    gender: 'Female',
    email: 'sofia.mendoza@student.faith.edu.ph',
    contact_number: '+63 919 333 4455',
    address: 'Tanauan City',
    occupation: 'Student',
    citizenship: 'Filipino',
    program_name: 'Literacy Support Program — FABCOMMS',
    program_id: 3,
    user_id: 503,
    organization_name: orgDetail?.orgName,
    status: 'Approved',
    reason: '',
    valid_id: '/samples/sample3.jpeg',
    profile_photo_url: null,
    created_at: '2025-05-08T10:15:00.000Z',
  },
  {
    id: 1004,
    full_name: 'James Cruz',
    age: 22,
    gender: 'Male',
    email: 'james.cruz@student.faith.edu.ph',
    contact_number: '+63 920 444 5566',
    address: 'Sto. Tomas',
    occupation: 'Student',
    citizenship: 'Filipino',
    program_name: 'Health & Wellness Fair — FABCOMMS',
    program_id: 4,
    user_id: 504,
    organization_name: orgDetail?.orgName,
    status: 'Declined',
    reason: 'Schedule conflict',
    valid_id: '/samples/sample4.jpg',
    profile_photo_url: null,
    created_at: '2025-05-01T09:00:00.000Z',
  },
  {
    id: 1005,
    full_name: 'Patricia Lim',
    age: 20,
    gender: 'Female',
    email: 'patricia.lim@student.faith.edu.ph',
    contact_number: '+63 921 555 6677',
    address: 'Batangas City',
    occupation: 'Student',
    citizenship: 'Filipino',
    program_name: 'Skills Training Workshop — FABCOMMS',
    program_id: 5,
    user_id: 505,
    organization_name: orgDetail?.orgName,
    status: 'Pending',
    reason: '',
    valid_id: '/samples/sample5.jpg',
    profile_photo_url: null,
    created_at: '2025-05-14T16:45:00.000Z',
  },
];

const DEMO_SUBMISSIONS = [
  {
    id: 2001,
    section: 'programs',
    status: 'pending',
    submitted_at: '2025-05-15T10:00:00.000Z',
    proposed_data: {
      title: 'Youth Media Literacy Workshop',
      description: 'A workshop teaching media literacy to partner communities.',
      category: 'Education',
    },
    rejection_reason: null,
  },
  {
    id: 2002,
    section: 'organization',
    status: 'approved',
    submitted_at: '2025-05-10T08:00:00.000Z',
    proposed_data: {
      description: 'Updated organization description for FABCOMMS outreach.',
    },
    rejection_reason: null,
  },
  {
    id: 2003,
    section: 'heads',
    status: 'pending',
    submitted_at: '2025-05-12T14:30:00.000Z',
    proposed_data: {
      head_name: 'Carlos Rivera',
      role: 'Treasurer',
      email: 'treasurer@faith.edu.ph',
    },
    rejection_reason: null,
  },
  {
    id: 2004,
    section: 'advocacies',
    status: 'rejected',
    submitted_at: '2025-05-08T11:00:00.000Z',
    proposed_data: {
      advocacy: 'Expanded advocacy statement for community broadcasting.',
    },
    rejection_reason: 'Please provide more specific advocacy goals.',
  },
  {
    id: 2005,
    section: 'competencies',
    status: 'pending',
    submitted_at: '2025-05-14T09:15:00.000Z',
    proposed_data: {
      competency: 'Digital content creation and community storytelling.',
    },
    rejection_reason: null,
  },
];

export function getAdminVolunteersApiResponse() {
  return { success: true, data: DEMO_VOLUNTEERS };
}

export function getAdminProgramsApiResponse() {
  return { success: true, data: mapAdminPrograms() };
}

export function getAdminOrganizationApiResponse() {
  if (!orgDetail) {
    return { success: false, message: 'Organization not found' };
  }

  return {
    success: true,
    data: {
      id: orgDetail.id,
      logo: orgDetail.logo,
      org: orgDetail.org,
      orgName: orgDetail.orgName,
      email: orgDetail.email,
      facebook: orgDetail.facebook,
      description: orgDetail.description,
      org_color: orgDetail.org_color,
    },
  };
}

export function getAdminAdvocaciesApiResponse() {
  return {
    success: true,
    data: [
      {
        id: 1,
        organization_id: orgDetail?.id ?? 1,
        advocacy: orgDetail?.advocacies ?? '',
      },
    ],
  };
}

export function getAdminCompetenciesApiResponse() {
  return {
    success: true,
    data: [
      {
        id: 1,
        organization_id: orgDetail?.id ?? 1,
        competency: orgDetail?.competencies ?? '',
      },
    ],
  };
}

export function getAdminHeadsApiResponse() {
  return {
    success: true,
    data: (orgDetail?.heads ?? []).map((head) => ({
      ...head,
      name: head.head_name,
      position: head.role,
    })),
  };
}

export function getAdminSubmissionsApiResponse() {
  return { success: true, data: DEMO_SUBMISSIONS };
}

export function getAdminSubmissionDetailApiResponse(id) {
  const submission = DEMO_SUBMISSIONS.find((s) => String(s.id) === String(id));
  if (!submission) {
    return { success: false, message: 'Submission not found' };
  }
  return { success: true, data: submission };
}

export function getAdminProfileApiResponse() {
  return { success: true, data: getDemoAdminProfile() };
}
