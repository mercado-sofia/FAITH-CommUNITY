import styles from './MissionAndVision.module.css';
import { FaRegHeart } from 'react-icons/fa';
import { MdPersonOutline } from 'react-icons/md';
import { usePublicMissionVision, usePublicSiteName } from '../../../hooks/usePublicData';
import { Loader } from '@/components';

export default function MissionAndVision() {
  const { missionVisionData, isLoading, error } = usePublicMissionVision();
  const { siteNameData } = usePublicSiteName();

  if (isLoading) {
    return (
      <section className={styles.details}>
        <h3 className={styles.sectionTag}>{siteNameData?.site_name ? `${siteNameData.site_name}'s` : ''}</h3>
        <h2 className={styles.sectionTitle}>Mission and Vision</h2>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader small />
        </div>
      </section>
    );
  }

  if (error) {
    // Handle error silently in production
  }

  return (
    <section className={styles.details}>
      <h3 className={styles.sectionTag}>{siteNameData?.site_name ? `${siteNameData.site_name}'s` : ''}</h3>
      <h2 className={styles.sectionTitle}>Mission and Vision</h2>

      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaRegHeart className={styles.iconReact} style={{ fontSize: "35px" }} />
          </div>
          <h4>Mission</h4>
          <p>
            {missionVisionData?.mission || 
            'To serve communities through education and engagement, fostering growth and development for a better tomorrow.'}
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <MdPersonOutline className={styles.iconReact} style={{ fontSize: "40px" }} />
          </div>
          <h4>Vision</h4>
          <p>
            {missionVisionData?.vision || 
            'To be the leading platform for community extension programs, creating lasting positive impact in society.'}
          </p>
        </div>
      </div>
    </section>
  );
}