'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import SubmissionTable from './components/SubmissionTable';
import styles from './submissions.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admin = useSelector((state) => state.admin.admin);
  const orgAcronym = admin?.org;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('filter') ? capitalizeFirstLetter(searchParams.get('filter')) : 'All status'
  );
  const [sortOrder, setSortOrder] = useState(
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest'
  );
  const [sectionFilter, setSectionFilter] = useState(
    searchParams.get('section') ? capitalizeFirstLetter(searchParams.get('section')) : 'All Sections'
  );
  const [showCount, setShowCount] = useState(
    parseInt(searchParams.get('show')) || 10
  );

  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  const fetchSubmissions = useCallback(async () => {
    if (!orgAcronym) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/submissions/${orgAcronym}`);
      const data = await res.json();
      
      // Handle different response formats
      if (data.success && Array.isArray(data.data)) {
        setSubmissions(data.data);
      } else if (Array.isArray(data)) {
        setSubmissions(data);
      } else {
        console.error('Unexpected data format:', data);
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [orgAcronym]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (statusFilter.toLowerCase() !== 'all status') {
      params.set('filter', statusFilter.toLowerCase());
    }

    if (sortOrder && sortOrder !== 'latest') {
      params.set('sort', sortOrder);
    }

    if (sectionFilter.toLowerCase() !== 'all sections') {
      params.set('section', sectionFilter.toLowerCase());
    }

    if (showCount && showCount !== 10) {
      params.set('show', showCount.toString());
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, statusFilter, sortOrder, sectionFilter, showCount]);

  const filteredSubmissions = useMemo(() => {
    const filtered = submissions.filter((submission) => {
      const matchesSearch =
        submission.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(submission.submitted_at).toLocaleDateString().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter.toLowerCase() === 'all status' ||
        submission.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesSection =
        sectionFilter === 'All Sections' || 
        submission.section.toLowerCase() === sectionFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSection;
    });

    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.submitted_at);
      const dateB = new Date(b.submitted_at);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

    return sorted.slice(0, showCount);
  }, [submissions, searchQuery, statusFilter, sectionFilter, showCount, sortOrder]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Submissions</h1>
      </div>

      <SearchAndFilterControls
        showCount={showCount}
        onShowCountChange={(value) => setShowCount(parseInt(value))}
        sectionFilter={sectionFilter}
        onSectionFilterChange={setSectionFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <SubmissionTable 
        orgAcronym={orgAcronym} 
        submissions={filteredSubmissions}
        loading={loading}
        onRefresh={fetchSubmissions}
      />
    </div>
  );
}