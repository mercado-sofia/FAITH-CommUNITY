// Navigation configuration for admin and superadmin portals
import { HiViewGrid, HiOfficeBuilding } from 'react-icons/hi';
import { FaClipboardCheck, FaRegQuestionCircle, FaAddressCard, FaUserCheck } from 'react-icons/fa';
import { TbChecklist } from 'react-icons/tb';
import { HiOutlineNewspaper, HiOutlineCog, HiOutlineStar } from 'react-icons/hi2';
import { FaRegFolderOpen } from 'react-icons/fa6';
import { MdSettings } from 'react-icons/md';

// Superadmin navigation links
export const superadminNavLinks = [
  // General section
  {
    href: '/superadmin',
    label: 'Dashboard',
    icon: HiViewGrid,
    section: 'general'
  },
  // Management section
  {
    href: '/superadmin/approvals',
    label: 'Approvals',
    icon: FaClipboardCheck,
    section: 'management'
  },
  {
    href: '/superadmin/programs',
    label: 'Programs',
    icon: TbChecklist,
    section: 'management'
  },
  {
    href: '/superadmin/invites',
    label: 'Invitations',
    icon: FaAddressCard,
    section: 'management'
  },
  {
    href: '/superadmin/faqs',
    label: 'FAQs',
    icon: FaRegQuestionCircle,
    section: 'management'
  },
  // Account section
  {
    href: '/superadmin/settings',
    label: 'Settings',
    icon: MdSettings,
    section: 'account'
  }
];

// Admin navigation links
export const adminNavLinks = [
  // General section
  {
    href: '/admin',
    label: 'Dashboard',
    icon: HiViewGrid,
    section: 'general'
  },
  // Management section
  {
    href: '/admin/volunteers',
    label: 'Volunteers',
    icon: FaUserCheck,
    section: 'management'
  },
  {
    href: '/admin/news',
    label: 'Announcements',
    icon: HiOutlineNewspaper,
    section: 'management'
  },
  {
    href: '/admin/organization',
    label: 'Organization',
    icon: HiOfficeBuilding,
    section: 'management'
  },
  {
    href: '/admin/programs',
    label: 'Programs',
    icon: TbChecklist,
    section: 'management'
  },
  {
    href: '/admin/highlights',
    label: 'Highlights',
    icon: HiOutlineStar,
    section: 'management'
  },
  {
    href: '/admin/submissions',
    label: 'Submissions',
    icon: FaRegFolderOpen,
    section: 'management'
  },
  // Account section
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: HiOutlineCog,
    section: 'account'
  }
];

