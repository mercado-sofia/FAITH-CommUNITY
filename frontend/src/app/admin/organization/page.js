"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateAdminOrg } from "../../../rtk/superadmin/adminSlice";
import { useAdminOrganization, useAdminAdvocacies, useAdminCompetencies, useAdminHeads } from "../../../hooks/useAdminData";
import { applyRoleHierarchyOrdering } from "./components/utils/roleHierarchy";
import OrgHeader from "./components/OrgHeader";
import OrgInfoSection from "./components/OrgInfoSection";
import AdvocacySection from "./components/AdvocacySection";
import CompetencySection from "./components/CompetencySection";
import OrgHeadsSection from "./components/OrgHeadsSection";
import EditModal from "./components/EditModal";
import SectionEditModal from "./components/SectionEditModal";
import AddOrgHeadModal from "./components/AddOrgHeadModal";
import OrgHeadsEditModal from "./components/OrgHeadsEditModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import SummaryModal from "./components/SummaryModal";
import SectionSummaryModal from "./components/SectionSummaryModal";
import SuccessModal from "../components/SuccessModal";
import Loader from '../../../components/Loader';
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
  
  // Note: SWR will automatically re-run when admin?.org changes due to Redux state updates

  // Separate state for edit modal preview (doesn't affect main display)
  const [editPreviewData, setEditPreviewData] = useState(null);

  // Safeguard: Ensure we have a stable organization ID for the hooks
  const stableOrgId = useMemo(() => {
    // Prefer organization.id if available, otherwise fall back to admin.id
    const orgId = organization?.id || admin?.id;
    return orgId;
  }, [organization?.id, admin?.id]);

  // Use stable organization ID for hooks to prevent unnecessary re-runs
  const { advocacies: stableAdvocacies, isLoading: advocaciesLoading, error: advocaciesError, mutate: refreshAdvocacies } = useAdminAdvocacies(stableOrgId);
  const { competencies: stableCompetencies, isLoading: competenciesLoading, error: competenciesError, mutate: refreshCompetencies } = useAdminCompetencies(stableOrgId);
  const { heads: stableHeads, isLoading: headsLoading, error: headsError, mutate: refreshHeads } = useAdminHeads(stableOrgId);
  // Use the stable data directly from SWR hooks with memoization to prevent unnecessary re-renders
  const advocacies = useMemo(() => stableAdvocacies || [], [stableAdvocacies]);
  const competencies = useMemo(() => stableCompetencies || [], [stableCompetencies]);
  const heads = useMemo(() => stableHeads || [], [stableHeads]);

  // Safeguard: Ensure data arrays are never undefined
  const safeAdvocacies = useMemo(() => {
    const safe = Array.isArray(advocacies) ? advocacies : [];
    return safe;
  }, [advocacies]);

  const safeCompetencies = useMemo(() => {
    const safe = Array.isArray(competencies) ? competencies : [];
    return safe;
  }, [competencies]);

  const safeHeads = useMemo(() => {
    const safe = Array.isArray(heads) ? heads : [];
    return safe;
  }, [heads]);

  // Derived state from SWR data, with instant updates from editPreviewData
  // Use useMemo to prevent unnecessary recalculations and ensure consistency
  const orgData = useMemo(() => {
    // If we have edit preview data, use it (for immediate UI updates during editing)
    if (editPreviewData) {
      return editPreviewData;
    }
    
    // Otherwise, use the organization data from SWR
    if (organization) {
      return {
        id: organization.id,
        logo: organization.logo || "",
        org: organization.org || admin?.org || "",
        orgName: organization.orgName || admin?.orgName || "",
        email: organization.email || admin?.email || "",
        facebook: organization.facebook || "",
        description: organization.description || "",
        orgColor: organization.org_color || "#444444"
      };
    }
    
    // Fallback to admin data if no organization exists yet
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
    return safeAdvocacies.length > 0 ? {
      id: safeAdvocacies[0].id,
      advocacy: safeAdvocacies[0].advocacy || ""
    } : {
      id: null,
      advocacy: ""
    };
  }, [safeAdvocacies]);

  const competencyData = useMemo(() => {
    return safeCompetencies.length > 0 ? {
      id: safeCompetencies[0].id,
      competency: safeCompetencies[0].competency || ""
    } : {
      id: null,
      competency: ""
    };
  }, [safeCompetencies]);

  const orgHeadsData = safeHeads;
  
  // Stabilize orgHeadsData to prevent infinite loops in modal
  const stableOrgHeadsData = useMemo(() => {
    return orgHeadsData;
  }, [orgHeadsData]); // Include orgHeadsData as dependency since we're returning it

  // Modal-specific message state
  const [modalMessage, setModalMessage] = useState({ text: "", type: "" });

  // Temporary state for editing advocacy/competency without affecting main display
  const [tempEditData, setTempEditData] = useState({});
  const [reEditSubmissionId, setReEditSubmissionId] = useState(null); // Track if we're re-editing an existing submission

  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSectionEditModal, setShowSectionEditModal] = useState(false);
  const [showAddOrgHeadModal, setShowAddOrgHeadModal] = useState(false);
  const [showIndividualHeadEditModal, setShowIndividualHeadEditModal] = useState(false);
  const [selectedHeadForEdit, setSelectedHeadForEdit] = useState(null);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);
  const [selectedHeadForDelete, setSelectedHeadForDelete] = useState(null);
  const [currentSection, setCurrentSection] = useState(''); // 'organization', 'advocacy', 'competency', 'orgHeads'
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSectionSummaryModal, setShowSectionSummaryModal] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  // Combined loading state
  const loading = orgLoading || advocaciesLoading || competenciesLoading || headsLoading || !admin?.org;

  // Smart loading logic
  useEffect(() => {
    if (!orgLoading && !advocaciesLoading && !competenciesLoading && !headsLoading) {
      const extraDelay = isFirstVisit ? 600 : 0; // Reduced delay for first visit
      const timer = setTimeout(() => {
        setPageReady(true);
        setIsFirstVisit(false);
        hasVisitedOrganization = true; // Mark as visited
      }, extraDelay);
      
      return () => clearTimeout(timer);
    }
  }, [orgLoading, advocaciesLoading, competenciesLoading, headsLoading, isFirstVisit]);

  // Synchronize editPreviewData when organization data changes from SWR
  // This ensures data consistency and prevents disappearing data
  useEffect(() => {
    // Only sync if we have fresh organization data and no existing edit preview data
    // This prevents overwriting user changes during editing
    if (organization && !editPreviewData && !isEditing) {
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
  }, [organization, admin, editPreviewData, isEditing]);

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

  const showMessage = (text, type, section = "") => {
    setSuccessModal({ isVisible: true, message: text, type: type });
  };

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };

    const validateForm = () => {
    const newErrors = {};
    // Use editPreviewData if available, otherwise fall back to orgData
    const dataToValidate = editPreviewData || orgData;
    
    if (!dataToValidate.org?.trim()) {
      newErrors.org = "Organization acronym is required";
    }
    if (!dataToValidate.orgName?.trim()) {
      newErrors.orgName = "Organization name is required";
    }
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
          
          // Set up for re-editing the specific section
          setCurrentSection(submission.section);
          setIsEditing(true);
          setReEditSubmissionId(submission.id); // Store the submission ID for updating
          
          // Initialize temp data with the submission's proposed data
          if (submission.section === 'advocacy') {
            setTempEditData({ advocacy: submission.data });
            setOriginalData({ ...advocacyData });
            setShowSectionEditModal(true);
          } else if (submission.section === 'competency') {
            setTempEditData({ competency: submission.data });
            setOriginalData({ ...competencyData });
            setShowSectionEditModal(true);
          }
          
          // Clear the session storage
          sessionStorage.removeItem('reEditSubmission');
          
          // Show message
          showMessage(`Re-editing ${submission.section} submission`, "info", submission.section);
          
        } catch (error) {
          console.error('Error parsing re-edit data:', error);
          showMessage('Error loading submission for re-edit', "error");
        }
      }
    }
  }, [advocacyData, competencyData]); // Dependencies to ensure data is loaded first

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Skip email field since it's managed in admin settings
    if (name === 'email') return;
    
    // Handle different sections
    if (currentSection === 'organization') {
      // When editing organization data, update preview data instead of main orgData
      setEditPreviewData((prev) => {
        const currentData = prev || orgData;
        const newData = { 
          ...currentData, 
          [name]: value 
        };
        return newData;
      });
    } else {
      // For advocacy and competency, store changes in temporary editing state
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
      setUploading(true);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadType", "organization-logo");
      
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        // Only update the edit preview data, not the main orgData
        setEditPreviewData((prev) => ({ 
          ...(prev || orgData), 
          logo: result.url 
        }));
        setModalMessage({ text: "Logo uploaded successfully", type: "success" });
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      setModalMessage({ text: "Failed to upload logo", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (currentSection === 'organization') {
      if (!validateForm()) {
        showMessage("Please fix the errors before saving", "error");
        return;
      }

      const currentOrgData = editPreviewData || orgData;
      const hasChanges = originalData && Object.keys(currentOrgData).some((key) => key !== "id" && key !== "email" && currentOrgData[key] !== originalData[key]);

      if (!hasChanges) {
        showMessage("No changes detected", "info");
        setShowEditModal(false);
        setIsEditing(false);
        setEditPreviewData(null);
        return;
      }

      setPendingChanges({ ...currentOrgData });
      setShowEditModal(false);
      setShowSummaryModal(true);
    } else if (currentSection === 'orgHeads') {
      // Handle organization heads section - immediate save like organization
      handleOrgHeadsSave();
    } else {
      // Handle advocacy and competency sections
      const currentData = currentSection === 'advocacy' ? advocacyData : competencyData;
      const editedData = { ...currentData, ...tempEditData };
      
      // Trim whitespace for advocacy and competency content
      if (currentSection === 'advocacy' && editedData.advocacy) {
        editedData.advocacy = editedData.advocacy.trim();
      } else if (currentSection === 'competency' && editedData.competency) {
        editedData.competency = editedData.competency.trim();
      }
      
      const hasChanges = originalData && Object.keys(editedData).some((key) => key !== "id" && editedData[key] !== originalData[key]);

      if (!hasChanges) {
        showMessage("No changes detected", "info", currentSection);
        setShowSectionEditModal(false);
        setIsEditing(false);
        setTempEditData({});
        return;
      }

      setPendingChanges({ ...editedData });
      setShowSectionEditModal(false);
      setShowSectionSummaryModal(true);
    }
  };

  const handleConfirmChanges = async () => {
    if (!pendingChanges) return;
    try {
      setSaving(true);
      setShowSummaryModal(false);
      
      // If no organization ID exists, we need to create a new organization
      // Otherwise, update the existing one
      const method = pendingChanges.id ? "PUT" : "POST";
      const url = pendingChanges.id
        ? `${API_BASE_URL}/api/organization/${pendingChanges.id}`
        : `${API_BASE_URL}/api/organization`;

      const requestBody = {
        logo: pendingChanges.logo || null,
        org: pendingChanges.org,
        orgName: pendingChanges.orgName,
        facebook: pendingChanges.facebook || null,
        description: pendingChanges.description || null,
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
        console.error('Organization update error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url,
          requestBody
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
        
        if (result.success) {

        // Note: localStorage update is now handled above when acronym changes

        // Create the updated organization data, preserving all fields properly
        const updatedOrganization = {
          ...(organization || {}),
          ...pendingChanges,
          ...result.data, // Include any data returned from the backend
          id: result.data?.id || organization?.id || pendingChanges.id,
          // CRITICAL: Always preserve the existing logo unless a new one was explicitly uploaded
          // This prevents the logo from disappearing in the sidebar
          logo: pendingChanges.logo || organization?.logo || result.data?.logo || "",
          // Ensure all other fields are preserved
          org: result.data?.org || pendingChanges.org || organization?.org || admin?.org || "",
          orgName: result.data?.orgName || pendingChanges.orgName || organization?.orgName || admin?.orgName || "",
          email: result.data?.email || pendingChanges.email || organization?.email || admin?.email || "",
          facebook: result.data?.facebook || pendingChanges.facebook || organization?.facebook || "",
          description: result.data?.description || pendingChanges.description || organization?.description || "",
          org_color: result.data?.orgColor || pendingChanges.orgColor || organization?.org_color || "#444444"
        };
        
        // Only update SWR cache if the organization acronym changed (which affects the cache key)
        // For other changes like description, just update local state to avoid sidebar re-renders
        if (pendingChanges.org && pendingChanges.org !== admin?.org) {
          // Update the SWR cache immediately with the new data
          // This provides instant updates without revalidation
          const cacheUpdateData = {
            ...updatedOrganization,
            logo: updatedOrganization.logo || organization?.logo || "" // Double-check logo preservation
          };
          refreshOrganization(cacheUpdateData, false); // false = don't revalidate
        }
        
        // Always update the local state immediately for instant UI feedback
        // Keep the editPreviewData for immediate UI updates
        setEditPreviewData(updatedOrganization);
        
        // If the organization acronym changed, we need to update the Redux store and localStorage
        if (pendingChanges.org && pendingChanges.org !== admin?.org) {
          // Update Redux store
          dispatch(updateAdminOrg({
            org: pendingChanges.org,
            orgName: pendingChanges.orgName
          }));
          
          // Don't force revalidation - let SWR handle it naturally
          // The logo will be preserved in the cache
        }

        setIsEditing(false);
        setPendingChanges(null);
        setOriginalData(null);
        // Keep editPreviewData for instant UI updates, it will be cleared when modal is closed
        showMessage("Organization information saved successfully", "success");
      } else {
        throw new Error(result.message || "Failed to save organization information");
      }
    } catch (error) {
      showMessage(error.message || "Failed to save organization information", "error");
      setShowSummaryModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelModal = () => {
    setShowSummaryModal(false);
    setPendingChanges(null);
  };

  const handleCancel = () => {
    if (currentSection === 'organization') {
      setShowEditModal(false);
      // Only clear editPreviewData if we're not in the middle of saving
      // This prevents data loss during save operations
      if (!saving) {
        setEditPreviewData(null); // Reset edit preview data when modal is closed
      }
    } else {
      setShowSectionEditModal(false);
    }
    setIsEditing(false);
    setErrors({});
    setCurrentSection(''); // Reset to empty string instead of 'organization'
    setPendingChanges(null);
    setOriginalData(null);
    setTempEditData({}); // Clear temporary editing data
    setReEditSubmissionId(null); // Clear re-edit submission ID
    // Don't force refresh - let SWR handle it naturally
  };

  const handleSectionConfirmChanges = async () => {
    if (!pendingChanges || !admin?.id) return;
    
    try {
      setSaving(true);
      setShowSectionSummaryModal(false);
      
      // Prepare submission data
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
      
      // Submit to backend - either create new or update existing submission
      const adminToken = localStorage.getItem("adminToken");
      let response;
      if (reEditSubmissionId) {
        // Update existing submission
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
        // Create new submission
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
      
      // Reset form state
      setIsEditing(false);
      setPendingChanges(null);
      setOriginalData(null);
      setCurrentSection('');
      setTempEditData({}); // Clear temporary editing data
      
      const actionText = reEditSubmissionId ? 'updated' : 'submitted';
      setReEditSubmissionId(null); // Clear re-edit submission ID
      
      showMessage(`${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} changes ${actionText} for approval successfully`, "success", currentSection);
      
    } catch (error) {
      showMessage(error.message || "Failed to submit changes for approval", "error", currentSection);
      setShowSectionSummaryModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSectionCancelModal = () => {
    setShowSectionSummaryModal(false);
    setPendingChanges(null);
    setCurrentSection('');
  };

  // Add Organization Head handler
  const handleAddOrgHead = async (newHeadData) => {
    try {
      setSaving(true);
      setShowAddOrgHeadModal(false);
      
      const orgId = orgData.id || admin.id;
      
      if (!orgId) {
        throw new Error('No organization ID available for adding head');
      }
      
      if (!newHeadData) {
        throw new Error('Invalid head data provided');
      }
      
      // Clean up photo data before sending to backend
      const cleanedHeadData = {
        ...newHeadData,
        photo: newHeadData.photo && newHeadData.photo.startsWith('data:') ? null : newHeadData.photo // Remove base64 data
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
        
        // Apply role hierarchy ordering to all heads including the new one
        const allHeadsWithNew = [...stableOrgHeadsData, result.data];
        const reorderedHeads = applyRoleHierarchyOrdering(allHeadsWithNew);
        
        // Update SWR cache with the reordered data
        refreshHeads(reorderedHeads, false); // false = don't revalidate
        
        // Also trigger a revalidation to ensure data consistency
        setTimeout(() => {
          refreshHeads(); // Trigger revalidation to fetch fresh data
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to add organization head');
      }
    } catch (error) {
      console.error('Error in handleAddOrgHead:', error);
      showMessage(error.message || 'Failed to add organization head', 'error', 'orgHeads');
      setShowAddOrgHeadModal(true); // Reopen modal on error
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrgHeadCancel = () => {
    setShowAddOrgHeadModal(false);
  };

  // Individual head editing handlers
  const handleEditIndividualHead = (head) => {
    setSelectedHeadForEdit(head);
    setShowIndividualHeadEditModal(true);
  };

  const handleIndividualHeadSave = async (updatedHead) => {
    try {
      setSaving(true);
      setShowIndividualHeadEditModal(false);
      
      const orgId = orgData.id || admin.id;
      
      if (!orgId) {
        throw new Error('No organization ID available for saving head');
      }
      
      if (!updatedHead) {
        throw new Error('Invalid head data provided');
      }
      
      // Clean up photo data before sending to backend
      const cleanedHeadData = {
        ...updatedHead,
        photo: updatedHead.photo && updatedHead.photo.startsWith('data:') ? null : updatedHead.photo // Remove base64 data
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
        
        // Update SWR cache with the new data
        const updatedHeads = stableOrgHeadsData.map(head => 
          head.id === updatedHead.id ? { ...head, ...cleanedHeadData } : head
        );
        
        // Update the SWR cache immediately with the new data
        refreshHeads(updatedHeads, false); // false = don't revalidate
        
        // Also trigger a revalidation to ensure data consistency
        setTimeout(() => {
          refreshHeads(); // Trigger revalidation to fetch fresh data
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to update organization head');
      }
    } catch (error) {
      console.error('Error in handleIndividualHeadSave:', error);
      showMessage(error.message || 'Failed to update organization head', 'error', 'orgHeads');
      setShowIndividualHeadEditModal(true); // Reopen modal on error
    } finally {
      setSaving(false);
      setSelectedHeadForEdit(null);
    }
  };

  const handleIndividualHeadCancel = () => {
    setShowIndividualHeadEditModal(false);
    setSelectedHeadForEdit(null);
  };

  const handleDeleteIndividualHead = (head) => {
    setSelectedHeadForDelete(head);
    setShowDeleteConfirmationModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHeadForDelete) return;
    
    try {
      setSaving(true);
      
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
        
        // Update SWR cache by removing the deleted head
        const updatedHeads = stableOrgHeadsData.filter(h => h.id !== selectedHeadForDelete.id);
        
        // Update the SWR cache immediately with the new data
        refreshHeads(updatedHeads, false); // false = don't revalidate
        
        // Also trigger a revalidation to ensure data consistency
        setTimeout(() => {
          refreshHeads(); // Trigger revalidation to fetch fresh data
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to delete organization head');
      }
    } catch (error) {
      console.error('Error in handleConfirmDelete:', error);
      showMessage(error.message || 'Failed to delete organization head', 'error', 'orgHeads');
    } finally {
      setSaving(false);
      setShowDeleteConfirmationModal(false);
      setSelectedHeadForDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmationModal(false);
    setSelectedHeadForDelete(null);
  };

  // Handle reordering of organization heads
  const handleReorderHeads = async (reorderedHeads) => {
    try {
      setSaving(true);
      
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
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
          
        // Update the SWR cache immediately with the new data
        refreshHeads(reorderedHeads, false); // false = don't revalidate
        
        // Also trigger a revalidation to ensure data consistency
        setTimeout(() => {
          refreshHeads(); // Trigger revalidation to fetch fresh data
        }, 500);
        
      } else {
        throw new Error(result.message || 'Failed to reorder organization heads');
      }
    } catch (error) {
      console.error('Error in handleReorderHeads:', error);
      showMessage(error.message || 'Failed to reorder organization heads', 'error', 'orgHeads');
      throw error; // Re-throw to let the component handle the error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <div className="spinner" style={{ width: 40, height: 40, border: "4px solid #f1f5f9", borderTop: "4px solid #16a085", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "1rem", color: "#64748b", fontSize: "1.1rem" }}>Loading organization data...</p>
      </div>
    );
  }

  return (
    <div>
      <OrgHeader />

      <OrgInfoSection
        orgData={orgData}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        setShowEditModal={setShowEditModal}
        setOriginalData={setOriginalData}
        setEditPreviewData={setEditPreviewData}
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
      />

      <div className={pageStyles.sectionsContainer}>
        <div className={pageStyles.sectionColumn}>
          <AdvocacySection
            advocacyData={advocacyData}
            setIsEditing={setIsEditing}
            setShowEditModal={setShowSectionEditModal}
            setOriginalData={setOriginalData}
            setCurrentSection={setCurrentSection}
            setTempEditData={setTempEditData}
          />
        </div>
        
        <div className={pageStyles.sectionColumn}>
          <CompetencySection
            competencyData={competencyData}
            setIsEditing={setIsEditing}
            setShowEditModal={setShowSectionEditModal}
            setOriginalData={setOriginalData}
            setCurrentSection={setCurrentSection}
            setTempEditData={setTempEditData}
          />
        </div>
      </div>

      <OrgHeadsSection
        orgHeadsData={stableOrgHeadsData}
        onEditIndividualHead={handleEditIndividualHead}
        onDeleteIndividualHead={handleDeleteIndividualHead}
        onAddOrgHead={() => setShowAddOrgHeadModal(true)}
        onReorderHeads={handleReorderHeads}
        saving={saving}
      />

      <EditModal
        isOpen={showEditModal}
        orgData={editPreviewData || orgData}
        setOrgData={setEditPreviewData}
        errors={errors}
        uploading={uploading}
        handleInputChange={handleInputChange}
        handleFileUpload={handleFileUpload}
        handleSave={handleSave}
        handleCancel={handleCancel}
        saving={saving}
        modalMessage={modalMessage}
        setModalMessage={setModalMessage}
        originalData={originalData}
      />

      <SectionEditModal
        isOpen={showSectionEditModal}
        currentSection={currentSection}
        advocacyData={{ ...advocacyData, ...tempEditData }}
        competencyData={{ ...competencyData, ...tempEditData }}
        handleInputChange={handleInputChange}
        handleSave={handleSave}
        handleCancel={handleCancel}
        saving={saving}
        originalData={originalData}
      />

      {/* Add Organization Head Modal */}
      <AddOrgHeadModal
        isOpen={showAddOrgHeadModal}
        onSave={handleAddOrgHead}
        onCancel={handleAddOrgHeadCancel}
        saving={saving}
        existingHeads={stableOrgHeadsData}
      />

      {/* Individual Head Edit Modal */}
      {selectedHeadForEdit && (
        <OrgHeadsEditModal
          isOpen={showIndividualHeadEditModal}
          orgHeadsData={[selectedHeadForEdit]} // Pass only the selected head
          setOrgHeadsData={(heads) => {
            // Update the selected head with the first (and only) head from the array
            if (heads && heads.length > 0) {
              setSelectedHeadForEdit(heads[0]);
            }
          }}
          handleSave={(heads) => {
            // Pass the first (and only) head to the save handler
            if (heads && heads.length > 0) {
              handleIndividualHeadSave(heads[0]);
            }
          }}
          handleCancel={handleIndividualHeadCancel}
          saving={saving}
          originalData={[selectedHeadForEdit]} // Pass only the selected head as original data
          isIndividualEdit={true} // Flag to indicate this is individual editing
        />
      )}

      {showSummaryModal && originalData && pendingChanges && (
        <SummaryModal
          originalData={originalData}
          pendingChanges={pendingChanges}
          saving={saving}
          handleCancelModal={handleCancelModal}
          handleConfirmChanges={handleConfirmChanges}
        />
      )}

      {showSectionSummaryModal && originalData && pendingChanges && (
        <SectionSummaryModal
          isOpen={showSectionSummaryModal}
          currentSection={currentSection}
          originalData={originalData}
          pendingChanges={pendingChanges}
          saving={saving}
          handleCancelModal={handleSectionCancelModal}
          handleConfirmChanges={handleSectionConfirmChanges}
        />
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteConfirmationModal}
        itemName={selectedHeadForDelete?.head_name || selectedHeadForDelete?.name || 'this organization head'}
        itemType="organization head"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={saving}
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