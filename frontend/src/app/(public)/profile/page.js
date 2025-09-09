'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PersonalInfo, EmailandPassword, Notifications, MyApplications } from './components';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ToastContainer, useToast } from './components/common/Toast';
import styles from './profile.module.css';

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal-info');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toasts, removeToast, showError } = useToast();

  // Memoize setUserData to prevent unnecessary re-renders
  const handleSetUserData = useCallback((newUserData) => {
    setUserData(newUserData);
  }, []);

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
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUserData);
      setUserData(user);
    } catch (error) {
      console.error('Error parsing user data:', error);
      showError('Invalid user data. Please log in again.');
      router.push('/login');
      return;
    }

    setIsLoading(false);
  }, [router, showError]);


  if (isLoading) {
    return (
      <div className={styles.container}>
        <LoadingSpinner 
          size="large" 
          message="Loading profile..." 
          fullScreen={false}
        />
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
      <ErrorBoundary>
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
                setUserData={handleSetUserData}
              />
            )}
          </div>
        </div>
      </ErrorBoundary>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}