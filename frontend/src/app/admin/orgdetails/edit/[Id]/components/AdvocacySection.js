"use client";

import styles from "../../../../styles/edit-orgdetails.module.css";    
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";

export default function AdvocacySection({ advocacy, setAdvocacy, competency, setCompetency }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>2</span>
        <h2 className={styles.sectionTitle}>Advocacy & Competency</h2>
      </div>
      <div className={styles.formGroup}>
        <div className={styles.inputRow}>
          <label htmlFor="orgAdvocacies" className={styles.inputLabel}>Advocacies</label>
          <textarea
            id="orgAdvocacies"
            className={styles.textarea}
            placeholder="Advocacies"
            value={advocacy}
            onChange={(e) => setAdvocacy(e.target.value)}
            name="advocacy"
            autoComplete="off"
          />
        </div>
        <div className={styles.inputRow}>
          <label htmlFor="orgCompetencies" className={styles.inputLabel}>Competencies</label>
          <textarea
            id="orgCompetencies"
            className={styles.textarea}
            placeholder="Competencies"
            value={competency}
            onChange={(e) => setCompetency(e.target.value)}
            name="competency"
            autoComplete="off"
          />
        </div>
      </div>
    </section>
  );
}