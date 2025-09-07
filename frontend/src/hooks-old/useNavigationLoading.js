'use client';

import { usePathname, useRouter } from 'next/navigation';

export function useNavigationLoading() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (href) => {
    // Don't navigate if already on the same page
    if (pathname === href) return;
    
    // Navigate immediately
    router.push(href);
  };

  return {
    handleNavigation
  };
}
