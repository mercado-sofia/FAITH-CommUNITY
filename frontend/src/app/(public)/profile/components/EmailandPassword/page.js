'use client';

import Email from './ManageEmail/Email';
import Password from './ManagePassword/Password';
import styles from './EmailandPassword.module.css';

export default function EmailandPassword({ userData, setUserData }) {
  return (
    <div className={styles.emailPasswordSection}>
      <div className={styles.sectionHeader}>
        <h2>Email & Password</h2>
      </div>

      <div className={styles.emailPasswordContent}>
        <Email userData={userData} setUserData={setUserData} />
        <Password userData={userData} setUserData={setUserData} />
      </div>
    </div>
  );
}
