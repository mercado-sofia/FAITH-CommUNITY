'use client';

import Sidebar from './components/Sidebar';
import styles from './styles/dashboard.module.css';
import ReduxProvider from '../ReduxProvider';

export default function AdminLayout({ children }) {
  return (
    <ReduxProvider>
      <Sidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
    </ReduxProvider>
  );
}