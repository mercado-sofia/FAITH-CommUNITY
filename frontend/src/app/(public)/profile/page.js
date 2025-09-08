'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PersonalInfo, EmailandPassword, Notifications, MyApplications } from './components';
import styles from './profile.module.css';

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal-info');
  const searchParams = useSearchParams();
  const router = useRouter();

  const navigationItems = [
    {
      id: 'personal-info',
      label: 'Profile Info',
      component: PersonalInfo
    },
    {
      id: 'email-password',
      label: 'Email & Password',
      component: EmailandPassword
    },
    {
      id: 'notifications',
      label: 'Notifications',
      component: Notifications
    },
    {
      id: 'applications',
      label: 'My Applications',
      component: MyApplications
    }
  ];

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const validTabs = ['personal-info', 'email-password', 'notifications', 'applications'];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (!token || !storedUserData) {
      window.location.href = '/login';
      return;
    }

    try {
      const user = JSON.parse(storedUserData);
      setUserData(user);
    } catch (error) {
      window.location.href = '/login';
      return;
    }

    setIsLoading(false);
  }, []);


  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const ActiveComponent = navigationItems.find(item => item.id === activeTab)?.component;

  return (
    <div className={styles.container}>
      <div className={styles.profileLayout}>
        {/* Side Navigation */}
        <div className={styles.sideNavigation}>
          <div className={styles.navHeader}>
            <h2>Manage Profile</h2>
          </div>
          <nav className={styles.navMenu}>
            {navigationItems.map((item) => {
              return (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {ActiveComponent && (
            <ActiveComponent 
              userData={userData} 
              setUserData={setUserData}
            />
          )}
        </div>
      </div>
    </div>
  );
}