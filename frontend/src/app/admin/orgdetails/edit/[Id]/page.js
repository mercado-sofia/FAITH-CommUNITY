'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSubmitUpdateMutation } from '@/rtk/admin/approvalApi';
import styles from "../../../styles/edit-orgdetails.module.css";  
import OrgInfoSection from "./components/OrgInfoSection";
import AdvocacySection from "./components/AdvocacySection";
import OrgHeadsSection from "./components/OrgHeadsSection";
import PreviewSection from "./components/LivePreview";
import TabsNavigation from "./components/TabsNavigation";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";

export default function OrgDetailsEdit() {
  const params = useParams();
  const router = useRouter();
  const [submitUpdate, { isLoading }] = useSubmitUpdateMutation();

  // Get the ID from params and ensure it's a number
  const id = params?.Id ? parseInt(params.Id, 10) : null;

  const [org, setOrg] = useState({ name: '', logo: '', description: '', facebook: '', email: '', acronym: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [advocacy, setAdvocacy] = useState('');
  const [competency, setCompetency] = useState('');
  const [heads, setHeads] = useState([]);
  const [isPending, setIsPending] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Validate ID
        if (!id) {
          setToast('Invalid organization ID');
          return;
        }

        const response = await fetch(`http://localhost:8080/api/organization/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch organization data');
        }
        const data = await response.json();
        
        // Set organization data with fallbacks
        setOrg({
          name: data.name || '',
          logo: data.logo || '',
          description: data.description || '',
          facebook: data.facebook || '',
          email: data.email || '',
          acronym: data.acronym || ''
        });

        // Set other data with fallbacks
        setAdvocacy(Array.isArray(data.advocacies) ? data.advocacies.join(', ') : '');
        setCompetency(Array.isArray(data.competencies) ? data.competencies.join(', ') : '');
        
        // Format heads data
        const formattedHeads = (data.heads || []).map(head => ({
          name: head.name || '',
          role: head.role || '',
          facebook: head.facebook || '',
          email: head.email || '',
          photo: head.photo || '',
          image: head.photo || '' // Keep track of existing photo
        }));
        setHeads(formattedHeads);

      } catch (error) {
        console.error('Error fetching organization data:', error);
        setToast('Error loading organization data');
      }
    };

    fetchData();
  }, [id]);

  // Redirect if no valid ID
  useEffect(() => {
    if (!id) {
      router.push('/admin/organization');
    }
  }, [id, router]);

  const handleOrgChange = e => setOrg({ ...org, [e.target.name]: e.target.value });

  const addHead = () => setHeads([...heads, { image: '', name: '', role: '', facebook: '', email: '' }]);
  
  const updateHead = (i, field, value) => {
    const updated = [...heads];
    updated[i] = {
      ...updated[i],
      [field]: value,
      // If updating image field with a File object, clear the photo field
      ...(field === 'image' && value instanceof File ? { photo: '' } : {})
    };
    setHeads(updated);
  };

  const deleteHead = i => setHeads(heads.filter((_, idx) => idx !== i));

  const handleFileUpload = async (file) => {
    if (!file) return null;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.');
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'File upload failed');
      }

      const data = await response.json();
      return data.filename;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (isLoading || !id) return;

    try {
    setToast('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

      // Validation
    if (!org.name || !org.acronym || !org.email || !org.description || !advocacy || !competency) {
      setToast('Please fill out all required fields.');
      return;
    }

      for (let head of heads) {
      if (!head.name || !head.role || !head.email) {
          setToast('Please complete all required fields for each organization head.');
        return;
      }
    }

      // Upload logo if changed
      let logoFilename = org.logo;
      if (logoFile) {
        try {
          logoFilename = await handleFileUpload(logoFile);
        } catch (error) {
          setToast(error.message);
          return;
        }
      }

      // Upload head photos if any
      const updatedHeads = await Promise.all(heads.map(async (head) => {
        if (head.image && typeof head.image !== 'string') {
          try {
            const filename = await handleFileUpload(head.image);
            return { 
              name: head.name.trim(),
              role: head.role.trim(),
              facebook: head.facebook.trim(),
              email: head.email.trim(),
              photo: filename
            };
          } catch (error) {
            throw new Error(`Failed to upload photo for head ${head.name}: ${error.message}`);
          }
        }
        return { 
          name: head.name.trim(),
          role: head.role.trim(),
          facebook: head.facebook.trim(),
          email: head.email.trim(),
          photo: head.photo || ''
        };
      }));

      // Get current approved organization data
      const currentRes = await fetch(`http://localhost:8080/api/organization/${id}`);
      if (!currentRes.ok) {
        throw new Error('Failed to fetch current organization data');
      }
      const currentData = await currentRes.json();

      // Format current data as previous version
      const previous = {
        name: currentData.data.name || '',
        acronym: currentData.data.acronym || '',
        description: currentData.data.description || '',
        facebook: currentData.data.facebook || '',
        email: currentData.data.email || '',
        logo: currentData.data.logo || '',
        advocacies: Array.isArray(currentData.data.advocacies) ? currentData.data.advocacies : [],
        competencies: Array.isArray(currentData.data.competencies) ? currentData.data.competencies : [],
        heads: Array.isArray(currentData.data.heads) ? currentData.data.heads.map(head => ({
          name: head?.name || '',
          role: head?.role || '',
          facebook: head?.facebook || '',
          email: head?.email || '',
          photo: head?.photo || ''
        })) : []
      };

      // Prepare the proposed data object
      const proposed = {
        name: org.name.trim(),
        acronym: org.acronym.trim(),
        description: org.description.trim(),
        facebook: org.facebook.trim(),
        email: org.email.trim(),
        logo: logoFilename || '',
        advocacies: advocacy.split(',').map(a => a.trim()).filter(Boolean),
        competencies: competency.split(',').map(c => c.trim()).filter(Boolean),
        heads: updatedHeads
      };

      // Submit the update
      const result = await submitUpdate({
        organization_id: id,
        section: 'organization_details',
        previous: JSON.stringify(previous),
        proposed: JSON.stringify(proposed),
        submitted_by: 1 // TODO: Replace with actual admin ID
      }).unwrap();

      console.log('Submission successful:', result);
      setToast('Changes submitted for approval');
        setIsPending(true);
      
      // Redirect to submissions page after a short delay
        setTimeout(() => {
          router.push('/admin/submissions');
        }, 1500);

    } catch (err) {
      console.error('Error in submission process:', err);
      setToast(err.message || 'An error occurred during submission. Please try again.');
    }
  };

  if (!id) {
    return <div className={styles.container}>Invalid organization ID</div>;
  }

  return (
    <>
      <h1 className={styles.heading}>Edit Organization – ID: {id}</h1>
      <div className={styles.container}>
        {toast && (
          <div className={`${styles.toastMessage} ${toast.includes('Submitted') ? styles.success : styles.error}`}>
            {toast}
          </div>
        )}
        {isPending && (
          <p className={styles.pendingNotice}>
            ⏳ Submission pending review by the Super Admin. Changes won't be visible on the live site until approved.
          </p>
        )}

        <TabsNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "details" && (
          <>
            <OrgInfoSection
              org={org}
              logoFile={logoFile}
              setOrg={setOrg}
              setLogoFile={setLogoFile}
            />
            <AdvocacySection
              advocacy={advocacy}
              competency={competency}
              setAdvocacy={setAdvocacy}
              setCompetency={setCompetency}
            />
            <OrgHeadsSection
              heads={heads}
              addHead={addHead}
              updateHead={updateHead}
              deleteHead={deleteHead}
            />
            <button 
              className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`} 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </>
        )}

        {activeTab === "preview" && (
          <PreviewSection
            org={org}
            logoFile={logoFile}
            advocacy={advocacy}
            competency={competency}
            heads={heads}
          />
        )}
      </div>
    </>
  );
}
