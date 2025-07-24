'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './programs.module.css';
import { FaSearch, FaTrash, FaEdit } from 'react-icons/fa';
import AddProjectModal from './components/AddProjectModal';
import EditProjectModal from './components/EditProjectModal';

export default function ProgramsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch projects from the database
  const fetchProjects = async () => {
    try {
      console.log('Attempting to fetch projects...');
      
      // Try the main endpoint first
      let response = await fetch('http://localhost:8080/api/admin/project', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // If main endpoint fails, try the test endpoint
      if (!response.ok) {
        console.log('Main endpoint failed, trying test endpoint...');
        response = await fetch('http://localhost:8080/projects-test', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched data:', data);
      
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', typeof data);
        setProjects([]);
        return;
      }

      setProjects(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async (formData) => {
    try {
      const response = await fetch('http://localhost:8080/api/admin/project', {
        method: 'POST',
        body: formData, // FormData will automatically set the correct Content-Type
      });

      if (!response.ok) {
        throw new Error('Failed to add project');
      }

      setIsModalOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project. Please try again.');
    }
  };

  const handleUpdateProject = async (formData) => {
    try {
      const response = await fetch(`http://localhost:8080/api/admin/project/${formData.get('id')}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`http://localhost:8080/api/admin/project/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Refresh the projects list
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h2 className={styles.heading}>Featured Projects</h2>
        <p className={styles.subheading}>
          Manage all projects that were already approved and posted to your public page.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <FaSearch className={styles.searchIcon} />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.statusFilter}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>

        <button 
          onClick={() => setIsModalOpen(true)}
          className={styles.addButton}
        >
          Add Project
        </button>
      </div>

      <div className={styles.projectGrid}>
        {filteredProjects.map((project) => (
          <div key={project.id} className={styles.projectCard}>
            {project.image && (
              <div className={styles.imageContainer}>
                <img
                  src={project.image}
                  alt={project.title}
                  className={styles.projectImage}
                />
              </div>
            )}
            <div className={styles.projectContent}>
              <h3 className={styles.projectTitle}>{project.title}</h3>
              <p className={styles.projectDescription}>{project.description}</p>
              
              <div className={styles.projectMeta}>
                <span className={`${styles.statusBadge} ${styles[project.status]}`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
                
                {project.completed_date && (
                  <span className={styles.completedDate}>
                    Completed: {new Date(project.completed_date).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className={styles.actionButtons}>
                <button
                  onClick={() => setEditingProject(project)}
                  className={styles.editButton}
                  disabled={isDeleting}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className={styles.deleteButton}
                  disabled={isDeleting}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <AddProjectModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddProject}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleUpdateProject}
        />
      )}
    </div>
  );
}