import styles from './OrgInfoCard.module.css';
import Image from 'next/image';
import { FaFacebookF, FaEnvelope } from 'react-icons/fa';
import { getOrganizationImageUrl, isUnavailableImage } from '@/utils/uploadPaths';
import { UnavailableImagePlaceholder } from '@/components';

export default function OrgInfoCard({ data }) {
  const { name, acronym, description, facebook, email, logo } = data;

  return (
    <section className={styles.orgSection}>
      <div className={styles.orgCard}>
        <div className={styles.logoWrapper}>
          {(() => {
            const orgImageUrl = getOrganizationImageUrl(logo, 'logo');
            if (isUnavailableImage(orgImageUrl)) {
              return (
                <UnavailableImagePlaceholder 
                  width="220px" 
                  height="220px" 
                  text="Logo Unavailable"
                  className={styles.orgLogo}
                />
              );
            }
            return (
              <Image
                src={orgImageUrl}
                alt={`${name} Logo`}
                width={220}
                height={220}
                className={styles.orgLogo}
                priority
                onError={(e) => {
                  e.target.src = '/defaults/default.png';
                }}
              />
            );
          })()}
        </div>
        <div className={styles.orgText}>
          <p className={styles.orgTag}>{acronym}</p>
          <h2 className={styles.orgTitle}>{name}</h2>
          <p className={styles.orgDesc}>{description}</p>
          <div className={styles.orgIcons}>
            {facebook && (
              <a href={facebook} target="_blank" rel="noopener noreferrer">
                <FaFacebookF />
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`}>
                <FaEnvelope />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}