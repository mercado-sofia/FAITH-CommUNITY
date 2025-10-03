'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import styles from './styles/NavigationLinks.module.css';

export default function NavigationLinks() {
  const router = useRouter();
  const pathname = usePathname();

  // Prefetch on hover
  const handleLinkHover = useCallback(
    (href) => {
      if (href && href !== '/') router.prefetch(href);
    },
    [router]
  );

  // Check if link is active
  const isLinkActive = useCallback((href) => {
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/faithree') {
      return pathname.includes('faithree');
    }
    return pathname.startsWith(href);
  }, [pathname]);

  return (
    <div className={styles.navLinks}>
      <Link 
        href="/" 
        className={`${styles.navLink} ${isLinkActive('/') ? styles.active : ''}`}
        onMouseEnter={() => handleLinkHover('/')}
      >
        Home
      </Link>
      <Link 
        href="/about" 
        className={`${styles.navLink} ${isLinkActive('/about') ? styles.active : ''}`}
        onMouseEnter={() => handleLinkHover('/about')}
      >
        About Us
      </Link>
      <Link 
        href="/programs" 
        className={`${styles.navLink} ${isLinkActive('/programs') ? styles.active : ''}`}
        onMouseEnter={() => handleLinkHover('/programs')}
      >
        Programs and Services
      </Link>
      <Link 
        href="/faithree" 
        className={`${styles.navLink} ${isLinkActive('/faithree') ? styles.active : ''}`}
        onMouseEnter={() => handleLinkHover('/faithree')}
      >
        FAITHree
      </Link>
      <Link 
        href="/faqs" 
        className={`${styles.navLink} ${isLinkActive('/faqs') ? styles.active : ''}`}
        onMouseEnter={() => handleLinkHover('/faqs')}
      >
        FAQs
      </Link>
    </div>
  );
}