import { getOrganizationByAcronym } from './organizations';

const DEMO_ADMIN_ID = 9001;
const DEMO_SUPERADMIN_ID = 9002;

const fabcomms = getOrganizationByAcronym('FABCOMMS');

export function getDemoAdminUser() {
  return {
    id: DEMO_ADMIN_ID,
    email: 'demo.admin@faith.edu.ph',
    role: 'admin',
    organization_id: fabcomms?.id ?? 1,
    org: fabcomms?.acronym ?? 'FABCOMMS',
    orgName: fabcomms?.name ?? 'FAITH Broadcasting & Communications Society',
    logo: fabcomms?.logo ?? '',
    status: 'ACTIVE',
  };
}

export function getDemoSuperadminUser() {
  return {
    id: DEMO_SUPERADMIN_ID,
    email: 'demo.superadmin@faith.edu.ph',
    role: 'superadmin',
    name: 'Demo Super Administrator',
    org: 'FACES',
    orgName: 'FACES Community System',
  };
}

export function getDemoAdminProfile() {
  const admin = getDemoAdminUser();
  return {
    id: admin.id,
    email: admin.email,
    role: 'admin',
    organization_id: admin.organization_id,
    org: admin.org,
    orgName: admin.orgName,
    logo: admin.logo,
    status: 'ACTIVE',
    password_changed_at: null,
    created_at: '2024-01-15T08:00:00.000Z',
  };
}

export function getDemoSuperadminProfile() {
  const superadmin = getDemoSuperadminUser();
  return {
    id: superadmin.id,
    email: superadmin.email,
    role: 'superadmin',
    name: superadmin.name,
    twofa_enabled: false,
    password_changed_at: null,
    created_at: '2024-01-01T08:00:00.000Z',
  };
}
