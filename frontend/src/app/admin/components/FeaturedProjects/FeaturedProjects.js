'use client';

import { useState, useRef, useEffect } from 'react';
import styles from '../../programs/styles/programs.module.css';
import { FaSearch, FaChevronDown } from 'react-icons/fa';
import AddProjectModal from '../../programs/components/AddProjectModal';
import EditProjectModal from '../../programs/components/EditProjectModal';
import {
  useGetFeaturedProjectsQuery,
  useAddFeaturedProjectMutation,
  useUpdateFeaturedProjectMutation,
  useDeleteFeaturedProjectMutation,
} from '../../../../rtk/admin/featuredProjectsApi';

export default function FeaturedProjects() {
  const { data: projects, isLoading } = useGetFeaturedProjectsQuery();
  const [addProject] = useAddFeaturedProjectMutation();
  const [updateProject] = useUpdateFeaturedProjectMutation();
  const [deleteProject] = useDeleteFeaturedProjectMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filter, setFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectFilter = (option) => {
    setFilter(option);
    setShowFilterDropdown(false);
  };

  const filteredProjects = projects?.filter((proj) => {
    const matchesFilter = filter === "All" || proj.status === filter;
    const matchesSearch = proj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          proj.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleEdit = (project) => {
    setEditingProject(project);
  };

  const handleAddProject = async (projectData) => {
    try {
      await addProject(projectData).unwrap();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to add project:', error);
      alert('Failed to add project. Please try again.');
    }
  };

  const handleUpdateProject = async ({ project_id, previous, proposed }) => {
    try {
      await updateProject({ 
        id: project_id,
        ...proposed
      }).unwrap();
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h2 className={styles.heading}>Featured Projects</h2>
        <p className={styles.subheading}>
          Manage all projects that were already approved and posted to your public page.
        </p>
      </div>

      <div className={styles.topControls}>
        <div className={styles.searchBarWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.dropdownWrapper} ref={dropdownRef}>
          <button
            className={`${styles.dropdownTrigger} ${filter !== 'All' ? styles.activeDropdown : ''}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <span>{filter === "Ongoing" ? "Active" : filter}</span>
            <FaChevronDown className={styles.dropdownIcon} />
          </button>
          {showFilterDropdown && (
            <div className={styles.dropdownMenu}>
              {['All', 'Ongoing', 'Completed'].map((option) => (
                <div key={option} onClick={() => selectFilter(option)}>
                  {option === "Ongoing" ? "Active" : option}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
          Add Project
        </button>
      </div>

      <div className={styles.projectList}>
        {filteredProjects?.map((proj) => (
          <div key={proj.id} className={styles.projectCard}>
            {proj.image && (
              <img
                src={proj.image}
                alt={proj.title}
                className={styles.projectImage}
              />
            )}
            <div className={styles.projectContent}>
              <h3>{proj.title}</h3>
              <p className={styles.desc}>{proj.description}</p>

              {proj.completed_date && (
                <p className={styles.completedDate}>
                  Completed on: {new Date(proj.completed_date).toLocaleDateString()}
                </p>
              )}

              <div
                className={`${styles.statusBadge} ${
                  proj.status === "completed" ? styles.completed : styles.active
                }`}
              >
                {proj.status === "completed" ? "Completed" : "Active"}
              </div>

              <button className={styles.editBtn} onClick={() => handleEdit(proj)}>
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <AddProjectModal onClose={() => setIsModalOpen(false)} onSave={handleAddProject} />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onProposeUpdate={handleUpdateProject}
        />
      )}
    </div>
  );
}
