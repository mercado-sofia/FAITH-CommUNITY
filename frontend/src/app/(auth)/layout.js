'use client';

import { DynamicFavicon } from '@/components';

/**
 * Layout for authentication pages (login, signup, reset-password, etc.)
 * Includes dynamic favicon support
 */
export default function AuthLayout({ children }) {
  return (
    <>
      {/* Dynamic Favicon - updates based on branding data */}
      <DynamicFavicon />
      {children}
    </>
  );
}

