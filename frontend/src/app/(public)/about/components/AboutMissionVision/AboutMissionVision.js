import styles from './missionVision.module.css';
import { FaRegHeart } from 'react-icons/fa';
import { MdPersonOutline } from 'react-icons/md';

export default function AboutMissionVision() {
  return (
    <section className={styles.details}>
      <h3 className={styles.sectionTag}>FAITH CommUNITY’s</h3>
      <h2 className={styles.sectionTitle}>Mission and Vision</h2>

      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaRegHeart className={styles.iconReact} style={{ fontSize: "35px" }} />
          </div>
          <h4>Mission</h4>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum id diam
            interdum, mollis ligula et, facilisis sem. Sed nec aliquam turpis.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <MdPersonOutline className={styles.iconReact} style={{ fontSize: "40px" }} />
          </div>
          <h4>Vision</h4>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum id diam
            interdum, mollis ligula et, facilisis sem. Sed nec aliquam turpis.
          </p>
        </div>
      </div>
    </section>
  );
}