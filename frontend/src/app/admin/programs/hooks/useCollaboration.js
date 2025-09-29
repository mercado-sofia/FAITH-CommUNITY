import { useState, useEffect, useCallback } from 'react';
import { fetchAvailableAdmins, addCollaboratorToProgram, removeCollaboratorFromProgram, fetchProgramCollaborators } from '../services/collaborationService';

export const useCollaboration = (isEditMode = false, programId = null) => {
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [selectedAdminIndex, setSelectedAdminIndex] = useState(-1);
  const [selectedAdminForInvite, setSelectedAdminForInvite] = useState(null);

  // Fetch available admins
  const loadAvailableAdmins = useCallback(async () => {
    try {
      const admins = await fetchAvailableAdmins(isEditMode, programId);
      setAvailableAdmins(admins);
    } catch (error) {
      // Handle error silently in production
    }
  }, [isEditMode, programId]);

  // Load available admins on mount
  useEffect(() => {
    loadAvailableAdmins();
  }, [loadAvailableAdmins]);

  // Load existing collaborators for edit mode
  const loadExistingCollaborators = useCallback(async (setCollaborators) => {
    if (isEditMode && programId) {
      try {
        const collaborators = await fetchProgramCollaborators(programId);
        // Normalize the data structure to match what the form expects
        const normalizedCollaborators = collaborators.map(collab => ({
          id: collab.admin_id || collab.id,
          email: collab.email,
          organization_name: collab.organization_name,
          organization_acronym: collab.organization_acronym,
          status: collab.status
        }));
        setCollaborators(normalizedCollaborators);
      } catch (error) {
        // Set empty array on error to prevent crashes
        setCollaborators([]);
      }
    }
  }, [isEditMode, programId]);

  // Refresh collaborators (useful when someone opts out)
  const refreshCollaborators = useCallback(async (setCollaborators) => {
    if (isEditMode && programId) {
      try {
        const collaborators = await fetchProgramCollaborators(programId);
        // Normalize the data structure to match what the form expects
        const normalizedCollaborators = collaborators.map(collab => ({
          id: collab.admin_id || collab.id,
          email: collab.email,
          organization_name: collab.organization_name,
          organization_acronym: collab.organization_acronym,
          status: collab.status
        }));
        setCollaborators(normalizedCollaborators);
      } catch (error) {
        // Set empty array on error to prevent crashes
        setCollaborators([]);
      }
    }
  }, [isEditMode, programId]);

  // Select admin from autocomplete
  const selectAdmin = useCallback((admin) => {
    setSelectedAdminForInvite(admin);
    setCollaboratorInput(`${admin.email} (${admin.organization_acronym})`);
    setFilteredAdmins([]);
    setSelectedAdminIndex(-1);
  }, []);

  // Handle collaborator input change
  const handleCollaboratorInputChange = useCallback((e) => {
    const value = e.target.value;
    setCollaboratorInput(value);
    setSelectedAdminIndex(-1);
    setSelectedAdminForInvite(null);

    if (value.trim()) {
      const filtered = availableAdmins.filter(admin => 
        admin.email.toLowerCase().includes(value.toLowerCase()) ||
        admin.organization_acronym.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAdmins(filtered);
    } else {
      setFilteredAdmins([]);
    }
  }, [availableAdmins]);

  // Handle keyboard navigation in autocomplete
  const handleCollaboratorInputKeyDown = useCallback((e) => {
    if (filteredAdmins.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAdminIndex(prev => 
          prev < filteredAdmins.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAdminIndex(prev => 
          prev > 0 ? prev - 1 : filteredAdmins.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedAdminIndex >= 0 && selectedAdminIndex < filteredAdmins.length) {
          selectAdmin(filteredAdmins[selectedAdminIndex]);
        }
        break;
      case 'Escape':
        setFilteredAdmins([]);
        setSelectedAdminIndex(-1);
        setCollaboratorInput('');
        break;
    }
  }, [filteredAdmins, selectedAdminIndex, selectAdmin]);

  // Clear collaborator input
  const clearCollaboratorInput = useCallback(() => {
    setCollaboratorInput('');
    setSelectedAdminForInvite(null);
    setFilteredAdmins([]);
    setSelectedAdminIndex(-1);
  }, []);

  // Add collaborator to list
  const addCollaborator = useCallback(async (collaborators, setCollaborators) => {
    if (!selectedAdminForInvite) return;

    // Ensure collaborators is an array
    const collaboratorsArray = Array.isArray(collaborators) ? collaborators : [];

    const isAlreadyAdded = collaboratorsArray.some(
      collab => collab.id === selectedAdminForInvite.id
    );

    if (isAlreadyAdded) {
      clearCollaboratorInput();
      return;
    }

    if (isEditMode && programId) {
      // For edit mode, call the backend API
      try {
        await addCollaboratorToProgram(programId, selectedAdminForInvite.id);
        // Add to local state for immediate UI update
        const newCollaborators = [...collaboratorsArray, selectedAdminForInvite];
        setCollaborators(newCollaborators);
      } catch (error) {
        throw error;
      }
    } else {
      // For create mode, just update local state
      const newCollaborators = [...collaboratorsArray, selectedAdminForInvite];
      setCollaborators(newCollaborators);
    }

    clearCollaboratorInput();
  }, [selectedAdminForInvite, clearCollaboratorInput, isEditMode, programId]);

  // Remove collaborator from list
  const removeCollaborator = useCallback(async (index, collaborators, setCollaborators) => {
    const collaboratorsArray = Array.isArray(collaborators) ? collaborators : [];
    const collaboratorToRemove = collaboratorsArray[index];
    
    if (!collaboratorToRemove) return;

    if (isEditMode && programId) {
      // For edit mode, call the backend API
      try {
        await removeCollaboratorFromProgram(programId, collaboratorToRemove.id);
        // Remove from local state for immediate UI update
        const newCollaborators = collaboratorsArray.filter((_, i) => i !== index);
        setCollaborators(newCollaborators);
      } catch (error) {
        throw error;
      }
    } else {
      // For create mode, just update local state
      const newCollaborators = collaboratorsArray.filter((_, i) => i !== index);
      setCollaborators(newCollaborators);
    }
  }, [isEditMode, programId]);

  return {
    // State
    collaboratorInput,
    availableAdmins,
    filteredAdmins,
    selectedAdminIndex,
    selectedAdminForInvite,
    
    // Actions
    handleCollaboratorInputChange,
    handleCollaboratorInputKeyDown,
    selectAdmin,
    clearCollaboratorInput,
    addCollaborator,
    removeCollaborator,
    loadAvailableAdmins,
    loadExistingCollaborators,
    refreshCollaborators,
    
    // Setters
    setCollaboratorInput,
    setAvailableAdmins,
    setFilteredAdmins,
    setSelectedAdminIndex,
    setSelectedAdminForInvite
  };
};
