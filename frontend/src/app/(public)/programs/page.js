'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './programs.module.css';
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import SearchAndFilterBar from './components/SearchAndFilterBar';
import OrgLinks from './components/OrgLinks';
import ProgramCard from './components/ProgramCard';
import Pagination from './components/Pagination';

const CARDS_PER_PAGE = 6;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
let hasVisited = false;

export default function ProgramsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams.get('search') || '';
  const initialFilter = searchParams.get('filter') || 'All';
  const initialSort = searchParams.get('sort') || 'Newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!hasVisited);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchPrograms = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/programs`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPrograms(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch programs');
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
      setError(error.message);
      setPrograms([]);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (!hasVisited && typeof window !== 'undefined') {
      hasVisited = true;
      timerRef.current = setTimeout(() => {
        setInitialLoading(false);
      }, 1000);
    } else {
      setInitialLoading(false);
    }

    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (submittedSearch.trim()) params.set('search', submittedSearch);
    if (filter !== 'All') params.set('filter', filter);
    if (sort !== 'Newest') params.set('sort', sort);
    if (currentPage !== 1) params.set('page', currentPage.toString());

    const query = params.toString();
    router.push(`/programs${query ? `?${query}` : ''}`);
  }, [submittedSearch, filter, sort, currentPage, router]);

  const handleSearch = async (term) => {
    const controller = new AbortController();
    setIsLoading(true);
    setCurrentPage(1);
    await new Promise((res) => setTimeout(res, 500));
    setSubmittedSearch(term);
    setIsLoading(false);
    return () => controller.abort();
  };

  const handlePageChange = async (page) => {
    const controller = new AbortController();
    setIsLoading(true);
    setCurrentPage(page);
    await new Promise((res) => setTimeout(res, 300));

    const section = document.getElementById('projectSection');
    if (section) {
      const offset = 100;
      const y = section.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    setIsLoading(false);
    return () => controller.abort();
  };

  const filteredProjects = useMemo(() => {
    let result = [...programs];

    if (filter !== 'All') {
      result = result.filter((proj) => proj.status === filter);
    }

    if (submittedSearch.trim() !== '') {
      result = result.filter((proj) =>
        proj.title.toLowerCase().includes(submittedSearch.toLowerCase()) ||
        proj.description.toLowerCase().includes(submittedSearch.toLowerCase()) ||
        proj.orgName?.toLowerCase().includes(submittedSearch.toLowerCase()) ||
        proj.category?.toLowerCase().includes(submittedSearch.toLowerCase())
      );
    }

    result.sort((a, b) => {
      if (sort === 'Newest') return new Date(b.date || b.created_at) - new Date(a.date || a.created_at);
      return new Date(a.date || a.created_at) - new Date(b.date || b.created_at);
    });

    return result;
  }, [programs, submittedSearch, filter, sort]);

  const calculateTotalPages = (projects) => {
    return Math.ceil(projects.length / CARDS_PER_PAGE);
  };

  const totalPages = calculateTotalPages(filteredProjects);
  const currentProjects = filteredProjects.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  if (initialLoading) return <Loader small />;

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
        onFilterChange={setFilter}
        initialSearchTerm={initialSearch}
        initialFilter={initialFilter}
        initialSort={initialSort}
      />

      <OrgLinks />

      <section id="projectSection" className={styles.projectSection}>
        {error ? (
          <div className={styles.errorMessage}>
            <p>Error loading programs: {error}</p>
            <button onClick={fetchPrograms} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            {submittedSearch.trim() !== '' && !isLoading && (
              <div className={styles.projectHeader}>
                <h2>{filteredProjects.length} Programs Found</h2>
              </div>
            )}

            {isLoading ? (
              <div className={styles.loaderWrapper}>
                <span className={styles.loader}></span>
              </div>
            ) : (
              <>
                {filteredProjects.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No programs found{submittedSearch.trim() ? ' matching your search' : ''}.</p>
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
                      onPageChange={handlePageChange}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}