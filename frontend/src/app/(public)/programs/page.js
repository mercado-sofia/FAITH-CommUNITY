'use client';

import { useState, useMemo } from 'react';
import styles from './programs.module.css';
import PageBanner from '../components/PageBanner';
import SearchAndFilterBar from './components/SearchAndFilterBar';
import OrgLinks from './components/OrgLinks';
import ProgramCard from './components/ProgramCard';
import Pagination from './components/Pagination';

const mockProjects = [
  {
    id: 1,
    title: 'Feeding Program for Barangay Maligaya',
    description: 'Helped 100+ children with nutritious meals.',
    image: '/sample/programs/1.jpg',
    category: 'Outreach',
    organization: 'ftl',
    orgName: "FAITH Teachers' League",
    icon: '/logo/ftl_logo.jpg',
    status: 'Completed',
    date: '2025-02-06',
  },
  {
    id: 2,
    title: 'Tech Bootcamp',
    description: 'A hands-on bootcamp for anyone curious about coding — learn to build websites using HTML, CSS, JavaScript, and React in just 3 weeks',
    image: '/sample/programs/2.jpg',
    category: 'Workshop',
    organization: 'facts',
    orgName: 'FAITH Computer Technology Society',
    icon: '/logo/facts_logo.png',
    status: 'Active',
    date: '2025-04-10',
  },
  {
    id: 3,
    title: 'Accounting Summit',
    description: 'A seminar that gave a closer look at modern accounting tools and practices to help future accountants stay ahead in a fast-changing industry.',
    image: '/sample/programs/3.jpeg',
    category: 'Seminar',
    organization: 'jpia',
    orgName: 'Junior Philippine Institute of Accountants - FAITH Chapter',
    icon: '/logo/jpia_logo.jpg',
    status: 'Active',
    date: '2024-08-09',
  },
  {
    id: 4,
    title: 'Mental Health Awareness Drive',
    description: 'Promoted mental wellness through talks and art therapy.',
    image: '/sample/programs/4.jpg',
    category: 'Campaign',
    organization: 'fabcomms',
    orgName: 'First Asia BA Communication and Multimedia Arts Society',
    icon: '/logo/fabcomms_logo.jpg',
    status: 'Completed',
    date: '2024-05-05',
  },
  {
    id: 5,
    title: 'Youth Leadership Training',
    description: 'Discover your potential through fun, hands-on activities and team challenges that bring out the leader in you.',
    image: '/sample/programs/5.jpg',
    category: 'Training',
    organization: 'jmap',
    orgName: 'Junior Managers Association of the Philippines',
    icon: '/logo/jmap_logo.jpg',
    status: 'Active',
    date: '2025-06-05',
  },
  {
    id: 6,
    title: 'First Aid and Emergency Preparedness Workshop',
    description: 'Taught basic life support and disaster readiness.',
    image: '/sample/programs/6.jpg',
    category: 'Workshop',
    organization: 'faips',
    orgName: 'FAITH Psychology Society',
    icon: '/logo/faips_logo.png',
    status: 'Completed',
    date: '2024-03-20',
  },
  {
    id: 7,
    title: 'Web Development 101',
    description: 'Hands-on training on frontend and backend basics.',
    image: '/sample/programs/7.png',
    category: 'Tech Training',
    organization: 'facts',
    orgName: 'FAITH Computer Technology Society',
    icon: '/logo/facts_logo.png',
    status: 'Completed',
    date: '2024-11-05',
  },
  {
    id: 8,
    title: 'Cultural Heritage Exhibit',
    description: 'Showcased Filipino heritage through art and storytelling.',
    image: '/sample/programs/8.jpg',
    category: 'Exhibit',
    organization: 'fahss',
    orgName: 'FAITH Allied Health Sciences Society',
    icon: '/logo/fahss_logo.jpg',
    status: 'Completed',
    date: '2024-05-22',
  },
  {
    id: 9,
    title: 'Disaster Preparedness Orientation',
    description: 'Educated students and residents on disaster risk reduction.',
    image: '/sample/programs/9.jpg',
    category: 'Awareness Campaign',
    organization: 'faiees',
    orgName: 'FAITH Electronics Engineering Society',
    icon: '/logo/faiees_logo.jpg',
    status: 'Completed',
    date: '2023-03-04',
  },
  {
    id: 10,
    title: 'Career Talk Series',
    description: 'Invited professionals to inspire graduating students.',
    image: '/sample/programs/10.jpg',
    category: 'Talk',
    organization: 'fapss',
    orgName: 'FAITH Public Safety Society',
    icon: '/logo/fapss_logo.jpg',
    status: 'Completed',
    date: '2024-06-12',
  },
  {
    id: 11,
    title: 'Volunteer Coastal Cleanup',
    description: 'Cleaned up coastal areas to raise environmental awareness.',
    image: '/sample/programs/11.jpg',
    category: 'Environmental Activity',
    organization: 'uthyp',
    orgName: 'League of Tourism Students of the Philippines - FAITH Chapter',
    icon: '/logo/uthyp_logo.jpg',
    status: 'Completed',
    date: '2023-09-30',
  },
  {
    id: 12,
    title: 'Gender Sensitivity Workshop',
    description: 'Increased awareness and inclusion through open dialogues.',
    image: '/sample/programs/12.jpg',
    category: 'Workshop',
    organization: 'faips',
    orgName: 'FAITH Psychology Society',
    icon: '/logo/faips_logo.png',
    status: 'Completed',
    date: '2023-07-10',
  },
  {
    id: 13,
    title: 'Barangay Survey and Data Collection',
    description: 'Gathered data to support local policy recommendations.',
    image: '/sample/programs/13.jpg',
    category: 'Community Research',
    organization: 'faiies',
    orgName: 'FAITH Institute of Industrial Engineering Society',
    icon: '/logo/faiies_logo.jpg',
    status: 'Completed',
    date: '2024-10-29',
  },
  {
    id: 14,
    title: 'Mobile Library for Rural Areas',
    description: 'Provided learning resources to far-flung communities.',
    image: '/sample/programs/14.jpg',
    category: 'Educational Outreach',
    organization: 'fabcomms',
    orgName: 'First Asia BA Communication and Multimedia Arts Society',
    icon: '/logo/fabcomms_logo.jpg',
    status: 'Completed',
    date: '2024-10-12',
  },
  {
    id: 15,
    title: 'Circuit Design Fundamentals',
    description: 'Taught students the basics of circuit design and PCB layout.',
    image: '/sample/programs/15.jpg',
    category: 'Technical Training',
    organization: 'faices',
    orgName: 'FAITH Computer Engineering Society',
    icon: '/logo/faices_logo.jpg',
    status: 'Completed',
    date: '2025-06-01',
  },
  {
    id: 16,
    title: 'Energy Efficiency in Modern Homes',
    description: 'Promoted smart energy use and sustainable living.',
    image: '/sample/programs/16.jpg',
    category: 'Seminar',
    organization: 'iiee',
    orgName: 'Institute of Integrated Electrical Engineers of the Philippines - FAITH Student Chapter',
    icon: '/logo/iiee_logo.jpg',
    status: 'Completed',
    date: '2023-10-25',
  },
  {
    id: 17,
    title: 'Cyber Hygiene and Data Privacy',
    description: 'Raised awareness on safe internet practices.',
    image: '/sample/programs/17.jpg',
    category: 'Campaign',
    organization: 'facts',
    orgName: 'FAITH Computer Technology Society',
    icon: '/logo/facts_logo.png',
    status: 'Completed',
    date: '2023-09-21',
  },
  {
    id: 18,
    title: 'Early Childhood Teaching Techniques',
    description: 'Empowered aspiring educators with effective strategies.',
    image: '/sample/programs/18.jpg',
    category: 'Training',
    organization: 'ftl',
    orgName: "FAITH Teachers' League",
    icon: '/logo/ftl_logo.jpg',
    status: 'Completed',
    date: '2023-12-04',
  },
  {
    id: 19,
    title: 'Digital Design Exhibit',
    description: 'Showcased student work in graphic and multimedia design.',
    image: '/sample/programs/19.jpg',
    category: 'Exhibit',
    organization: 'fabcomms',
    orgName: 'First Asia BA Communication and Multimedia Arts Society',
    icon: '/logo/fabcomms_logo.jpg',
    status: 'Completed',
    date: '2024-02-15',
  },
  {
    id: 20,
    title: 'Wellness Through Art Therapy',
    description: 'Take a break and breathe through art. This wellness activity invited students to relax, express themselves, and find calm through simple, guided art sessions.',
    image: '/sample/programs/20.jpg',
    category: 'Wellness Activity',
    organization: 'faips',
    orgName: 'FAITH Psychology Society',
    icon: '/logo/faips_logo.png',
    status: 'Active',
    date: '2025-01-18',
  },
  {
    id: 21,
    title: 'Entrepreneurship Crash Course',
    description: 'Encouraged innovation and startup thinking among students.',
    image: '/sample/programs/21.jpg',
    category: 'Business Workshop',
    organization: 'jmap',
    orgName: 'Junior Managers Association of the Philippines',
    icon: '/logo/jmap_logo.jpg',
    status: 'Completed',
    date: '2023-11-09',
  },
  {
    id: 22,
    title: 'Community Safety Patrol Training',
    description: 'Trained volunteers for disaster response and basic security.',
    image: '/sample/programs/22.jpg',
    category: 'Public Service',
    organization: 'fapss',
    orgName: 'FAITH Public Safety Society',
    icon: '/logo/fapss_logo.jpg',
    status: 'Completed',
    date: '2024-02-20',
  },
  {
    id: 23,
    title: 'Healthy Living and Nutrition Talk',
    description: 'An engaging talk that shared practical tips on healthy eating, smart meal planning, and building better daily habits for a healthier lifestyle.',
    image: '/sample/programs/23.jpg',
    category: 'Health Seminar',
    organization: 'fahss',
    orgName: 'FAITH Allied Health Sciences Society',
    icon: '/logo/fahss_logo.jpg',
    status: 'Active',
    date: '2025-03-12',
  },
];

