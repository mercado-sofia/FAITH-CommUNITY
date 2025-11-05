'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './programs.module.css';
import Loader from '../../../components/ui/Loader/Loader';
import { PageBanner, Pagination } from '../components';
import { SearchAndFilterBar, OrgLinks, ProgramCard } from './components';
import { usePublicPrograms } from '../hooks/usePublicData';
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';
import { getProgramStatusByDates } from '@/utils/programStatusUtils';

const CARDS_PER_PAGE = 6;

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

  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader('programs');

  // Use SWR hook for data fetching with caching
  const { programs, isLoading: dataLoading, error } = usePublicPrograms();


  // Sync submittedSearch with URL parameters
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== submittedSearch) {
      setSubmittedSearch(urlSearch);
    }
  }, [searchParams, submittedSearch]);

  // Update URL when filter, sort, or page changes (but not for search)
  useEffect(() => {
    const params = new URLSearchParams();
    if (submittedSearch.trim()) params.set('search', submittedSearch);
    if (filter !== 'All') params.set('filter', filter);
    if (sort !== 'Newest') params.set('sort', sort);
    if (currentPage !== 1) params.set('page', currentPage.toString());

    const query = params.toString();
    const newUrl = `/programs${query ? `?${query}` : ''}`;
    
    // Only update URL if it's different to avoid infinite loops
    if (window.location.pathname + window.location.search !== newUrl) {
      router.push(newUrl);
    }
  }, [filter, sort, currentPage, router, submittedSearch]);

  const handleSearch = (term) => {
    setCurrentPage(1);
    
    // Update URL immediately - this will trigger the useEffect to update submittedSearch
    const params = new URLSearchParams();
    if (term.trim()) params.set('search', term);
    if (filter !== 'All') params.set('filter', filter);
    if (sort !== 'Newest') params.set('sort', sort);
    
    const query = params.toString();
    router.push(`/programs${query ? `?${query}` : ''}`);
  };

  const handlePageChange = (page) => {
    setIsLoading(true);
    setCurrentPage(page);

    // Scroll to top of results section
    setTimeout(() => {
      const section = document.getElementById('projectSection');
      if (section) {
        const offset = 100;
        const y = section.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
      setIsLoading(false);
    }, 100);
  };


  const filteredProjects = useMemo(() => {
    let result = [...programs];

    if (filter !== 'All') {
      result = result.filter((proj) => {
        // Use the same date-based status calculation as program details
        const calculatedStatus = getProgramStatusByDates(proj);
        return calculatedStatus === filter;
      });
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

  if (pageLoading || !pageReady || dataLoading) return <Loader small centered />;

  return (
    <>
      <PageBanner
        title="Programs and Services"
        backgroundImage="/samples/sample2.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { label: 'Programs and Services' },
        ]}
      />

      <SearchAndFilterBar
        onSearch={handleSearch}
        onSortChange={(newSort) => {
          setSort(newSort);
          setCurrentPage(1);
        }}
        onFilterChange={(newFilter) => {
          setFilter(newFilter);
          setCurrentPage(1);
        }}
        initialSearchTerm={initialSearch}
        initialFilter={initialFilter}
        initialSort={initialSort}
      />

      <OrgLinks />

      <section id="projectSection" className={styles.projectSection}>
        {error ? (
          <div className={styles.errorMessage}>
            <p>Error loading programs: {error.message}</p>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            {submittedSearch.trim() !== '' && (
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