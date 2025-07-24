'use client';
import { useSelector } from 'react-redux';
import SubmissionTable from './components/SubmissionTable';
import styles from './submissions.module.css';

export default function SubmissionsPage() {
  const adminId = useSelector((state) => state.admin.admin?.id);

  return (
    <div className={styles.container}>
      <h1>My Submitted Changes</h1>
      <SubmissionTable submittedBy={adminId} />
    </div>
  );
}