'use client';

import styles from "../../../../styles/edit-orgdetails.module.css";  
import { FaFacebookF, FaEnvelope, FaPlus, FaHeart, FaBrain, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import { useRef } from "react";

export default function PreviewSection({ org, logoFile, advocacy, competency, heads }) {
  
  const scrollRef = useRef(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -540, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 540, behavior: 'smooth' });
  };

  return (
    <>
      {/* ORG INFO PREVIEW */}
      <h3 className={styles.previewLabel}>
        Organization Info: <strong className={styles.previewHighlight}>Live Preview</strong>
      </h3>
      <div className={styles.livePreviewBox}>
        <section className={styles.adminOrgSection}>
          <div className={styles.adminOrgCard}>
            {logoFile && (
              <img src={URL.createObjectURL(logoFile)} alt="Org Logo" width={170} height={170} className={styles.adminOrgLogo} />
            )}
            <div className={styles.adminOrgText}>
              <p className={styles.adminOrgTag}>{org.acronym || 'ORG TAG'}</p>
              <h2 className={styles.adminOrgTitle}>{org.name || 'Organization Name'}</h2>
              <p className={styles.adminOrgDesc}>{org.description || 'Your description will appear here.'}</p>
              <div className={styles.adminOrgIcons}>
                {org.facebook && (
                  <a href={org.facebook} target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
                )}
                {org.email && (
                  <a href={`mailto:${org.email}`}><FaEnvelope /></a>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ADVOCACY PREVIEW */}
      <h3 className={styles.previewLabel}>
        Advocacy and Competency: <strong className={styles.previewHighlight}>Live Preview</strong>
      </h3>
      <div className={styles.livePreviewBox}>
        <section className={styles.advocacyDetails}>
          <h3 className={styles.advocacyTag}>{org.acronym || 'ORG'}</h3>
          <h2 className={styles.advocacyTitle}>Advocacies and Competencies</h2>
          <div className={styles.advocacyCardWrapper}>
            <div className={styles.advocacyCard}>
              <div className={styles.advocacyIconCircle}>
                <FaHeart className={styles.advocacyIconReact} />
              </div>
              <h4>Advocacies</h4>
              <p>{advocacy || 'Your advocacy description will appear here.'}</p>
            </div>
            <div className={styles.advocacyCard}>
              <div className={styles.advocacyIconCircle}>
                <FaBrain className={styles.advocacyIconReact} />
              </div>
              <h4>Competencies</h4>
              <p>{competency || 'Your competency description will appear here.'}</p>
            </div>
          </div>
        </section>
      </div>

      {/* HEADS PREVIEW */}
      <h3 className={styles.previewLabel}>
        Organization Heads: <strong className={styles.previewHighlight}>Live Preview</strong>
      </h3>
      <div className={styles.livePreviewBox}>
        <section className={styles.adminOrgheadsSection}>
          <div className={styles.adminOrgheadsWrapper}>
            <div className={styles.adminOrgheadsText}>
              <p>Organization Heads</p>
              <h2>
                Meet The
                <br />
                Organization Heads
              </h2>
            </div>

            <div className={styles.adminOrgheadsCarousel}>
              <button onClick={scrollLeft} className={styles.adminNavBtn}>
                <FaChevronLeft />
              </button>

              <div className={styles.adminCarouselWindow}>
                <div ref={scrollRef} className={styles.adminOrgheadsCards}>
                  {heads.map((head, i) => (
                    <div key={i} className={styles.adminOrgheadsWrapperItem}>
                      <div className={styles.adminImageContainer}>
                        {head.image && (
                          <img
                            src={URL.createObjectURL(head.image)}
                            alt={head.name}
                            className={styles.adminHeadImage}
                            width={160}
                            height={200}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/logo/faith_community_logo.png';
                            }}
                          />
                        )}
                        <div className={styles.adminIconBar}>
                          {head.facebook && (
                            <a
                              href={head.facebook}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.adminIconBtn}
                            >
                              <FaFacebookF />
                            </a>
                          )}
                          <button className={`${styles.adminIconBtn} ${styles.adminPlusBtn}`}>
                            <FaPlus />
                          </button>
                          {head.email && (
                            <a href={`mailto:${head.email}`} className={styles.adminIconBtn}>
                              <FaEnvelope />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className={styles.adminOrgheadsTextInfo}>
                        <h4>{head.name || "Org Head"}</h4>
                        <p>{head.role || "Role"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={scrollRight} className={styles.adminNavBtn}>
                <FaChevronRight />
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}