"use client";

import { useEffect, useRef } from 'react';
import { useGetAllInvitationsQuery } from '../../../rtk/superadmin/invitationsApi';

const SEEN_INVITATIONS_KEY = 'superadmin_seen_accepted_invitations';

/**
 * Hook to check for accepted invitations and show toast notifications
 * This hook runs when the superadmin logs in and shows toasts for newly accepted invitations
 */
export function useAcceptedInvitationsToast() {
  const { data: invitations, isLoading } = useGetAllInvitationsQuery();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if superadmin is authenticated
    const token = localStorage.getItem('superAdminToken');
    if (!token) return;

    // Don't run if still loading or no invitations data
    if (isLoading || !invitations || !Array.isArray(invitations)) return;

    // Get the list of seen invitation IDs from localStorage
    const getSeenInvitationIds = () => {
      try {
        const seen = localStorage.getItem(SEEN_INVITATIONS_KEY);
        return seen ? JSON.parse(seen) : [];
      } catch (e) {
        return [];
      }
    };

    // Save seen invitation IDs to localStorage
    const saveSeenInvitationIds = (ids) => {
      try {
        localStorage.setItem(SEEN_INVITATIONS_KEY, JSON.stringify(ids));
      } catch (e) {
        console.error('Failed to save seen invitations:', e);
      }
    };

    // Check if we've already checked in this session
    // We want to check once when the component mounts (on login)
    if (hasCheckedRef.current) return;

    // Filter for accepted invitations
    const acceptedInvitations = invitations.filter(
      (invitation) => invitation.status === 'accepted' && invitation.accepted_at
    );

    if (acceptedInvitations.length === 0) {
      hasCheckedRef.current = true;
      return;
    }

    // Get previously seen invitation IDs
    const seenIds = getSeenInvitationIds();

    // Find newly accepted invitations (accepted but not yet seen)
    const newAcceptedInvitations = acceptedInvitations.filter(
      (invitation) => !seenIds.includes(invitation.id)
    );

    if (newAcceptedInvitations.length === 0) {
      hasCheckedRef.current = true;
      return;
    }

    // Show toast for each newly accepted invitation
    // Add a small delay between toasts to avoid overwhelming the user
    newAcceptedInvitations.forEach((invitation, index) => {
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.showSuperAdminToast) {
          const email = invitation.email || 'an admin';
          window.showSuperAdminToast(
            {
              heading: 'Admin Invitation Accepted',
              body: `${email} accepted your invitation`
            },
            'success',
            6000 // 6 seconds duration (not used since no auto-dismiss)
          );
        }
      }, index * 500); // 500ms delay between each toast
    });

    // Mark only the newly accepted invitations as seen (avoid duplicates)
    const newAcceptedIds = newAcceptedInvitations.map((inv) => inv.id);
    const updatedSeenIds = [...new Set([...seenIds, ...newAcceptedIds])]; // Deduplicate
    saveSeenInvitationIds(updatedSeenIds);

    // Mark as checked for this session
    hasCheckedRef.current = true;
  }, [invitations, isLoading]);
}

