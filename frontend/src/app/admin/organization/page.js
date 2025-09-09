"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateAdminOrg } from "../../../rtk/superadmin/adminSlice";
import { useAdminOrganization, useAdminAdvocacies, useAdminCompetencies, useAdminHeads } from "../../../hooks/useAdminData";
import { applyRoleHierarchyOrdering } from "./OrgHeads/utils/roleHierarchy";
import { EditModal, OrgInfoSection, SummaryModal } from "./OrgInfo";
import { Section, SectionEditModal, SectionSummaryModal } from "./AdvocacyCompetency";
import { OrgHeadsSection, AddOrgHeadModal, OrgHeadsEditModal } from "./OrgHeads";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import SuccessModal from "../components/SuccessModal";
import SkeletonLoader from '../components/SkeletonLoader';
import pageStyles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Track if organization page has been visited
let hasVisitedOrganization = false;

export default function OrganizationPage() {
  const dispatch = useDispatch();
  const admin = useSelector((state) => state.admin.admin);
  const [pageReady, setPageReady] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(!hasVisitedOrganization);
  
  // Use SWR hooks for data fetching
  const { organization, isLoading: orgLoading, error: orgError, mutate: refreshOrganization } = useAdminOrganization(admin?.org);
  
  // Separate state for edit modal preview (doesn't affect main display)
  const [editPreviewData, setEditPreviewData] = useState(null);

  // Consolidated progressive loading states
  const [sectionStates, setSectionStates] = useState({
    orgInfo: false,
    advocacy: false,
    competency: false,
    orgHeads: false
  });

  // Safeguard: Ensure we have a stable organization ID for the hooks
  const stableOrgId = useMemo(() => {
    return organization?.id || admin?.id;
  }, [organization?.id, admin?.id]);

  // Use stable organization ID for hooks to prevent unnecessary re-runs
  const { advocacies: stableAdvocacies, isLoading: advocaciesLoading, error: advocaciesError, mutate: refreshAdvocacies } = useAdminAdvocacies(stableOrgId);
  const { competencies: stableCompetencies, isLoading: competenciesLoading, error: competenciesError, mutate: refreshCompetencies } = useAdminCompetencies(stableOrgId);
  
  // Lazy load organization heads - only fetch when the section is ready to be displayed
  const { heads: stableHeads, isLoading: headsLoading, error: headsError, mutate: refreshHeads } = useAdminHeads(
    stableOrgId && (sectionStates.orgHeads || !isFirstVisit) ? stableOrgId : null
  );

  // Consolidated data safety check - single useMemo for all arrays
  const safeData = useMemo(() => ({
    advocacies: Array.isArray(stableAdvocacies) ? stableAdvocacies : [],
    competencies: Array.isArray(stableCompetencies) ? stableCompetencies : [],
    heads: Array.isArray(stableHeads) ? stableHeads : []
  }), [stableAdvocacies, stableCompetencies, stableHeads]);

  // Derived state from SWR data, with instant updates from editPreviewData
  const orgData = useMemo(() => {
    if (editPreviewData) {
      return editPreviewData;
    }
    
    if (organization) {
      return {
        id: organization.id,
        logo: organization.logo || "",
        org: admin?.org || "",
        orgName: admin?.orgName || "",
        email: organization.email || admin?.email || "",
        facebook: organization.facebook || "",
        description: organization.description || "",
        orgColor: organization.org_color || "#444444"
      };
    }
    
    return {
      id: null,
      logo: "",
      org: admin?.org || "",
      orgName: admin?.orgName || "",
      email: admin?.email || "",
      facebook: "",
      description: "",
      orgColor: "#444444"
    };
  }, [editPreviewData, organization, admin]);

  const advocacyData = useMemo(() => {
    return safeData.advocacies.length > 0 ? {
      id: safeData.advocacies[0].id,
      advocacy: safeData.advocacies[0].advocacy || ""
    } : {
      id: null,
      advocacy: ""
    };
  }, [safeData.advocacies]);

  const competencyData = useMemo(() => {
    return safeData.competencies.length > 0 ? {
      id: safeData.competencies[0].id,
      competency: safeData.competencies[0].competency || ""
    } : {
      id: null,
      competency: ""
    };
  }, [safeData.competencies]);

  const orgHeadsData = safeData.heads;
  
  // Stabilize orgHeadsData to prevent infinite loops in modal
  const stableOrgHeadsData = useMemo(() => orgHeadsData, [orgHeadsData]);

  // Modal-specific message state
  const [modalMessage, setModalMessage] = useState({ text: "", type: "" });

  // Temporary state for editing advocacy/competency without affecting main display
  const [tempEditData, setTempEditData] = useState({});
  const [reEditSubmissionId, setReEditSubmissionId] = useState(null);

  // Consolidated modal and UI state
  const [uiState, setUiState] = useState({
    isEditing: false,
    showEditModal: false,
    showSectionEditModal: false,
    showAddOrgHeadModal: false,
    showIndividualHeadEditModal: false,
    showDeleteConfirmationModal: false,
    showSummaryModal: false,
    showSectionSummaryModal: false,
    saving: false,
    uploading: false
  });

  const [selectedHeadForEdit, setSelectedHeadForEdit] = useState(null);
  const [selectedHeadForDelete, setSelectedHeadForDelete] = useState(null);
  const [currentSection, setCurrentSection] = useState('');
  const [errors, setErrors] = useState({});
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [originalData, setOriginalData] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  // Memoized skeleton components to prevent unnecessary re-renders
  const skeletonComponents = useMemo(() => ({
    orgInfo: <SkeletonLoader type="orgInfo" />,
    advocacy: <SkeletonLoader type="section" />,
    competency: <SkeletonLoader type="section" />,
    orgHeads: <SkeletonLoader type="orgHeads" count={3} />
  }), []);

  // Combined loading state
  const loading = orgLoading || advocaciesLoading || competenciesLoading || headsLoading || !admin?.org;

  // Consolidated progressive loading logic - single useEffect instead of 4 separate ones
  useEffect(() => {
    if (!loading && !isFirstVisit) {
      const timer = setTimeout(() => {
        setSectionStates({
          orgInfo: true,
          advocacy: true,
          competency: true,
          orgHeads: true
        });
      }, 300); // Single delay instead of multiple progressive delays
      
      return () => clearTimeout(timer);
    }
  }, [loading, isFirstVisit]);

  // Smart loading logic for first visit
  useEffect(() => {
    if (!loading) {
      const extraDelay = isFirstVisit ? 800 : 0; // Reduced from 1000ms to 800ms
      const timer = setTimeout(() => {
        setPageReady(true);
        setSectionStates({
          orgInfo: true,
          advocacy: true,
          competency: true,
          orgHeads: true
        });
        setIsFirstVisit(false);
        hasVisitedOrganization = true;
      }, extraDelay);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isFirstVisit]);

  // Synchronize editPreviewData when organization data changes from SWR
  useEffect(() => {
    if (organization && !editPreviewData && !uiState.isEditing) {
      const syncedData = {
        id: organization.id,
        logo: organization.logo || "",
        org: organization.org || admin?.org || "",
        orgName: organization.orgName || admin?.orgName || "",
        email: organization.email || admin?.email || "",
        facebook: organization.facebook || "",
        description: organization.description || "",
        orgColor: organization.org_color || "#444444"
      };
      setEditPreviewData(syncedData);
    }
  }, [organization, admin, editPreviewData, uiState.isEditing]);

  // Initialize editPreviewData when organization data is first loaded
  useEffect(() => {
    if (organization && !editPreviewData && !loading) {
      const initialData = {
        id: organization.id,
        logo: organization.logo || "",
        org: organization.org || admin?.org || "",
        orgName: organization.orgName || admin?.orgName || "",
        email: organization.email || admin?.email || "",
        facebook: organization.facebook || "",
        description: organization.description || "",
        orgColor: organization.org_color || "#444444"
      };
      setEditPreviewData(initialData);
    }
  }, [organization, editPreviewData, loading, admin]);

  // Helper function to update UI state
  const updateUiState = useCallback((updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);

  const showMessage = (text, type, section = "") => {
    setSuccessModal({ isVisible: true, message: text, type: type });
  };

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };

  const validateForm = () => {
    const newErrors = {};
    const dataToValidate = editPreviewData || orgData;
    
    if (dataToValidate.facebook && !dataToValidate.facebook.includes("facebook.com")) {
      newErrors.facebook = "Please enter a valid Facebook URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle error display
  useEffect(() => {
    if (orgError && admin?.org) {
      console.error("Error fetching organization data:", orgError);
      showMessage("Failed to load organization data", "error");
    }
    if (advocaciesError) {
      console.error("Error fetching advocacy data:", advocaciesError);
    }
    if (competenciesError) {
      console.error("Error fetching competency data:", competenciesError);
    }
    if (headsError) {
      console.error("Error fetching heads data:", headsError);
    }
  }, [orgError, advocaciesError, competenciesError, headsError, admin?.org]);

  // Handle re-edit from submissions page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isReEdit = urlParams.get('reEdit');
    
    if (isReEdit === 'true') {
      const reEditData = sessionStorage.getItem('reEditSubmission');
      if (reEditData) {
        try {
          const submission = JSON.parse(reEditData);
          
          setCurrentSection(submission.section);
          updateUiState({ isEditing: true });
          setReEditSubmissionId(submission.id);
          
          if (submission.section === 'advocacy') {
            setTempEditData({ advocacy: submission.data });
            setOriginalData({ ...advocacyData });
            updateUiState({ showSectionEditModal: true });
          } else if (submission.section === 'competency') {
            setTempEditData({ competency: submission.data });
            setOriginalData({ ...competencyData });
            updateUiState({ showSectionEditModal: true });
          }
          
          sessionStorage.removeItem('reEditSubmission');
          showMessage(`Re-editing ${submission.section} submission`, "info", submission.section);
          
        } catch (error) {
          console.error('Error parsing re-edit data:', error);
          showMessage('Error loading submission for re-edit', "error");
        }
      }
    }
  }, [advocacyData, competencyData, updateUiState]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'email') return;
    
    if (currentSection === 'organization') {
      setEditPreviewData((prev) => {
        const currentData = prev || orgData;
        return { ...currentData, [name]: value };
      });
    } else {
      setTempEditData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setModalMessage({ text: "Please select an image file", type: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalMessage({ text: "File size must be less than 5MB", type: "error" });
      return;
    }

    try {
      updateUiState({ uploading: true });
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadType", "organization-logo");
      
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        // Only update editPreviewData for the modal preview, not the main display
        setEditPreviewData((prev) => ({ 
          ...prev, 
          logo: result.url 
        }));
        setModalMessage({ text: "Logo uploaded successfully", type: "success" });
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Upload error details:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      setModalMessage({ text: `Failed to upload logo: ${error.message}`, type: "error" });
    } finally {
      updateUiState({ uploading: false });
    }
  };

  const handleSave = () => {
    if (currentSection === 'organization') {
      if (!validateForm()) {
        showMessage("Please fix the errors before saving", "error");
        return;
      }

      const currentOrgData = editPreviewData || orgData;
      const hasChanges = originalData && Object.keys(currentOrgData).some((key) => 
        key !== "id" && 
        key !== "email" && 
        key !== "org" && 
        key !== "orgName" && 
        currentOrgData[key] !== originalData[key]
      );

      if (!hasChanges) {
        showMessage("No changes detected", "info");
        updateUiState({ showEditModal: false, isEditing: false });
        setEditPreviewData(null);
        return;
      }

      setPendingChanges({ ...currentOrgData });
      updateUiState({ showEditModal: false });
      updateUiState({ showSummaryModal: true });
    } else if (currentSection === 'orgHeads') {
      handleOrgHeadsSave();
    } else {
      const currentData = currentSection === 'advocacy' ? advocacyData : competencyData;
      const editedData = { ...currentData, ...tempEditData };
      
      if (currentSection === 'advocacy' && editedData.advocacy) {
        editedData.advocacy = editedData.advocacy.trim();
      } else if (currentSection === 'competency' && editedData.competency) {
        editedData.competency = editedData.competency.trim();
      }
      
      const hasChanges = originalData && Object.keys(editedData).some((key) => key !== "id" && editedData[key] !== originalData[key]);

      if (!hasChanges) {
        showMessage("No changes detected", "info", currentSection);
        updateUiState({ showSectionEditModal: false, isEditing: false });
        setTempEditData({});
        return;
      }

      setPendingChanges({ ...editedData });
      updateUiState({ showSectionEditModal: false });
      updateUiState({ showSectionSummaryModal: true });
    }
  };

  const handleConfirmChanges = async () => {
    if (!pendingChanges) return;
    try {
      updateUiState({ saving: true });
      updateUiState({ showSummaryModal: false });
      
      const method = pendingChanges.id ? "PUT" : "POST";
      const url = pendingChanges.id
        ? `${API_BASE_URL}/api/organization/${pendingChanges.id}`
        : `${API_BASE_URL}/api/organization`;

      const requestBody = {
        logo: pendingChanges.logo || "",
        facebook: pendingChanges.facebook || "",
        description: pendingChanges.description || "",
        orgColor: pendingChanges.orgColor || "#444444",
        status: "ACTIVE"
      };

      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(adminToken && { 'Authorization': `Bearer ${adminToken}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
        
      if (result.success) {
        const updatedOrganization = {
          ...(organization || {}),
          ...pendingChanges,
          ...result.data,
          id: result.data?.id || organization?.id || pendingChanges.id,
          logo: pendingChanges.logo || organization?.logo || result.data?.logo || "",
          org: result.data?.org || pendingChanges.org || organization?.org || admin?.org || "",
          orgName: result.data?.orgName || pendingChanges.orgName || organization?.orgName || admin?.orgName || "",
          email: result.data?.email || pendingChanges.email || organization?.email || admin?.email || "",
          facebook: result.data?.facebook || pendingChanges.facebook || organization?.facebook || "",
          description: result.data?.description || pendingChanges.description || organization?.description || "",
          org_color: result.data?.orgColor || pendingChanges.orgColor || organization?.org_color || "#444444"
        };
        
        if (pendingChanges.org && pendingChanges.org !== admin?.org) {
          const cacheUpdateData = {
            ...updatedOrganization,
            logo: updatedOrganization.logo || organization?.logo || ""
          };
          refreshOrganization(cacheUpdateData, false);
        }
        
        setEditPreviewData(updatedOrganization);
        
        if (pendingChanges.org && pendingChanges.org !== admin?.org) {
          dispatch(updateAdminOrg({
            org: pendingChanges.org,
            orgName: pendingChanges.orgName
          }));
        }

        updateUiState({ isEditing: false });
        setPendingChanges(null);
        setOriginalData(null);
        showMessage("Organization information saved successfully", "success");
      } else {
        throw new Error(result.message || "Failed to save organization information");
      }
    } catch (error) {
      console.error('Full error details:', error);
      showMessage(error.message || "Failed to save organization information", "error");
      updateUiState({ showSummaryModal: true });
    } finally {
      updateUiState({ saving: false });
    }
  };

  const handleCancelModal = () => {
    updateUiState({ showSummaryModal: false });
    setPendingChanges(null);
  };

  const handleCancel = () => {
    if (currentSection === 'organization') {
      updateUiState({ showEditModal: false });
      if (!uiState.saving) {
        setEditPreviewData(null);
      }
    } else {
      updateUiState({ showSectionEditModal: false });
    }
    updateUiState({ isEditing: false });
    setErrors({});
    setCurrentSection('');
    setPendingChanges(null);
    setOriginalData(null);
    setTempEditData({});
    setReEditSubmissionId(null);
  };

  const handleSectionConfirmChanges = async () => {
    if (!pendingChanges || !admin?.id) return;
    
    try {
      updateUiState({ saving: true });
      updateUiState({ showSectionSummaryModal: false });
      
      const submissions = [];
      
      if (currentSection === 'advocacy') {
        submissions.push({
          organization_id: orgData.id || admin.id,
          section: 'advocacy',
          previous_data: originalData.advocacy || "",
          proposed_data: (pendingChanges.advocacy || "").trim(),
          submitted_by: admin.id
        });
      } else if (currentSection === 'competency') {
        submissions.push({
          organization_id: orgData.id || admin.id,
          section: 'competency',
          previous_data: originalData.competency || "",
          proposed_data: (pendingChanges.competency || "").trim(),
          submitted_by: admin.id
        });
      }
      
      if (submissions.length === 0) {
        throw new Error('No changes to submit');
      }
      
      const adminToken = localStorage.getItem("adminToken");
      let response;
      if (reEditSubmissionId) {
        response = await fetch(`${API_BASE_URL}/api/submissions/${reEditSubmissionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(adminToken && { 'Authorization': `Bearer ${adminToken}` })
          },
          body: JSON.stringify({ 
            proposed_data: submissions[0].proposed_data,
            section: submissions[0].section
          })
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminToken && { 'Authorization': `Bearer ${adminToken}` })
          },
          body: JSON.stringify({ submissions })
        });
      }
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit changes for approval');
      }
      
      updateUiState({ isEditing: false });
      setPendingChanges(null);
      setOriginalData(null);
      setCurrentSection('');
      setTempEditData({});
      
      const actionText = reEditSubmissionId ? 'updated' : 'submitted';
      setReEditSubmissionId(null);
      
      showMessage(`${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} changes ${actionText} for approval successfully`, "success", currentSection);
      
    } catch (error) {
      showMessage(error.message || "Failed to submit changes for approval", "error", currentSection);
      updateUiState({ showSectionSummaryModal: true });
    } finally {
      updateUiState({ saving: false });
    }
  };

  const handleSectionCancelModal = () => {
    updateUiState({ showSectionSummaryModal: false });
    setPendingChanges(null);
    setCurrentSection('');
  };

  // Add Organization Head handler
  const handleAddOrgHead = async (newHeadData) => {
    try {
      updateUiState({ saving: true });
      updateUiState({ showAddOrgHeadModal: false });
      
      const orgId = orgData.id || admin.id;
      
      if (!orgId) {
        throw new Error('No organization ID available for adding head');
      }
      
      if (!newHeadData) {
        throw new Error('Invalid head data provided');
      }
      
      const cleanedHeadData = {
        ...newHeadData,
        photo: newHeadData.photo && newHeadData.photo.startsWith('data:') ? null : newHeadData.photo
      };
      
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        throw new Error('No admin token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/heads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          organization_id: orgId,
          ...cleanedHeadData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showMessage('Organization head added successfully', 'success', 'orgHeads');
        
        const allHeadsWithNew = [...stableOrgHeadsData, result.data];
        const reorderedHeads = applyRoleHierarchyOrdering(allHeadsWithNew);
        
        refreshHeads(reorderedHeads, false);
        
        setTimeout(() => {
          refreshHeads();
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to add organization head');
      }
    } catch (error) {
      console.error('Error in handleAddOrgHead:', error);
      showMessage(error.message || 'Failed to add organization head', 'error', 'orgHeads');
      updateUiState({ showAddOrgHeadModal: true });
    } finally {
      updateUiState({ saving: false });
    }
  };

  const handleAddOrgHeadCancel = () => {
    updateUiState({ showAddOrgHeadModal: false });
  };

  // Individual head editing handlers
  const handleEditIndividualHead = (head) => {
    setSelectedHeadForEdit(head);
    updateUiState({ showIndividualHeadEditModal: true });
  };

  const handleIndividualHeadSave = async (updatedHead) => {
    try {
      updateUiState({ saving: true });
      updateUiState({ showIndividualHeadEditModal: false });
      
      const orgId = orgData.id || admin.id;
      
      if (!orgId) {
        throw new Error('No organization ID available for saving head');
      }
      
      if (!updatedHead) {
        throw new Error('Invalid head data provided');
      }
      
      const cleanedHeadData = {
        ...updatedHead,
        photo: updatedHead.photo && updatedHead.photo.startsWith('data:') ? null : updatedHead.photo
      };
      
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        throw new Error('No admin token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/heads/${updatedHead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          organization_id: orgId,
          ...cleanedHeadData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showMessage('Organization head updated successfully', 'success', 'orgHeads');
        
        const updatedHeads = stableOrgHeadsData.map(head => 
          head.id === updatedHead.id ? { ...head, ...cleanedHeadData } : head
        );
        
        refreshHeads(updatedHeads, false);
        
        setTimeout(() => {
          refreshHeads();
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to update organization head');
      }
    } catch (error) {
      console.error('Error in handleIndividualHeadSave:', error);
      showMessage(error.message || 'Failed to update organization head', 'error', 'orgHeads');
      updateUiState({ showIndividualHeadEditModal: true });
    } finally {
      updateUiState({ saving: false });
      setSelectedHeadForEdit(null);
    }
  };

  const handleIndividualHeadCancel = () => {
    updateUiState({ showIndividualHeadEditModal: false });
    setSelectedHeadForEdit(null);
  };

  const handleDeleteIndividualHead = (head) => {
    setSelectedHeadForDelete(head);
    updateUiState({ showDeleteConfirmationModal: true });
  };

  const handleConfirmDelete = async () => {
    if (!selectedHeadForDelete) return;
    
    try {
      updateUiState({ saving: true });
      
      const orgId = orgData.id || admin.id;
      
      if (!orgId) {
        throw new Error('No organization ID available for deleting head');
      }
      
      if (!selectedHeadForDelete || !selectedHeadForDelete.id) {
        throw new Error('Invalid head data provided');
      }
      
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/heads/${selectedHeadForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showMessage('Organization head deleted successfully', 'success', 'orgHeads');
        
        const updatedHeads = stableOrgHeadsData.filter(h => h.id !== selectedHeadForDelete.id);
        
        refreshHeads(updatedHeads, false);
        
        setTimeout(() => {
          refreshHeads();
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to delete organization head');
      }
    } catch (error) {
      console.error('Error in handleConfirmDelete:', error);
      showMessage(error.message || 'Failed to delete organization head', 'error', 'orgHeads');
    } finally {
      updateUiState({ saving: false });
      updateUiState({ showDeleteConfirmationModal: false });
      setSelectedHeadForDelete(null);
    }
  };

  const handleCancelDelete = () => {
    updateUiState({ showDeleteConfirmationModal: false });
    setSelectedHeadForDelete(null);
  };

  // Handle reordering of organization heads
  const handleReorderHeads = async (reorderedHeads) => {
    try {
      updateUiState({ saving: true });
      
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        throw new Error('No admin token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/heads/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ heads: reorderedHeads })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        showMessage('Organization heads reordered successfully', 'success', 'orgHeads');
          
        refreshHeads(reorderedHeads, false);
        
        setTimeout(() => {
          refreshHeads();
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to reorder organization heads');
      }
    } catch (error) {
      console.error('Error in handleReorderHeads:', error);
      showMessage(error.message || 'Failed to reorder organization heads', 'error', 'orgHeads');
      throw error;
    } finally {
      updateUiState({ saving: false });
    }
  };

  // Show skeleton loader when loading
  if (loading) {
    return (
      <div>
        <div className={pageStyles.header}>
          <h1>Organization Information</h1>
        </div>
        <SkeletonLoader type="section" count={3} />
      </div>
    );
  }

  // Show full page loader only on first visit
  if (isFirstVisit && loading) {
    return (
      <div>
        <div className={pageStyles.header}>
          <h1>Organization Information</h1>
        </div>
        <SkeletonLoader type="section" count={3} />
      </div>
    );
  }

  return (
    <div>
      <div className={pageStyles.header}>
        <h1>Organization Information</h1>
      </div>

      {/* Organization Info Section with Skeleton */}
      {!sectionStates.orgInfo ? (
        skeletonComponents.orgInfo
      ) : (
        <OrgInfoSection
          orgData={orgData}
          isEditing={uiState.isEditing}
          setIsEditing={(value) => updateUiState({ isEditing: value })}
          setShowEditModal={(value) => updateUiState({ showEditModal: value })}
          setOriginalData={setOriginalData}
          setEditPreviewData={setEditPreviewData}
          currentSection={currentSection}
          setCurrentSection={setCurrentSection}
        />
      )}

      <div className={pageStyles.sectionsContainer}>
        <div className={pageStyles.sectionColumn}>
          {/* Advocacy Section with Skeleton */}
          {!sectionStates.advocacy ? (
            skeletonComponents.advocacy
          ) : (
            <Section
              type="advocacy"
              data={advocacyData}
              setIsEditing={(value) => updateUiState({ isEditing: value })}
              setShowEditModal={(value) => updateUiState({ showSectionEditModal: value })}
              setOriginalData={setOriginalData}
              setCurrentSection={setCurrentSection}
              setTempEditData={setTempEditData}
            />
          )}
        </div>
        
        <div className={pageStyles.sectionColumn}>
          {/* Competency Section with Skeleton */}
          {!sectionStates.competency ? (
            skeletonComponents.competency
          ) : (
            <Section
              type="competency"
              data={competencyData}
              setIsEditing={(value) => updateUiState({ isEditing: value })}
              setShowEditModal={(value) => updateUiState({ showSectionEditModal: value })}
              setOriginalData={setOriginalData}
              setCurrentSection={setCurrentSection}
              setTempEditData={setTempEditData}
            />
          )}
        </div>
      </div>

      {/* Organization Heads Section with Skeleton */}
      {!sectionStates.orgHeads || headsLoading ? (
        skeletonComponents.orgHeads
      ) : (
        <OrgHeadsSection
          orgHeadsData={stableOrgHeadsData}
          onEditIndividualHead={handleEditIndividualHead}
          onDeleteIndividualHead={handleDeleteIndividualHead}
          onAddOrgHead={() => updateUiState({ showAddOrgHeadModal: true })}
          onReorderHeads={handleReorderHeads}
          saving={uiState.saving}
        />
      )}

      <EditModal
        isOpen={uiState.showEditModal}
        orgData={editPreviewData || orgData}
        setOrgData={setEditPreviewData}
        errors={errors}
        uploading={uiState.uploading}
        handleInputChange={handleInputChange}
        handleFileUpload={handleFileUpload}
        handleSave={handleSave}
        handleCancel={handleCancel}
        saving={uiState.saving}
        modalMessage={modalMessage}
        setModalMessage={setModalMessage}
        originalData={originalData}
      />

      <SectionEditModal
        isOpen={uiState.showSectionEditModal}
        currentSection={currentSection}
        advocacyData={{ ...advocacyData, ...tempEditData }}
        competencyData={{ ...competencyData, ...tempEditData }}
        handleInputChange={handleInputChange}
        handleSave={handleSave}
        handleCancel={handleCancel}
        saving={uiState.saving}
        originalData={originalData}
      />

      {/* Add Organization Head Modal */}
      <AddOrgHeadModal
        isOpen={uiState.showAddOrgHeadModal}
        onSave={handleAddOrgHead}
        onCancel={handleAddOrgHeadCancel}
        saving={uiState.saving}
        existingHeads={stableOrgHeadsData}
      />

      {/* Individual Head Edit Modal */}
      {selectedHeadForEdit && (
        <OrgHeadsEditModal
          isOpen={uiState.showIndividualHeadEditModal}
          orgHeadsData={[selectedHeadForEdit]}
          setOrgHeadsData={(heads) => {
            if (heads && heads.length > 0) {
              setSelectedHeadForEdit(heads[0]);
            }
          }}
          handleSave={(heads) => {
            if (heads && heads.length > 0) {
              handleIndividualHeadSave(heads[0]);
            }
          }}
          handleCancel={handleIndividualHeadCancel}
          saving={uiState.saving}
          originalData={[selectedHeadForEdit]}
          isIndividualEdit={true}
        />
      )}

      {uiState.showSummaryModal && originalData && pendingChanges && (
        <SummaryModal
          originalData={originalData}
          pendingChanges={pendingChanges}
          saving={uiState.saving}
          handleCancelModal={handleCancelModal}
          handleConfirmChanges={handleConfirmChanges}
        />
      )}

      {uiState.showSectionSummaryModal && originalData && pendingChanges && (
        <SectionSummaryModal
          isOpen={uiState.showSectionSummaryModal}
          currentSection={currentSection}
          originalData={originalData}
          pendingChanges={pendingChanges}
          saving={uiState.saving}
          handleCancelModal={handleSectionCancelModal}
          handleConfirmChanges={handleSectionConfirmChanges}
        />
      )}

      <DeleteConfirmationModal
        isOpen={uiState.showDeleteConfirmationModal}
        itemName={selectedHeadForDelete?.head_name || selectedHeadForDelete?.name || 'this organization head'}
        itemType="organization head"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={uiState.saving}
      />

      <SuccessModal
        isVisible={successModal.isVisible}
        message={successModal.message}
        type={successModal.type}
        onClose={closeSuccessModal}
      />
    </div>
  );
}