const CARDS_PER_PAGE = 6;

export default function ProgramsPage() {
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (term) => {
    setIsLoading(true);
    setCurrentPage(1);
    await new Promise((res) => setTimeout(res, 500));
    setSubmittedSearch(term);
    setIsLoading(false);
  };

  const filteredProjects = useMemo(() => {
    let result = [...mockProjects];

    if (filter !== 'All') {
      result = result.filter((proj) => proj.status === filter);
    }

    if (submittedSearch.trim() !== '') {
      result = result.filter((proj) =>
        proj.title.toLowerCase().includes(submittedSearch.toLowerCase()) ||
        proj.description.toLowerCase().includes(submittedSearch.toLowerCase())
      );
    }

    result.sort((a, b) => {
      if (sort === 'Newest') return new Date(b.date) - new Date(a.date);
      return new Date(a.date) - new Date(b.date);
    });

    return result;
  }, [submittedSearch, filter, sort]);

  const totalPages = Math.ceil(filteredProjects.length / CARDS_PER_PAGE);
  const currentProjects = filteredProjects.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  return (
    <>
      <PageBanner
        title="Programs and Services"
        backgroundImage="/sample/sample2.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { label: 'Programs and Services' },
        ]}
      />

      <SearchAndFilterBar
        onSearch={handleSearch}
        onSortChange={setSort}
        onFilterChange={(value) => {
          setFilter(value);
          setCurrentPage(1);
        }}
      />

      <OrgLinks />

      <section className={styles.projectSection}>
        {submittedSearch.trim() !== '' && !isLoading && (
          <div className={styles.projectHeader}>
            <h2>{filteredProjects.length} Projects Found</h2>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loaderWrapper}>
            <span className={styles.loader}></span>
          </div>
        ) : (
          <>
            <div className={styles.projectGrid}>
              {currentProjects.map((project) => (
                <ProgramCard key={project.id} project={project} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>
    </>
  );
}