'use client';

import SecureEmailChange from './SecureEmailChange';
import styles from './Email.module.css';

export default function Email({ userData, setUserData }) {
  return <SecureEmailChange userData={userData} setUserData={setUserData} />;
}
