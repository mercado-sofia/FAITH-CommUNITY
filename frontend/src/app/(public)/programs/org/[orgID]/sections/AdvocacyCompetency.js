import styles from '../../org.module.css';
import { FaHeart, FaBrain } from 'react-icons/fa';

export default function AdvocacyCompetency({ acronym, advocacies, competencies }) {
  return (
    <section className={styles.details}>
      <h3 className={styles.sectionTag}>{acronym}&apos;s</h3>
      <h2 className={styles.sectionTitle}>Advocacies and Competencies</h2>

      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaHeart className={styles.iconReact} />
          </div>
          <h4>Advocacies</h4>
          <p>{advocacies ? advocacies : 'No advocacies listed.'}</p>
        </div>

        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaBrain className={styles.iconReact} />
          </div>
          <h4>Competencies</h4>
          <p>{competencies ? competencies : 'No competencies listed.'}</p>
        </div>
      </div>
    </section>
  );
}