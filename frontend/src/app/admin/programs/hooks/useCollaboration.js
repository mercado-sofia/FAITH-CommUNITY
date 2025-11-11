import { useState, useEffect, useCallback } from 'react';
import { fetchAvailableAdmins, addCollaboratorToProgram, removeCollaboratorFromProgram, fetchProgramCollaborators } from '../services/collaborationService';

export const useCollaboration = (isEditMode = false, programId = null) => {
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [selectedAdminIndex, setSelectedAdminIndex] = useState(-1);
  const [selectedAdminForInvite, setSelectedAdminForInvite] = useState(null);
  const [existingCollaboratorIds, setExistingCollaboratorIds] = useState(new Set());

  // Fetch available admins
  const loadAvailableAdmins = useCallback(async () => {
    try {
      const admins = await fetchAvailableAdmins(isEditMode, programId);
      setAvailableAdmins(admins);
    } catch (error) {
      setAvailableAdmins([]); // Set empty array on error
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
        // Track existing collaborator IDs so we can identify new ones later
        const existingIds = new Set(normalizedCollaborators.map(c => c.id));
        setExistingCollaboratorIds(existingIds);
        setCollaborators(normalizedCollaborators);
      } catch (error) {
        // Set empty array on error to prevent crashes
        setExistingCollaboratorIds(new Set());
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
    const email = admin.email || '';
    const orgAcronym = admin.organization_acronym || 'Unknown Org';
    setCollaboratorInput(`${email} (${orgAcronym})`);
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
      const filtered = availableAdmins.filter(admin => {
        const email = admin.email?.toLowerCase() || '';
        const orgAcronym = admin.organization_acronym?.toLowerCase() || '';
        const searchValue = value.toLowerCase();
        
        return email.includes(searchValue) || orgAcronym.includes(searchValue);
      });
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

    // For both create and edit modes, just update local state
    // In Edit mode, invites will be sent when user saves the form
    // In Create mode, invites will be sent during submission approval process
    const collaboratorWithStatus = {
      ...selectedAdminForInvite,
      status: 'pending' // Always pending - requires acceptance
    };
    const newCollaborators = [...collaboratorsArray, collaboratorWithStatus];
    setCollaborators(newCollaborators);

    clearCollaboratorInput();
  }, [selectedAdminForInvite, clearCollaboratorInput]);

  // Remove collaborator from list
  const removeCollaborator = useCallback(async (index, collaborators, setCollaborators) => {
    const collaboratorsArray = Array.isArray(collaborators) ? collaborators : [];
    const collaboratorToRemove = collaboratorsArray[index];
    
    if (!collaboratorToRemove) return;

    if (isEditMode && programId) {
      // Check if this collaborator exists in the database (was already saved)
      const wasExisting = existingCollaboratorIds.has(collaboratorToRemove.id);
      
      if (wasExisting) {
        // Only call API if collaborator exists in database
        try {
          await removeCollaboratorFromProgram(programId, collaboratorToRemove.id);
          // Update existingCollaboratorIds to remove this ID
          setExistingCollaboratorIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(collaboratorToRemove.id);
            return newSet;
          });
        } catch (error) {
          throw error;
        }
      }
      // If it wasn't existing (newly added, not yet saved), just remove from local state
      // Remove from local state for immediate UI update
      const newCollaborators = collaboratorsArray.filter((_, i) => i !== index);
      setCollaborators(newCollaborators);
    } else {
      // For create mode, just update local state
      const newCollaborators = collaboratorsArray.filter((_, i) => i !== index);
      setCollaborators(newCollaborators);
    }
  }, [isEditMode, programId, existingCollaboratorIds]);

  // Reset collaboration state
  const resetCollaboration = useCallback(() => {
    setCollaboratorInput('');
    setFilteredAdmins([]);
    setSelectedAdminIndex(-1);
    setSelectedAdminForInvite(null);
    setExistingCollaboratorIds(new Set());
  }, []);

  // Get newly added collaborators (for Edit mode - to send invites on save)
  const getNewCollaborators = useCallback((collaborators) => {
    if (!isEditMode || !programId) return [];
    const collaboratorsArray = Array.isArray(collaborators) ? collaborators : [];
    return collaboratorsArray.filter(collab => 
      collab.id && !existingCollaboratorIds.has(collab.id)
    );
  }, [isEditMode, programId, existingCollaboratorIds]);

  // Send invites for newly added collaborators (called on save in Edit mode)
  const sendInvitesForNewCollaborators = useCallback(async (collaborators) => {
    if (!isEditMode || !programId) return;
    
    const newCollaborators = getNewCollaborators(collaborators);
    if (newCollaborators.length === 0) return;

    // Send invites for each newly added collaborator
    const invitePromises = newCollaborators.map(collab => 
      addCollaboratorToProgram(programId, collab.id).catch(error => {
        console.error(`Failed to invite collaborator ${collab.id}:`, error);
        return null; // Continue with other invites even if one fails
      })
    );

    await Promise.all(invitePromises);
  }, [isEditMode, programId, getNewCollaborators]);

  return {
    // State
    collaboratorInput,
    availableAdmins,
    filteredAdmins,
    selectedAdminIndex,
    selectedAdminForInvite,
    existingCollaboratorIds,
    
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
    resetCollaboration,
    getNewCollaborators,
    sendInvitesForNewCollaborators,
    
    // Setters
    setCollaboratorInput,
    setAvailableAdmins,
    setFilteredAdmins,
    setSelectedAdminIndex,
    setSelectedAdminForInvite
  };
};
