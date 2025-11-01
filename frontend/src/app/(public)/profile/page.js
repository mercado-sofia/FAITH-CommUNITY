'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PersonalInfo, EmailandPassword, Notifications, MyApplications } from './NavTabs';
import { ErrorBoundary, Loader } from '@/components';
import { ToastContainer, useToast } from '../components/Toast';
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';
import styles from './profile.module.css';

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('personal-info');
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toasts, removeToast, showError } = useToast();
  
  // Use centralized page loader hook
  const { loading, pageReady } = usePublicPageLoader('profile');

  // Memoize setUserData to prevent unnecessary re-renders
  const handleSetUserData = useCallback((newUserData) => {
    setUserData(newUserData);
  }, []);

  const navigationItems = [
    {
      id: 'personal-info',
      label: 'Profile Info',
      mobileLabel: 'Profile',
      component: PersonalInfo
    },
    {
      id: 'email-password',
      label: 'Email & Password',
      mobileLabel: 'Email & Password',
      component: EmailandPassword
    },
    {
      id: 'notifications',
      label: 'Notifications',
      mobileLabel: 'Notifications',
      component: Notifications
    },
    {
      id: 'applications',
      label: 'My Applications',
      mobileLabel: 'Applications',
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

  // Track viewport for mobile-specific labels
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);


  // Handle user authentication and data loading
  useEffect(() => {
    if (!pageReady) return;

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
      showError('Invalid user data. Please log in again.');
      router.push('/login');
      return;
    }
  }, [pageReady, router, showError]);


  if (loading || !pageReady) {
    return <Loader small centered />;
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
      <ErrorBoundary compact>
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
                    <span>{isMobile ? (item.mobileLabel ?? item.label) : item.label}</span>
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