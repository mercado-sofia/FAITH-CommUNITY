'use client';

import { useEffect, useState } from 'react';
import styles from './Loader.module.css';

export default function LoaderWrapper({ children }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return children;
}