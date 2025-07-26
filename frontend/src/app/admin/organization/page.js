"use client"

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { loginAdmin } from "../../../rtk/superadmin/adminSlice";
import OrgHeader from "./components/OrgHeader";
import OrgInfoSection from "./components/OrgInfoSection";
import SummaryModal from "./components/SummaryModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function OrganizationPage() {
  const [orgData, setOrgData] = useState({
    id: null,
    logo: "",
    org: "",
    orgName: "",
    email: "",
    facebook: "",
    description: ""
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  const admin = useSelector((state) => state.admin.admin);
  const dispatch = useDispatch();

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!orgData.org.trim()) newErrors.org = "Organization acronym is required";
    if (!orgData.orgName.trim()) newErrors.orgName = "Organization name is required";
    if (orgData.email && !/\S+@\S+\.\S+/.test(orgData.email)) newErrors.email = "Please enter a valid email address";
    if (orgData.facebook && !orgData.facebook.includes("facebook.com")) newErrors.facebook = "Please enter a valid Facebook URL";
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
      const response = await fetch(`${API_BASE_URL}/api/organization/org/${admin.org}`);
      const result = await response.json();

      if (result.success && result.data) {
        setOrgData({
          id: result.data.id,
          logo: result.data.logo || "",
          org: result.data.org || admin.org,
          orgName: result.data.orgName || admin.orgName || "",
          email: result.data.email || admin.email || "",
          facebook: result.data.facebook || "",
          description: result.data.description || ""
        });
      } else {
        setOrgData({
          id: null,
          logo: "",
          org: admin.org || "",
          orgName: admin.orgName || "",
          email: admin.email || "",
          facebook: "",
          description: ""
        });
        showMessage("Organization data initialized from admin account", "info");
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    console.log('🔍 File selected:', file);
    
    if (!file) return;
    if (!file.type.startsWith("image/")) return showMessage("Please select an image file", "error");
    if (file.size > 5 * 1024 * 1024) return showMessage("File size must be less than 5MB", "error");

    try {
      console.log('📤 Starting upload process...');
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      console.log('🌐 Making request to:', `${API_BASE_URL}/api/upload`);
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Upload result:', result);
        console.log('🖼️ Setting logo URL:', result.url);
        setOrgData((prev) => ({ ...prev, logo: result.url }));
        showMessage("Logo uploaded successfully", "success");
      } else {
        const errorText = await response.text();
        console.error('❌ Upload failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      showMessage("Failed to upload logo", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showMessage("Please fix the errors before saving", "error");
      return;
    }

    const hasChanges = originalData && Object.keys(orgData).some((key) => key !== "id" && orgData[key] !== originalData[key]);

    if (!hasChanges) {
      showMessage("No changes detected", "info");
      setIsEditing(false);
      return;
    }

    setPendingChanges({ ...orgData });
    setShowSummaryModal(true);
  };

  const handleConfirmChanges = async () => {
    if (!pendingChanges) return;
    try {
      setSaving(true);
      setShowSummaryModal(false);
      const method = pendingChanges.id ? "PUT" : "POST";
      const url = pendingChanges.id
        ? `${API_BASE_URL}/api/organization/${pendingChanges.id}`
        : `${API_BASE_URL}/api/organization`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo: pendingChanges.logo || null,
          org: pendingChanges.org,
          orgName: pendingChanges.orgName,
          email: pendingChanges.email || null,
          facebook: pendingChanges.facebook || null,
          description: pendingChanges.description || null,
          status: "ACTIVE"
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success) {
        if (!pendingChanges.id && result.data?.id) {
          setOrgData((prev) => ({ ...prev, id: result.data.id }));
        }

        const updatedAdmin = {
          ...admin,
          org: pendingChanges.org,
          orgName: pendingChanges.orgName,
          email: pendingChanges.email || admin.email
        };

        dispatch(loginAdmin({ token: admin.token || localStorage.getItem("adminToken"), admin: updatedAdmin }));
        if (typeof window !== "undefined") {
          localStorage.setItem("adminData", JSON.stringify(updatedAdmin));
        }

        setIsEditing(false);
        setPendingChanges(null);
        setOriginalData(null);
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
    setIsEditing(false);
    setErrors({});
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <OrgHeader
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        orgData={orgData}
        setOriginalData={setOriginalData}
      />

      <OrgInfoSection
        orgData={orgData}
        setOrgData={setOrgData}
        isEditing={isEditing}
        errors={errors}
        setErrors={setErrors}
        uploading={uploading}
        setUploading={setUploading}
        message={message}
        handleInputChange={handleInputChange}
        handleFileUpload={handleFileUpload}
        handleSave={handleSave}
        handleCancel={handleCancel}
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
    </div>
  );
}