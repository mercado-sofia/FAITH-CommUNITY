import styles from './MissionAndVision.module.css';
import { FaRegHeart } from 'react-icons/fa';
import { MdPersonOutline } from 'react-icons/md';
import { usePublicMissionVision } from '@/hooks/(public)/usePublicData';

export default function MissionAndVision() {
  const { missionVisionData, isLoading, error } = usePublicMissionVision();

  if (error) {
    // Handle error silently in production
  }

  return (
    <section className={styles.details}>
      <h3 className={styles.sectionTag}>FACES</h3>
      <h2 className={styles.sectionTitle}>Mission and Vision</h2>

      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaRegHeart className={styles.iconReact} />
          </div>
          <h4>Mission</h4>
          {isLoading ? (
            <div className={styles.textSkeleton}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
            </div>
          ) : (
            <p>
              {missionVisionData?.mission || 
              'To serve communities through education and engagement, fostering growth and development for a better tomorrow.'}
            </p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <MdPersonOutline className={styles.iconReact} />
          </div>
          <h4>Vision</h4>
          {isLoading ? (
            <div className={styles.textSkeleton}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
            </div>
          ) : (
            <p>
              {missionVisionData?.vision || 
              'To be the leading platform for community extension programs, creating lasting positive impact in society.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}