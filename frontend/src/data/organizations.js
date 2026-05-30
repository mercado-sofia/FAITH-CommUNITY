import { logoForAcronym } from './assets';

/** All active organizations for public listings */
export const SAMPLE_ORGANIZATIONS = [
  { id: 1, acronym: 'FABCOMMS', name: 'FAITH Broadcasting & Communications Society', logo: logoForAcronym('FABCOMMS'), color: '#1e40af' },
  { id: 2, acronym: 'FAICES', name: 'FAITH Computer Engineering Society', logo: logoForAcronym('FAICES'), color: '#0d9488' },
  { id: 3, acronym: 'FAIEES', name: 'FAITH Electrical Engineering Society', logo: logoForAcronym('FAIEES'), color: '#ca8a04' },
  { id: 4, acronym: 'FAIIES', name: 'FAITH Industrial Engineering Society', logo: logoForAcronym('FAIIES'), color: '#7c3aed' },
  { id: 5, acronym: 'FAIPS', name: 'FAITH Psychology Society', logo: logoForAcronym('FAIPS'), color: '#db2777' },
  { id: 6, acronym: 'FAHSS', name: 'FAITH Arts, Humanities and Social Sciences', logo: logoForAcronym('FAHSS'), color: '#b45309' },
  { id: 7, acronym: 'FAPSS', name: 'FAITH Political Science Society', logo: logoForAcronym('FAPSS'), color: '#0369a1' },
  { id: 8, acronym: 'FACTS', name: 'FAITH Computer and Technology Society', logo: logoForAcronym('FACTS'), color: '#059669' },
  { id: 9, acronym: 'FTL', name: 'FAITH Tourism League', logo: logoForAcronym('FTL'), color: '#c2410c' },
  { id: 10, acronym: 'IIEE', name: 'Institute of Integrated Electrical Engineers', logo: logoForAcronym('IIEE'), color: '#4f46e5' },
  { id: 11, acronym: 'JMAP', name: 'Junior Marketing Association of the Philippines', logo: logoForAcronym('JMAP'), color: '#be123c' },
  { id: 12, acronym: 'JPIA', name: 'Junior Philippine Institute of Accountants', logo: logoForAcronym('JPIA'), color: '#15803d' },
  { id: 13, acronym: 'UTHYP', name: 'United Tourism and Hospitality Youth of the Philippines', logo: logoForAcronym('UTHYP'), color: '#0e7490' },
];

export function getOrganizationByAcronym(acronym) {
  return SAMPLE_ORGANIZATIONS.find(
    (org) => org.acronym.toUpperCase() === (acronym || '').toUpperCase()
  );
}

export function getOrganizationsApiResponse() {
  return { success: true, data: SAMPLE_ORGANIZATIONS };
}
