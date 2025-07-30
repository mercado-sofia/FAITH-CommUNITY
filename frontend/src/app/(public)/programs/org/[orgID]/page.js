'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Loader from '../../../../../components/Loader';
import BannerSection from '../../../components/PageBanner';
import OrgInfoCard from './components/OrgInfoCard';
import AdvocacyCompetency from './components/AdvocacyCompetency';
import FeaturedProjects from './components/FeaturedProjects';
import OrgHeadsCarousel from './components/OrgHeadsCarousel';
import styles from '../org.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

let hasVisited = false;

export default function OrgPage() {
  const { orgID } = useParams();
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  // Fetch organization data using the exact same logic as /admin/organization
  useEffect(() => {
    const fetchOrgData = async () => {
      if (!orgID) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch organization data (same as admin page)
        const orgResponse = await fetch(`${API_BASE_URL}/api/organization/org/${orgID}`);
        const orgResult = await orgResponse.json();
        
        let orgInfo = {};
        let organizationId = null;
        
        if (orgResult.success && orgResult.data) {
          orgInfo = {
            id: orgResult.data.id,
            logo: orgResult.data.logo || '/logo/faith_community_logo.png',
            org: orgResult.data.org || orgID,
            orgName: orgResult.data.orgName || '',
            email: orgResult.data.email || '',
            facebook: orgResult.data.facebook || '',
            description: orgResult.data.description || ''
          };
          organizationId = orgResult.data.id;
        } else {
          // Organization not found, use default
          orgInfo = {
            id: null,
            logo: '/logo/faith_community_logo.png',
            org: orgID,
            orgName: 'Organization Not Found',
            email: '',
            facebook: '',
            description: 'No data available for this organization.'
          };
        }
        
        // Fetch advocacy data (same as admin page)
        let advocacyData = { id: null, advocacy: '' };
        if (organizationId) {
          try {
            const advocacyResponse = await fetch(`${API_BASE_URL}/api/advocacies/${organizationId}`);
            const advocacyResult = await advocacyResponse.json();
            
            if (advocacyResult.success && advocacyResult.data && advocacyResult.data.length > 0) {
              advocacyData = {
                id: advocacyResult.data[0].id,
                advocacy: advocacyResult.data[0].advocacy || ''
              };
            }
          } catch (advocacyError) {
            console.error('Error fetching advocacy data:', advocacyError);
          }
        }
        
        // Fetch competency data (same as admin page)
        let competencyData = { id: null, competency: '' };
        if (organizationId) {
          try {
            const competencyResponse = await fetch(`${API_BASE_URL}/api/competencies/${organizationId}`);
            const competencyResult = await competencyResponse.json();
            
            if (competencyResult.success && competencyResult.data && competencyResult.data.length > 0) {
              competencyData = {
                id: competencyResult.data[0].id,
                competency: competencyResult.data[0].competency || ''
              };
            }
          } catch (competencyError) {
            console.error('Error fetching competency data:', competencyError);
          }
        }
        
        // Fetch heads data
        let headsData = [];
        if (organizationId) {
          try {
            const headsResponse = await fetch(`${API_BASE_URL}/api/heads/${organizationId}`);
            const headsResult = await headsResponse.json();
            
            if (headsResult.success && headsResult.data && Array.isArray(headsResult.data)) {
              // Map backend field names to frontend expected names
              headsData = headsResult.data.map(head => ({
                name: head.head_name || head.name,
                role: head.role,
                photo: head.photo || '/default.png',
                facebook: head.facebook,
                email: head.email,
                display_order: head.display_order
              }));
              
              // Sort heads by display_order (same logic as admin page)
              headsData.sort((a, b) => {
                const orderA = a.display_order || 999;
                const orderB = b.display_order || 999;
                if (orderA !== orderB) {
                  return orderA - orderB;
                }
                // Fallback to name sorting for same/missing orders
                return (a.name || '').localeCompare(b.name || '');
              });
            }
          } catch (headsError) {
            console.error('Error fetching heads data:', headsError);
          }
        }
        
        // Parse advocacy data for display
        let advocacies = [];
        if (advocacyData.advocacy) {
          try {
            // Check if it's already a valid JSON string
            let advocacyParsed;
            if (typeof advocacyData.advocacy === 'string') {
              // Try to parse as JSON, if it fails, treat as plain text
              try {
                advocacyParsed = JSON.parse(advocacyData.advocacy);
              } catch (jsonError) {
                // If JSON parsing fails, treat as plain text
                console.warn('Advocacy data is not valid JSON, treating as plain text:', advocacyData.advocacy);
                advocacies.push(advocacyData.advocacy);
                advocacyParsed = null;
              }
            } else {
              advocacyParsed = advocacyData.advocacy;
            }
            
            // Only process as structured data if JSON parsing succeeded
            if (advocacyParsed && typeof advocacyParsed === 'object') {
              if (advocacyParsed.mission) advocacies.push(`Mission: ${advocacyParsed.mission}`);
              if (advocacyParsed.vision) advocacies.push(`Vision: ${advocacyParsed.vision}`);
              if (advocacyParsed.goals) advocacies.push(`Goals: ${advocacyParsed.goals}`);
              if (advocacyParsed.targetBeneficiaries) advocacies.push(`Target: ${advocacyParsed.targetBeneficiaries}`);
              if (advocacyParsed.keyPrograms) advocacies.push(`Programs: ${advocacyParsed.keyPrograms}`);
            }
          } catch (e) {
            console.error('Error processing advocacy data:', e);
            // Fallback: use raw data as single item
            if (typeof advocacyData.advocacy === 'string') {
              advocacies.push(advocacyData.advocacy);
            }
          }
        }
        
        // Parse competency data for display
        let competencies = [];
        if (competencyData.competency) {
          try {
            // Check if it's already a valid JSON string
            let competencyParsed;
            if (typeof competencyData.competency === 'string') {
              // Try to parse as JSON, if it fails, treat as plain text
              try {
                competencyParsed = JSON.parse(competencyData.competency);
              } catch (jsonError) {
                // If JSON parsing fails, treat as plain text
                console.warn('Competency data is not valid JSON, treating as plain text:', competencyData.competency);
                competencies.push(competencyData.competency);
                competencyParsed = null;
              }
            } else {
              competencyParsed = competencyData.competency;
            }
            
            // Only process as structured data if JSON parsing succeeded
            if (competencyParsed && typeof competencyParsed === 'object') {
              if (competencyParsed.coreCompetencies) competencies.push(competencyParsed.coreCompetencies);
              if (competencyParsed.expertiseAreas) competencies.push(competencyParsed.expertiseAreas);
              if (competencyParsed.certifications) competencies.push(competencyParsed.certifications);
              if (competencyParsed.partnerships) competencies.push(competencyParsed.partnerships);
              if (competencyParsed.resources) competencies.push(competencyParsed.resources);
              if (competencyParsed.achievements) competencies.push(competencyParsed.achievements);
            }
          } catch (e) {
            console.error('Error processing competency data:', e);
            // Fallback: use raw data as single item
            if (typeof competencyData.competency === 'string') {
              competencies.push(competencyData.competency);
            }
          }
        }
        
        // Construct the final organization data for public display
        const finalOrgData = {
          name: orgInfo.orgName || 'Organization Not Found',
          acronym: orgInfo.org || orgID.toUpperCase(),
          description: orgInfo.description || '',
          facebook: orgInfo.facebook || '',
          email: orgInfo.email || '',
          logo: orgInfo.logo || '/logo/faith_community_logo.png',
          advocacies: advocacies,
          competencies: competencies,
          heads: headsData,
          featuredProjects: [] // Placeholder for future implementation
        };
        
        setOrgData(finalOrgData);
        
      } catch (error) {
        console.error('Error fetching organization data:', error);
        setError('Failed to load organization data');
        // Set fallback data on error
        setOrgData({
          name: 'Organization Not Found',
          acronym: orgID?.toUpperCase() || 'ORG',
          description: 'No data available for this organization.',
          facebook: '',
          email: '',
          logo: '/logo/faith_community_logo.png',
          advocacies: [],
          competencies: [],
          heads: [],
          featuredProjects: [],
        });
      }
    };

    fetchOrgData();
  }, [orgID]);

  // Image preloading and loading management
  const imageUrls = useMemo(() => {
    if (!orgData) return [];
    return [
      orgData.logo,
      ...orgData.heads.map((h) => h.photo || ''),
      ...orgData.featuredProjects.map((p) => p.image || ''),
    ].filter(Boolean);
  }, [orgData]);

  useEffect(() => {
    if (!orgData) return;
    
    const timeoutPromise = new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 1000);
    });

    const imageLoadPromises = imageUrls.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = img.onerror = resolve;
      });
    });

    Promise.all([timeoutPromise, ...imageLoadPromises]).then(() => {
      setLoading(false);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [orgData, imageUrls]);

  if (loading || !orgData) return <Loader small />;

  return (
    <>
      <BannerSection
        title="Programs and Services"
        backgroundImage="/sample/sample2.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { href: '/programs', label: 'Programs and Services' },
          { label: orgData.acronym },
        ]}
      />

      {error && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>{error}</p>
        </div>
      )}

      <OrgInfoCard data={orgData} />
      <AdvocacyCompetency
        acronym={orgData.acronym}
        advocacies={orgData.advocacies}
        competencies={orgData.competencies}
      />
      <FeaturedProjects projects={orgData.featuredProjects} />

      <section className={styles.volunteerBanner}>
        <div className={styles.bannerContent}>
          <p>Support {orgData.acronym}&apos;s Initiatives and Volunteer with Us!</p>
          <button className={styles.joinBtn}>Join as a Volunteer</button>
        </div>
      </section>

      <OrgHeadsCarousel heads={orgData.heads} />
    </>
  );
}