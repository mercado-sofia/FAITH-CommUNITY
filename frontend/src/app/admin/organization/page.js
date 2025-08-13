"use client"

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import OrgHeader from "./components/OrgHeader";
import OrgInfoSection from "./components/OrgInfoSection";
import AdvocacySection from "./components/AdvocacySection";
import CompetencySection from "./components/CompetencySection";
import OrgHeadsSection from "./components/OrgHeadsSection";
import EditModal from "./components/EditModal";
import SectionEditModal from "./components/SectionEditModal";
import OrgHeadsEditModal from "./components/OrgHeadsEditModal";
import SummaryModal from "./components/SummaryModal";
import SectionSummaryModal from "./components/SectionSummaryModal";
import pageStyles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function OrganizationPage() {
  const [orgData, setOrgData] = useState({
    id: null,
    logo: "",
    org: "",
    orgName: "",
    email: "",
    facebook: "",
    description: "",
    orgColor: "#444444"
  });

  // Separate state for edit modal preview (doesn't affect main display)
  const [editPreviewData, setEditPreviewData] = useState(null);
  
  // Modal-specific message state
  const [modalMessage, setModalMessage] = useState({ text: "", type: "" });

  const [advocacyData, setAdvocacyData] = useState({
    id: null,
    advocacy: ""
  });

  const [competencyData, setCompetencyData] = useState({
    id: null,
    competency: ""
  });

  const [orgHeadsData, setOrgHeadsData] = useState([]);

  // Temporary state for editing advocacy/competency without affecting main display
  const [tempEditData, setTempEditData] = useState({});
  const [reEditSubmissionId, setReEditSubmissionId] = useState(null); // Track if we're re-editing an existing submission

  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSectionEditModal, setShowSectionEditModal] = useState(false);
  const [showOrgHeadsEditModal, setShowOrgHeadsEditModal] = useState(false);
  const [currentSection, setCurrentSection] = useState('organization'); // 'organization', 'advocacy', 'competency', 'orgHeads'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: "", type: "", section: "" });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSectionSummaryModal, setShowSectionSummaryModal] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  const admin = useSelector((state) => state.admin.admin);

  const showMessage = (text, type, section = "") => {
    setMessage({ text, type, section });
    setTimeout(() => setMessage({ text: "", type: "", section: "" }), 5000);
  };

    const validateForm = () => {
    console.log('🔍 validateForm called');
    console.log('📊 Validation data:', { editPreviewData, orgData });
    
    const newErrors = {};
    // Use editPreviewData if available, otherwise fall back to orgData
    const dataToValidate = editPreviewData || orgData;
    console.log('✅ Data being validated:', dataToValidate);
    
    if (!dataToValidate.org?.trim()) {
      newErrors.org = "Organization acronym is required";
      console.log('❌ org validation failed');
    }
    if (!dataToValidate.orgName?.trim()) {
      newErrors.orgName = "Organization name is required";
      console.log('❌ orgName validation failed');
    }
    if (dataToValidate.facebook && !dataToValidate.facebook.includes("facebook.com")) {
      newErrors.facebook = "Please enter a valid Facebook URL";
      console.log('❌ facebook validation failed');
    }
    
    console.log('📝 Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchOrganizationData = useCallback(async () => {
    if (!admin?.org) {
      setLoading(false);
      showMessage("Admin organization information not found", "error");
      return;
    }

    try {
      setLoading(true);
      
      // Fetch organization data
      const orgResponse = await fetch(`${API_BASE_URL}/api/organization/org/${admin.org}`);
      const orgResult = await orgResponse.json();

      if (orgResult.success && orgResult.data) {
        setOrgData({
          id: orgResult.data.id,
          logo: orgResult.data.logo || "",
          org: orgResult.data.org || admin.org,
          orgName: orgResult.data.orgName || admin.orgName || "",
          email: orgResult.data.email || admin.email || "",
          facebook: orgResult.data.facebook || "",
          description: orgResult.data.description || "",
          orgColor: orgResult.data.org_color || "#444444"
        });
      } else {
        setOrgData({
          id: null,
          logo: "",
          org: admin.org || "",
          orgName: admin.orgName || "",
          email: admin.email || "",
          facebook: "",
          description: "",
          orgColor: "#444444"
        });
        showMessage("Organization data initialized from admin account", "info");
      }

      // Fetch advocacy data
      try {
        const advocacyResponse = await fetch(`${API_BASE_URL}/api/advocacies/${orgResult.data?.id || admin.id}`);
        const advocacyResult = await advocacyResponse.json();
        
        if (advocacyResult.success && advocacyResult.data && advocacyResult.data.length > 0) {
          setAdvocacyData({
            id: advocacyResult.data[0].id,
            advocacy: advocacyResult.data[0].advocacy || ""
          });
        } else {
          setAdvocacyData({
            id: null,
            advocacy: ""
          });
        }
      } catch (advocacyError) {
        console.error("Error fetching advocacy data:", advocacyError);
        setAdvocacyData({ id: null, advocacy: "" });
      }

      // Fetch competency data
      try {
        const competencyResponse = await fetch(`${API_BASE_URL}/api/competencies/${orgResult.data?.id || admin.id}`);
        const competencyResult = await competencyResponse.json();
        
        if (competencyResult.success && competencyResult.data && competencyResult.data.length > 0) {
          setCompetencyData({
            id: competencyResult.data[0].id,
            competency: competencyResult.data[0].competency || ""
          });
        } else {
          setCompetencyData({
            id: null,
            competency: ""
          });
        }
      } catch (competencyError) {
        console.error("Error fetching competency data:", competencyError);
        setCompetencyData({ id: null, competency: "" });
      }

      // Fetch organization heads data
      try {
        const headsResponse = await fetch(`${API_BASE_URL}/api/heads/${orgResult.data?.id || admin.id}`);
        const headsResult = await headsResponse.json();
        
        if (headsResult.success && headsResult.data) {
          setOrgHeadsData(headsResult.data);
        } else {
          setOrgHeadsData([]);
        }
      } catch (headsError) {
        console.error("Error fetching organization heads data:", headsError);
        setOrgHeadsData([]);
      }

    } catch (error) {
      console.error("Error fetching organization data:", error);
      showMessage("Failed to load organization data", "error");
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    fetchOrganizationData();
  }, [fetchOrganizationData]);

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
    
    console.log('🔍 handleInputChange called:', { name, value, currentSection, showEditModal });
    
    // Skip email field since it's managed in admin settings
    if (name === 'email') return;
    
    // Handle different sections
    if (currentSection === 'organization') {
      // When editing organization data, update preview data instead of main orgData
      if (showEditModal) {
        console.log('📝 Updating editPreviewData for organization section');
        setEditPreviewData((prev) => {
          const newData = { 
            ...(prev || orgData), 
            [name]: value 
          };
          console.log('🔄 New editPreviewData:', newData);
          return newData;
        });
      } else {
        console.log('📝 Updating orgData directly');
        setOrgData((prev) => ({ ...prev, [name]: value }));
      }
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
        console.error('❌ Upload failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      setModalMessage({ text: "Failed to upload logo", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (currentSection === 'organization') {
      console.log('💾 handleSave called for organization section');
      console.log('📊 Current state:', { editPreviewData, orgData, originalData });
      
      if (!validateForm()) {
        console.log('❌ Validation failed');
        showMessage("Please fix the errors before saving", "error");
        return;
      }

      const currentOrgData = editPreviewData || orgData;
      console.log('🔍 Data to save:', currentOrgData);
      
      const hasChanges = originalData && Object.keys(currentOrgData).some((key) => key !== "id" && key !== "email" && currentOrgData[key] !== originalData[key]);
      console.log('🔄 Has changes:', hasChanges);

      if (!hasChanges) {
        console.log('ℹ️ No changes detected');
        showMessage("No changes detected", "info");
        setShowEditModal(false);
        setIsEditing(false);
        setEditPreviewData(null);
        return;
      }

      console.log('✅ Changes detected, proceeding to save');
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
    console.log('🚀 handleConfirmChanges called');
    console.log('📊 pendingChanges:', pendingChanges);
    
    if (!pendingChanges) return;
    try {
      setSaving(true);
      setShowSummaryModal(false);
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
      
      console.log('🌐 Making API request:', { method, url, body: requestBody });

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success) {
        // Apply the confirmed changes to the main orgData
        setOrgData((prev) => ({
          ...prev,
          ...pendingChanges,
          id: result.data?.id || prev.id
        }));

        // Update local storage with the new organization data
        if (typeof window !== "undefined") {
          const currentAdminData = JSON.parse(localStorage.getItem("adminData") || "{}");
          const updatedAdmin = {
            ...currentAdminData,
            org: pendingChanges.org,
            orgName: pendingChanges.orgName
            // Email is managed in admin settings, so we don't update it here
          };
          localStorage.setItem("adminData", JSON.stringify(updatedAdmin));
        }

        setIsEditing(false);
        setPendingChanges(null);
        setOriginalData(null);
        setEditPreviewData(null); // Reset preview data after successful save
        showMessage("Organization information saved successfully", "success");
      } else {
        throw new Error(result.message || "Failed to save organization information");
      }
    } catch (error) {
      console.error("Save error:", error);
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
      setEditPreviewData(null); // Reset edit preview data
    } else {
      setShowSectionEditModal(false);
    }
    setIsEditing(false);
    setErrors({});
    setCurrentSection('organization');
    setPendingChanges(null);
    setOriginalData(null);
    setTempEditData({}); // Clear temporary editing data
    setReEditSubmissionId(null); // Clear re-edit submission ID
    fetchOrganizationData();
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
      let response;
      if (reEditSubmissionId) {
        // Update existing submission
        response = await fetch(`${API_BASE_URL}/api/submissions/${reEditSubmissionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
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
      setCurrentSection('organization');
      setTempEditData({}); // Clear temporary editing data
      
      const actionText = reEditSubmissionId ? 'updated' : 'submitted';
      setReEditSubmissionId(null); // Clear re-edit submission ID
      
      showMessage(`${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} changes ${actionText} for approval successfully`, "success", currentSection);
      
    } catch (error) {
      console.error("Submit error:", error);
      showMessage(error.message || "Failed to submit changes for approval", "error", currentSection);
      setShowSectionSummaryModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSectionCancelModal = () => {
    setShowSectionSummaryModal(false);
    setPendingChanges(null);
    setCurrentSection('organization');
  };

  // Organization Heads CRUD handlers
  const handleOrgHeadsSave = async () => {
    try {
      setSaving(true);
      setShowOrgHeadsEditModal(false);
      
      const orgId = orgData.id || admin.id;
      
      console.log('Saving org heads data:');
      console.log('Organization ID:', orgId);
      console.log('Heads data:', orgHeadsData);
      
      // Clean up photo data before sending to backend
      const cleanedHeadsData = orgHeadsData.map(head => ({
        ...head,
        photo: head.photo && head.photo.startsWith('data:') ? null : head.photo // Remove base64 data
      }));
      
      console.log('Cleaned heads data:', cleanedHeadsData);
      console.log('Request payload:', {
        organization_id: orgId,
        heads: cleanedHeadsData
      });
      
      const response = await fetch(`${API_BASE_URL}/api/heads/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: orgId,
          heads: cleanedHeadsData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showMessage('Organization heads updated successfully', 'success', 'orgHeads');
        // Refresh the data
        await fetchOrganizationData();
      } else {
        throw new Error(result.message || 'Failed to update organization heads');
      }
    } catch (error) {
      console.error('Organization heads save error:', error);
      showMessage(error.message || 'Failed to update organization heads', 'error', 'orgHeads');
      setShowOrgHeadsEditModal(true); // Reopen modal on error
    } finally {
      setSaving(false);
      setIsEditing(false);
      setCurrentSection('organization');
    }
  };

  const handleOrgHeadsCancel = () => {
    setShowOrgHeadsEditModal(false);
    setIsEditing(false);
    setCurrentSection('organization');
    // Reset orgHeadsData to original state
    fetchOrganizationData();
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
        message={message}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        setShowEditModal={setShowEditModal}
        setOriginalData={setOriginalData}
        setEditPreviewData={setEditPreviewData}
      />

      <div className={pageStyles.sectionsContainer}>
        <div className={pageStyles.sectionColumn}>
          <AdvocacySection
            advocacyData={advocacyData}
            message={message}
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
            message={message}
            setIsEditing={setIsEditing}
            setShowEditModal={setShowSectionEditModal}
            setOriginalData={setOriginalData}
            setCurrentSection={setCurrentSection}
            setTempEditData={setTempEditData}
          />
        </div>
      </div>

      <OrgHeadsSection
        orgHeadsData={orgHeadsData}
        message={message}
        setIsEditing={setIsEditing}
        setShowEditModal={setShowOrgHeadsEditModal}
        setOriginalData={setOriginalData}
        setCurrentSection={setCurrentSection}
        setTempEditData={setTempEditData}
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
      />

      <OrgHeadsEditModal
        isOpen={showOrgHeadsEditModal}
        orgHeadsData={orgHeadsData}
        setOrgHeadsData={setOrgHeadsData}
        handleSave={handleSave}
        handleCancel={handleOrgHeadsCancel}
        saving={saving}
      />

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
    </div>
  );
}