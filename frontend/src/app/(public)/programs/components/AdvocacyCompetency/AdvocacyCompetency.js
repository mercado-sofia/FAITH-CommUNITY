'use client';

import styles from './AdvocacyCompetency.module.css';
import { FaHeart, FaBrain } from 'react-icons/fa';

// Helper function to normalize advocacy/competency data
const normalizeTextData = (value) => {
  if (!value) return ""
  
  // If it's already a string, check if it's a JSON string
  if (typeof value === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value)
      // If parsed result is an object (like {}), return empty string
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
        return ""
      }
      // If parsed result is a string, return it
      if (typeof parsed === 'string') {
        return parsed
      }
      // Otherwise return empty string for other object types
      return ""
    } catch (e) {
      // Not JSON, return as-is
      return value
    }
  }
  
  // If it's an object, check if it's empty
  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value).length === 0) {
      return ""
    }
    // If object has content, try to stringify (shouldn't happen, but handle it)
    return JSON.stringify(value)
  }
  
  // For other types, convert to string
  return String(value)
}

export default function AdvocacyCompetency({ acronym, advocacies, competencies }) {
  // Normalize the data to ensure it's always a string
  const normalizedAdvocacies = normalizeTextData(advocacies)
  const normalizedCompetencies = normalizeTextData(competencies)

  return (
    <section className={styles.details}>
      <div>
        <h3 className={styles.sectionTag}>{acronym}&apos;s</h3>
        <h2 className={styles.sectionTitle}>Advocacies and Competencies</h2>
      </div>

      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaHeart className={styles.iconReact} />
          </div>
          <h4>Advocacies</h4>
          <p>{normalizedAdvocacies || 'No advocacies listed.'}</p>
        </div>

        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <FaBrain className={styles.iconReact} />
          </div>
          <h4>Competencies</h4>
          <p>{normalizedCompetencies || 'No competencies listed.'}</p>
        </div>
      </div>
    </section>
  );
}