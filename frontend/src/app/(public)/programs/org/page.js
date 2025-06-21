'use client';

import styles from './org.module.css';
import Image from 'next/image';
import PageBanner from '../../components/PageBanner';
import { FaFacebookF, FaEnvelope, FaPlus, FaHeart, FaBrain } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function OrgDetails() {
  const { org } = useParams();
  const scrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgData, setOrgData] = useState({
    name: '',
    acronym: '',
    description: '',
    facebook: '',
    email: '',
    logo: ''
  });
  const [advocacies, setAdvocacies] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [heads, setHeads] = useState([]);
  const [imageError, setImageError] = useState(false);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/logo/faith_community_logo.png';
    return imagePath.startsWith('/uploads/')
      ? `http://localhost:8080${imagePath}`
      : `http://localhost:8080/uploads/${imagePath}`;
  };

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        setLoading(true);

        const response = await fetch(`http://localhost:8080/api/organization/by-slug/${org}`);
        if (!response.ok) throw new Error(`Failed to fetch organization data: ${response.statusText}`);
        
        const data = await response.json();
        if (!data || !data.data) throw new Error('No organization data found');

        setOrgData({
          name: data.data.name,
          acronym: data.data.acronym,
          description: data.data.description,
          facebook: data.data.facebook,
          email: data.data.email,
          logo: data.data.logo
        });

        setAdvocacies(data.data.advocacies || []);
        setCompetencies(data.data.competencies || []);
        setHeads(Array.isArray(data.data.heads) ? data.data.heads : []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [org]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  if (loading) return <div>Loading organization details...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageBanner
        title="Programs and Services"
        backgroundImage="/sample/sample2.jpg"
        breadcrumbs={[
            { href: "/", label: "Home" },
            { href: "/programs", label: "Programs and Services" },
            { label: orgId.toUpperCase() },
        ]}
      />
    
      {/* ORG INFO */}
      <section className={styles.orgSection}>
        <div className={styles.orgCard}>
          <div className={styles.logoWrapper}>
            <Image
              src={getImageUrl(orgData.logo)}
              alt={`${orgData.name} Logo`}
              width={220}
              height={220}
              className={styles.orgLogo}
              onError={() => setImageError(true)}
            />
          </div>
          <div className={styles.orgText}>
            <p className={styles.orgTag}>{orgData.acronym}</p>
            <h2 className={styles.orgTitle}>{orgData.name}</h2>
            <p className={styles.orgDesc}>{orgData.description}</p>
            <div className={styles.orgIcons}>
              {orgData.facebook && (
                <a href={orgData.facebook} target="_blank" rel="noopener noreferrer">
                  <FaFacebookF />
                </a>
              )}
              {orgData.email && (
                <a href={`mailto:${orgData.email}`}>
                  <FaEnvelope />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ADVOCACIES */}
      <section className={styles.details}>
        <h3 className={styles.sectionTag}>{orgData.acronym}</h3>
        <h2 className={styles.sectionTitle}>Advocacies and Competencies</h2>
        <div className={styles.cardWrapper}>
          <div className={styles.card}>
            <div className={styles.iconCircle}><FaHeart /></div>
            <h4>Advocacies</h4>
            <p>{advocacies.join(', ') || 'No advocacies listed.'}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.iconCircle}><FaBrain /></div>
            <h4>Competencies</h4>
            <p>{competencies.join(', ') || 'No competencies listed.'}</p>
          </div>
        </div>
      </section>

      {/* FEATURED (Placeholder until dynamic) */}
      <section className={styles.featuredSection}>
        <p className={styles.subheading}>Together, We Made These Happen</p>
        <h2 className={styles.heading}>Featured Projects</h2>
        <div className={styles.projectGrid}>
          {/* Optional: Fetch or filter featured projects */}
          <div className={styles.projectCard}>
            <Image src="/sample/sample1.jpg" alt="Sample" width={280} height={160} />
            <div className={styles.projectoverlay}>
              <div className={styles.projectText}>
                <h4>Sample Project</h4>
                <p>Description of the project.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VOLUNTEER CTA */}
      <section className={styles.volunteerBanner}>
        <div className={styles.bannerContent}>
          <p>Support {orgData.acronym} Initiatives and Volunteer with Us!</p>
          <button className={styles.joinBtn}>Join as a Volunteer</button>
        </div>
      </section>

      {/* ORG HEADS */}
      <section className={styles.orgheadsSection}>
        <div className={styles.orgheadsWrapper}>
          <div className={styles.orgheadsText}>
            <p>Organization Heads</p>
            <h2>Meet The<br />Organization Heads</h2>
          </div>
          <div className={styles.orgheadsCarousel}>
            <button onClick={scrollLeft} className={styles.orgheadsNavBtn}><ChevronLeft /></button>
            <div className={styles.carouselWindow}>
              <div ref={scrollRef} className={styles.orgheadsCards}>
                {heads.map((head, i) => (
                  <div key={i} className={styles.orgheadsWrapperItem}>
                    <div className={styles.imageContainer}>
                      <Image
                        src={getImageUrl(head.photo)}
                        alt={head.name}
                        width={240}
                        height={280}
                        className={styles.headImage}
                        onError={(e) => e.target.src = '/logo/faith_community_logo.png'}
                      />
                      <div className={styles.iconBar}>
                        {head.facebook && (
                          <a href={head.facebook} target="_blank" rel="noreferrer" className={styles.iconBtn}>
                            <FaFacebookF />
                          </a>
                        )}
                        <button className={`${styles.iconBtn} ${styles.plusBtn}`}><FaPlus /></button>
                        {head.email && (
                          <a href={`mailto:${head.email}`} className={styles.iconBtn}>
                            <FaEnvelope />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className={styles.orgheadsTextInfo}>
                      <h4>{head.name}</h4>
                      <p>{head.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={scrollRight} className={styles.orgheadsNavBtn}><ChevronRight /></button>
          </div>
        </div>
      </section>
    </>
  );
}