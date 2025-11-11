"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateAdminOrg, updateAdminLogo } from "@/rtk/superadmin/adminSlice";
import { useAdminOrganization, useAdminAdvocacies, useAdminCompetencies, useAdminHeads } from "../hooks/useAdminData";
import { applyRoleHierarchyOrdering } from "./utils";
import { EditModal, OrgInfoSection } from "./OrgInfo";
import { Section, SectionEditModal } from "./AdvocacyCompetency";
import { SummaryModal } from '@/components/ui';
import { OrgHeadsSection, AddOrgHeadModal, OrgHeadsEditModal } from "./OrgHeads";
import { SkeletonLoader } from "../components";
import { ConfirmationModal, ErrorBoundary, SuccessModal } from '@/components';
import { getAdminTokenOrRedirect, handleApiError, API_CONFIG, TIMEOUTS } from '../utils';
import pageStyles from "./page.module.css";

// Track if organization page has been visited
let hasVisitedOrganization = false;

export default function OrganizationPage() {
  const dispatch = useDispatch();
  const admin = useSelector((state) => state.admin.admin);
  const [pageReady, setPageReady] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(!hasVisitedOrganization);
  
  // Use SWR hooks for data fetching
  const { organization, isLoading: orgLoading, error: orgError, mutate: refreshOrganization } = useAdminOrganization(admin?.organization_id);
  
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
    return organization?.id || admin?.organization_id;
  }, [organization?.id, admin?.organization_id]);

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
        org: organization.org || "",
        orgName: organization.orgName || "",
        email: organization.email || admin?.email || "",
        facebook: organization.facebook || "",
        description: organization.description || "",
        orgColor: organization.org_color || "#444444"
      };
    }
    
    return {
      id: null,
      logo: "",
      org: "",
      orgName: "",
      email: admin?.email || "",
      facebook: "",
      description: "",
      orgColor: "#444444"
    };
  }, [editPreviewData, organization, admin]);

  // Helper function to normalize advocacy/competency data
  const normalizeTextData = (value) => {
    if (!value) return ""
    
    // If it's already a string, check if it's a JSON string
    if (typeof value === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value)
        // If parsed result is an object (like {}), return empty string
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
          return ""
        }
        // If parsed result is a string, return it
        if (typeof parsed === 'string') {
          return parsed
        }
        // Otherwise return empty string for other object types
        return ""
      } catch (e) {
        // Not JSON, return as-is
        return value
      }
    }
    
    // If it's an object, check if it's empty
    if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length === 0) {
        return ""
      }
      // If object has content, try to stringify (shouldn't happen, but handle it)
      return JSON.stringify(value)
    }
    
    // For other types, convert to string
    return String(value)
  }

  const advocacyData = useMemo(() => {
    return safeData.advocacies.length > 0 ? {
      id: safeData.advocacies[0].id,
      advocacy: normalizeTextData(safeData.advocacies[0].advocacy) || ""
    } : {
      id: null,
      advocacy: ""
    };
  }, [safeData.advocacies]);

  const competencyData = useMemo(() => {
    return safeData.competencies.length > 0 ? {
      id: safeData.competencies[0].id,
      competency: normalizeTextData(safeData.competencies[0].competency) || ""
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
  const loading = orgLoading || advocaciesLoading || competenciesLoading || headsLoading || !admin?.organization_id;

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
        org: organization.org || "",
        orgName: organization.orgName || "",
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
        org: organization.org || "",
        orgName: organization.orgName || "",
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
    
    // Validate required fields
    if (!dataToValidate.org || dataToValidate.org.trim() === "") {
      newErrors.org = "Organization acronym is required";
    }
    
    if (!dataToValidate.orgName || dataToValidate.orgName.trim() === "") {
      newErrors.orgName = "Organization name is required";
    }
    
    // Validate Facebook URL format
    if (dataToValidate.facebook && !dataToValidate.facebook.includes("facebook.com")) {
      newErrors.facebook = "Please enter a valid Facebook URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle error display
  useEffect(() => {
    if (orgError && admin?.organization_id) {
      const errorInfo = handleApiError(orgError, 'organization_load', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message, "error");
    }
    if (advocaciesError && admin?.organization_id) {
      const errorInfo = handleApiError(advocaciesError, 'advocacies_load', {
        redirectOnAuth: true,
        logError: true
      });
      // Log but don't show to user to avoid spam
    }
    if (competenciesError && admin?.organization_id) {
      const errorInfo = handleApiError(competenciesError, 'competencies_load', {
        redirectOnAuth: true,
        logError: true
      });
      // Log but don't show to user to avoid spam
    }
    if (headsError && admin?.organization_id) {
      const errorInfo = handleApiError(headsError, 'heads_load', {
        redirectOnAuth: true,
        logError: true
      });
      // Log but don't show to user to avoid spam
    }
  }, [orgError, advocaciesError, competenciesError, headsError, admin?.organization_id]);

  // Handle re-edit from submissions page
  // Note: advocacy and competency are no longer handled through submissions
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isReEdit = urlParams.get('reEdit');
    
    if (isReEdit === 'true') {
      const reEditData = sessionStorage.getItem('reEditSubmission');
      if (reEditData) {
        try {
          const submission = JSON.parse(reEditData);
          
          // Skip advocacy and competency - they should be edited directly
          if (submission.section === 'advocacy' || submission.section === 'competency') {
            sessionStorage.removeItem('reEditSubmission');
            showMessage(`${submission.section} should be edited directly from the organization page`, "info", submission.section);
            return;
          }
          
          setCurrentSection(submission.section);
          updateUiState({ isEditing: true });
          setReEditSubmissionId(submission.id);
          
          // Handle other sections that still use submissions
          setTempEditData(submission.data || {});
          setOriginalData(submission.data || {});
          updateUiState({ showSectionEditModal: true });
          
          sessionStorage.removeItem('reEditSubmission');
          showMessage(`Re-editing ${submission.section} submission`, "info", submission.section);
          
        } catch (error) {
          const errorInfo = handleApiError(error, 'submission_load_re_edit', {
            redirectOnAuth: true,
            logError: true
          });
          showMessage(errorInfo.message || 'Error loading submission for re-edit', "error");
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
      
      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/upload`, {
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
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setModalMessage({ text: "", type: "" });
        }, 3000);
      } else {
        const errorInfo = handleApiError({ status: response.status }, 'organization_logo_upload', {
          redirectOnAuth: true,
          logError: true
        });
        const errorText = await response.text().catch(() => '');
        throw new Error(errorInfo.message || `Upload failed: ${response.status}`);
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'organization_logo_upload', {
        redirectOnAuth: true,
        logError: true
      });
      setModalMessage({ text: errorInfo.message, type: "error" });
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
      // Handle advocacy and competency sections
      const currentData = currentSection === 'advocacy' ? advocacyData : competencyData;
      const editedData = { ...currentData, ...tempEditData };
      
      // Trim and validate the input
      let trimmedValue = '';
      if (currentSection === 'advocacy' && editedData.advocacy) {
        trimmedValue = editedData.advocacy.trim();
        editedData.advocacy = trimmedValue;
      } else if (currentSection === 'competency' && editedData.competency) {
        trimmedValue = editedData.competency.trim();
        editedData.competency = trimmedValue;
      }
      
      // Validate length: must be empty or at least 10 characters
      if (trimmedValue && trimmedValue.length > 0 && trimmedValue.length < 10) {
        showMessage("Please enter at least 10 characters or leave the field empty", "error", currentSection);
        return;
      }
      
      // Check if there are actual changes
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
        ? `${API_CONFIG.BASE_URL}/api/organization/${pendingChanges.id}`
        : `${API_CONFIG.BASE_URL}/api/organization`;

      const requestBody = {
        logo: pendingChanges.logo || "",
        org: pendingChanges.org || organization?.org || "",
        orgName: pendingChanges.orgName || organization?.orgName || "",
        facebook: pendingChanges.facebook || "",
        description: pendingChanges.description || "",
        orgColor: pendingChanges.orgColor || "#444444",
        status: "ACTIVE"
      };

      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(adminToken && { 'Authorization': `Bearer ${adminToken}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'organization_save', {
          redirectOnAuth: true,
          logError: true
        });
        const errorText = await response.text().catch(() => '');
        throw new Error(errorInfo.message || `HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
        
      if (result.success) {
        const updatedOrganization = {
          ...(organization || {}),
          ...pendingChanges,
          ...result.data,
          id: result.data?.id || organization?.id || pendingChanges.id,
          logo: result.data?.logo || pendingChanges.logo || organization?.logo || "",
          org: result.data?.org || pendingChanges.org || organization?.org || "",
          orgName: result.data?.orgName || pendingChanges.orgName || organization?.orgName || "",
          email: result.data?.email || pendingChanges.email || organization?.email || admin?.email || "",
          facebook: result.data?.facebook || pendingChanges.facebook || organization?.facebook || "",
          description: result.data?.description || pendingChanges.description || organization?.description || "",
          org_color: result.data?.orgColor || pendingChanges.orgColor || organization?.org_color || "#444444"
        };
        
        // Always update the SWR cache with the updated organization data
        refreshOrganization({ success: true, data: updatedOrganization }, false);
        
        setEditPreviewData(updatedOrganization);
        
        // Update Redux store if org, orgName, or logo changed
        if ((pendingChanges.org && pendingChanges.org !== organization?.org) || 
            (pendingChanges.orgName && pendingChanges.orgName !== organization?.orgName) ||
            (pendingChanges.logo && pendingChanges.logo !== organization?.logo)) {
          dispatch(updateAdminOrg({
            org: pendingChanges.org || organization?.org,
            orgName: pendingChanges.orgName || organization?.orgName
          }));
          
          // Update logo separately
          if (pendingChanges.logo && pendingChanges.logo !== organization?.logo) {
            dispatch(updateAdminLogo({
              logo: pendingChanges.logo
            }));
          }
        }

        updateUiState({ isEditing: false });
        setPendingChanges(null);
        setOriginalData(null);
        showMessage("Organization information saved successfully", "success");
      } else {
        throw new Error(result.message || "Failed to save organization information");
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'organization_save', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message, "error");
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
    // Reset modal message when closing modal
    setModalMessage({ text: "", type: "" });
  };

  const handleSectionConfirmChanges = async () => {
    if (!pendingChanges || !admin?.id) return;
    
    try {
      updateUiState({ saving: true });
      updateUiState({ showSectionSummaryModal: false });
      
      const orgId = orgData.id || admin?.organization_id;
      if (!orgId) {
        throw new Error('No organization ID available');
      }
      
      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }

      // Save advocacy/competency directly to their respective tables (no approval needed)
      // Similar to organization info - direct update, no submission workflow
      if (currentSection === 'advocacy') {
        const advocacyValue = (pendingChanges.advocacy || "").trim();
        
        // Validate length before API call (defense in depth)
        if (advocacyValue && advocacyValue.length > 0 && advocacyValue.length < 10) {
          throw new Error('Advocacy must be at least 10 characters if provided');
        }
        
        // Use POST - backend handles both create and update
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/advocacies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            organization_id: orgId,
            advocacy: advocacyValue
          })
        });
        
        const responseText = await response.text().catch(() => '');
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { success: false, message: responseText || `HTTP ${response.status}` };
        }
        
        if (!response.ok || !result.success) {
          const errorMessage = result.message || result.error || 'Failed to save advocacy';
          const error = new Error(errorMessage);
          error.status = response.status;
          
          const errorInfo = handleApiError(error, 'advocacy_save', {
            redirectOnAuth: true,
            logError: true
          });
          throw error;
        }
        
        // Refresh advocacy data
        refreshAdvocacies();
        
      } else if (currentSection === 'competency') {
        const competencyValue = (pendingChanges.competency || "").trim();
        
        // Validate length before API call (defense in depth)
        if (competencyValue && competencyValue.length > 0 && competencyValue.length < 10) {
          throw new Error('Competency must be at least 10 characters if provided');
        }
        
        // Use POST - backend handles both create and update
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/competencies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            organization_id: orgId,
            competency: competencyValue
          })
        });
        
        const responseText = await response.text().catch(() => '');
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { success: false, message: responseText || `HTTP ${response.status}` };
        }
        
        if (!response.ok || !result.success) {
          const errorMessage = result.message || result.error || 'Failed to save competency';
          const error = new Error(errorMessage);
          error.status = response.status;
          
          const errorInfo = handleApiError(error, 'competency_save', {
            redirectOnAuth: true,
            logError: true
          });
          throw error;
        }
        
        // Refresh competency data
        refreshCompetencies();
      } else {
        throw new Error('Invalid section for direct save');
      }
      
      updateUiState({ isEditing: false });
      setPendingChanges(null);
      setOriginalData(null);
      setCurrentSection('');
      setTempEditData({});
      setReEditSubmissionId(null);
      
      showMessage(`${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} saved successfully`, "success", currentSection);
      
    } catch (error) {
      const errorInfo = handleApiError(error, 'section_save', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message || error.message || "Failed to save changes", "error", currentSection);
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
      
      const orgId = orgData.id || admin?.organization_id;
      
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
      
      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/heads`, {
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
        const errorInfo = handleApiError({ status: response.status }, 'org_head_add', {
          redirectOnAuth: true,
          logError: true
        });
        const errorText = await response.text().catch(() => '');
        throw new Error(errorInfo.message || `Backend error: ${response.status}`);
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
        const errorInfo = handleApiError({ status: response.status, message: result.message }, 'org_head_add', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message || 'Failed to add organization head');
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'org_head_add', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message, 'error', 'orgHeads');
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
      
      const orgId = orgData.id || admin?.organization_id;
      
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
      
      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/heads/${updatedHead.id}`, {
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
        const errorInfo = handleApiError({ status: response.status }, 'org_head_update', {
          redirectOnAuth: true,
          logError: true
        });
        const errorText = await response.text().catch(() => '');
        throw new Error(errorInfo.message || `Backend error: ${response.status}`);
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
        const errorInfo = handleApiError({ status: response.status, message: result.message }, 'org_head_update', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message || 'Failed to update organization head');
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'org_head_update', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message, 'error', 'orgHeads');
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
      
      const orgId = orgData.id || admin?.organization_id;
      
      if (!orgId) {
        throw new Error('No organization ID available for deleting head');
      }
      
      if (!selectedHeadForDelete || !selectedHeadForDelete.id) {
        throw new Error('Invalid head data provided');
      }
      
      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/heads/${selectedHeadForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'org_head_delete', {
          redirectOnAuth: true,
          logError: true
        });
        const errorText = await response.text().catch(() => '');
        throw new Error(errorInfo.message || `Backend error: ${response.status}`);
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
        const errorInfo = handleApiError({ status: response.status, message: result.message }, 'org_head_delete', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message || 'Failed to delete organization head');
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'org_head_delete', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message, 'error', 'orgHeads');
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
      
      const adminToken = getAdminTokenOrRedirect();
      if (!adminToken) {
        return; // Redirect handled by getAdminTokenOrRedirect
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/heads/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ heads: reorderedHeads })
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'org_head_reorder', {
          redirectOnAuth: true,
          logError: true
        });
        const errorText = await response.text().catch(() => '');
        throw new Error(errorInfo.message || `Backend error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        showMessage('Organization heads reordered successfully', 'success', 'orgHeads');
          
        refreshHeads(reorderedHeads, false);
        
        setTimeout(() => {
          refreshHeads();
        }, 500);
        
      } else {
        const errorInfo = handleApiError({ status: response.status, message: result.message }, 'org_head_reorder', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message || 'Failed to reorder organization heads');
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'org_head_reorder', {
        redirectOnAuth: true,
        logError: true
      });
      showMessage(errorInfo.message, 'error', 'orgHeads');
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
    <ErrorBoundary>
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
          setModalMessage={setModalMessage}
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
          isOpen={uiState.showSummaryModal}
          currentSection="organization"
          originalData={originalData}
          pendingChanges={pendingChanges}
          saving={uiState.saving}
          handleCancelModal={handleCancelModal}
          handleConfirmChanges={handleConfirmChanges}
        />
      )}

      {uiState.showSectionSummaryModal && originalData && pendingChanges && (
        <SummaryModal
          isOpen={uiState.showSectionSummaryModal}
          currentSection={currentSection}
          originalData={originalData}
          pendingChanges={pendingChanges}
          saving={uiState.saving}
          handleCancelModal={handleSectionCancelModal}
          handleConfirmChanges={handleSectionConfirmChanges}
        />
      )}

      <ConfirmationModal
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
        autoHideDuration={TIMEOUTS.SUCCESS_MODAL}
      />
    </div>
    </ErrorBoundary>
  );
}