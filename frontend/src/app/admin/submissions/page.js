'use client';

import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaChevronDown } from 'react-icons/fa';
import styles from '../styles/submissions.module.css';

import SubmissionTable from './components/SubmissionTable';
import SubmissionModal from './components/SubmissionModal';
import CancelConfirmationModal from './components/CancelConfirmationModal';

import { useGetSubmissionsQuery, useCancelSubmissionMutation, useUpdateSubmissionMutation } from '@/rtk/admin/submissionApi';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // Using test admin ID 1 - in production this would come from auth context
  const { data, error, isLoading, refetch } = useGetSubmissionsQuery(1);
  const [cancelSubmission] = useCancelSubmissionMutation();
  const [updateSubmission] = useUpdateSubmissionMutation();

  useEffect(() => {
    if (data) {
      // Only show pending submissions
      const pendingSubmissions = data.filter(submission => submission.status === 'pending');
      setSubmissions(pendingSubmissions);
      setFilteredSubmissions(pendingSubmissions);
    }
  }, [data]);

  useEffect(() => {
    let result = [...submissions];
    if (searchInput.trim()) {
      result = result.filter(item =>
        item.section.toLowerCase().includes(searchInput.toLowerCase())
      );
    }
    result.sort((a, b) => {
      const dateA = new Date(a.submitted_at);
      const dateB = new Date(b.submitted_at);
      return sortOrder === 'Newest' ? dateB - dateA : dateA - dateB;
    });
    setFilteredSubmissions(result);
  }, [searchInput, sortOrder, submissions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCancel = async (id) => {
    try {
      await cancelSubmission(id).unwrap();
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setFilteredSubmissions(prev => prev.filter(s => s.id !== id));
      setCancelTargetId(null);
    } catch (error) {
      console.error('Failed to cancel submission:', error);
    }
  };

  const handleEdit = (submission) => {
    setSelected(submission);
    setIsEditing(true);
  };

  const handleSave = async (editedData, formData) => {
    try {
      const result = await updateSubmission({
        id: selected.id,
        data: formData
      }).unwrap();
      
      // Update the local state and selected submission with the new data
      const updatedSubmission = {
        ...selected,
        proposed_data: typeof result.proposed_data === 'string'
          ? result.proposed_data
          : JSON.stringify(result.proposed_data)
      };
      
      setSelected(updatedSubmission);
      setSubmissions(prev => prev.map(sub => 
        sub.id === selected.id ? updatedSubmission : sub
      ));
      setFilteredSubmissions(prev => prev.map(sub => 
        sub.id === selected.id ? updatedSubmission : sub
      ));
    } catch (error) {
      console.error('Failed to save submission:', error);
    }
  };

  const handleSubmit = async (editedData, formData) => {
    try {
      const result = await updateSubmission({
        id: selected.id,
        data: formData
      }).unwrap();
      
      // Update the local state with the new data
      setSubmissions(prev => prev.map(sub => 
        sub.id === selected.id 
          ? { 
              ...sub, 
              proposed_data: typeof result.proposed_data === 'string' 
                ? result.proposed_data 
                : JSON.stringify(result.proposed_data)
            } 
          : sub
      ));
      
      // Close the modal and refresh the data to ensure we have the latest state
      setSelected(null);
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Failed to update submission:', error);
    }
  };

  const selectSort = (value) => {
    setSortOrder(value);
    setShowSortDropdown(false);
  };

  return (
    <section className={styles.container}>
      <div className={styles.headerSection}>
        <h2 className={styles.heading}>My Submissions</h2>
        <p className={styles.subheading}>
          Track your pending updates. Approved or rejected submissions will be automatically removed.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by section..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchBar}
          />
        </div>

        <div className={styles.dropdownWrapper} ref={sortRef}>
          <button
            className={`${styles.dropdownTrigger} ${sortOrder !== 'Newest' ? styles.activeDropdown : ''}`}
            onClick={() => {
              setShowSortDropdown(!showSortDropdown);
            }}
          >
            <span>{sortOrder}</span>
            <FaChevronDown className={styles.dropdownIcon} />
          </button>
          {showSortDropdown && (
            <div className={styles.dropdownMenu}>
              {['Newest', 'Oldest'].map((option) => (
                <div key={option} onClick={() => selectSort(option)}>{option}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && <p>Loading submissions...</p>}
      {error && <p>Error loading submissions: {error.message}</p>}
      {!isLoading && !error && filteredSubmissions.length === 0 && (
        <p className={styles.noSubmissions}>No pending submissions found.</p>
      )}

      <SubmissionTable
        submissions={filteredSubmissions}
        onView={(submission) => {
          setSelected(submission);
          setIsEditing(false);
        }}
        onEdit={handleEdit}
        onCancel={(id) => setCancelTargetId(id)}
      />

      {selected && (
        <SubmissionModal
          submission={selected}
          isEditing={isEditing}
          onClose={() => {
            setSelected(null);
            setIsEditing(false);
          }}
          onSubmit={handleSubmit}
          onSave={handleSave}
        />
      )}

      {cancelTargetId && (
        <CancelConfirmationModal
          onConfirm={() => handleCancel(cancelTargetId)}
          onClose={() => setCancelTargetId(null)}
        />
      )}
    </section>
  );
}
