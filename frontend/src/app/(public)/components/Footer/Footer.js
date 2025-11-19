"use client";

import Link from "next/link";
import styles from "./Footer.module.css";
import { 
  FaFacebook, 
  FaInstagram, 
  FaYoutube, 
  FaLinkedin, 
  FaTiktok, 
  FaPinterest, 
  FaSnapchat, 
  FaWhatsapp, 
  FaTelegram, 
  FaDiscord, 
  FaReddit, 
  FaTwitch, 
  FaSpotify, 
  FaApple, 
  FaGoogle, 
  FaGithub, 
  FaDribbble, 
  FaBehance, 
  FaMedium, 
  FaVimeo, 
  FaSkype, 
  FaSlack,
  FaPhoneAlt, 
  FaEnvelope 
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiMiniArrowRight } from "react-icons/hi2";
import { Send } from "lucide-react";
import { LuCircleCheck } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Toast from "../Toast/Toast";
import { usePublicSiteName, usePublicFooterContent } from "../../hooks/usePublicData";

import { API_BASE_URL } from '@/config/api';
const API_BASE = API_BASE_URL || '';

// Social media platform mapping with icons
const SOCIAL_PLATFORMS = {
  'Facebook': FaFacebook,
  'Instagram': FaInstagram,
  'X': FaXTwitter,
  'YouTube': FaYoutube,
  'LinkedIn': FaLinkedin,
  'TikTok': FaTiktok,
  'Pinterest': FaPinterest,
  'Snapchat': FaSnapchat,
  'WhatsApp': FaWhatsapp,
  'Telegram': FaTelegram,
  'Discord': FaDiscord,
  'Reddit': FaReddit,
  'Twitch': FaTwitch,
  'Spotify': FaSpotify,
  'Apple Music': FaApple,
  'Google': FaGoogle,
  'GitHub': FaGithub,
  'Dribbble': FaDribbble,
  'Behance': FaBehance,
  'Medium': FaMedium,
  'Vimeo': FaVimeo,
  'Skype': FaSkype,
  'Slack': FaSlack
};

export default function Footer() {
  const quickLinksRef = useRef(null);
  const servicesRef = useRef(null);
  const newsletterRef = useRef(null);

  const [visible, setVisible] = useState({
    quickLinks: false,
    services: false,
    newsletter: false,
  });

  // Newsletter state
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Fetch site name and footer data
  const { siteNameData } = usePublicSiteName();
  const { footerData } = usePublicFooterContent();

  // Check user authentication status
  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') return;
    
    const checkAuth = async () => {
      // Check authentication using the auth service instead of localStorage
      try {
        const { getCurrentUser } = await import('@/utils/authService');
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          setUserData(user);
          // Check newsletter subscription status
          checkNewsletterSubscription(user.id);
        }
      } catch (error) {
        // User is not authenticated
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Check newsletter subscription status for logged-in users
  const checkNewsletterSubscription = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/api/newsletter/status/${userId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setNewsletterSubscribed(data.subscribed || false);
      }
    } catch (error) {
      // Silently fail - subscription status is optional
    }
  };
  

  // Handle apply link click - always navigate to /apply, show modal if not authenticated
  const handleApplyClick = (e) => {
    if (!isLoggedIn) {
      // Still navigate to /apply page, but show modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('showLoginModal'));
      }
      // Don't prevent default - let the Link navigate to /apply
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-id");
            setVisible(prev => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.3 }
    );

    // Only observe refs that have current elements
    [quickLinksRef, servicesRef, newsletterRef].forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [footerData?.services]); // Re-run when services data changes

  const isValidEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim());

  async function handleSubscribe(e) {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setToast({ show: true, message: "Please enter a valid email address.", type: "error" });
      return;
    }

    try {
      setSending(true);

      const res = await fetch(`${API_BASE}/api/subscription/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errText = data?.error || data?.message || "Failed to subscribe.";
        throw new Error(errText);
      }

      setToast({
        show: true,
        message: data?.message || "Thanks! Please check your email to confirm your subscription.",
        type: "success"
      });
      setEmail("");
    } catch (err) {
      setToast({
        show: true,
        message: err?.message || "Something went wrong while subscribing. Please try again.",
        type: "error"
      });
    } finally {
      setSending(false);
    }
  }

  async function handleLoggedInSubscribe() {
    try {
      setSending(true);

      const res = await fetch(`${API_BASE || ''}/api/users/newsletter/subscribe`, {
        method: "POST",
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: { 
          "Content-Type": "application/json",
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errText = data?.error || data?.message || "Failed to subscribe.";
        throw new Error(errText);
      }

      setNewsletterSubscribed(true);
      setToast({
        show: true,
        message: data?.message || "Successfully subscribed to newsletter!",
        type: "success"
      });

      // Update user data in localStorage
      if (userData) {
        const updatedUserData = { ...userData, newsletterSubscribed: true };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
      }
    } catch (err) {
      setToast({
        show: true,
        message: err?.message || "Something went wrong while subscribing. Please try again.",
        type: "error"
      });
    } finally {
      setSending(false);
    }
  }

  async function handleLoggedInUnsubscribe() {
    try {
      setSending(true);

      const res = await fetch(`${API_BASE || ''}/api/users/newsletter/unsubscribe`, {
        method: "POST",
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: { 
          "Content-Type": "application/json",
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errText = data?.error || data?.message || "Failed to unsubscribe.";
        throw new Error(errText);
      }

      setNewsletterSubscribed(false);
      setToast({
        show: true,
        message: data?.message || "Successfully unsubscribed from newsletter.",
        type: "success"
      });

      // Update user data in localStorage
      if (userData) {
        const updatedUserData = { ...userData, newsletterSubscribed: false };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
      }
    } catch (err) {
      setToast({
        show: true,
        message: err?.message || "Something went wrong while unsubscribing. Please try again.",
        type: "error"
      });
    } finally {
      setSending(false);
    }
  }

  const handleToastClose = () => {
    setToast({ show: false, message: "", type: "success" });
  };

  // Helper function to get platform icon
  const getPlatformIcon = (platformName) => {
    return SOCIAL_PLATFORMS[platformName] || null;
  };

  return (
    <>
      {toast.show && typeof document !== 'undefined' && document.body && createPortal(
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleToastClose}
        />,
        document.body
      )}
      <footer className={styles.footerWrapper}>
      
      <div className={styles.footerContent}>
        <div className={styles.about}>
          <h3>{siteNameData?.site_name || 'FAITH CommUNITY'}</h3>
          <p>Centralized web-based platform for Community Extension Programs.</p>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <div className={`${styles.iconCircle} ${styles.phone}`}>
                <FaPhoneAlt size={16} />
              </div>
              <div className={styles.contactText}>
                <small>Call us any time:</small>
                <p>{footerData?.contact?.phone || '+163-3654-7896'}</p>
              </div>
            </div>

            <div className={styles.contactItem}>
              <div className={`${styles.iconCircle} ${styles.email}`}>
                <FaEnvelope size={16} />
              </div>
              <div className={styles.contactText}>
                <small>Email us any time:</small>
                <p>{footerData?.contact?.email || 'info@faithcommunity.com'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.linksSection}>
          <h4
            ref={quickLinksRef}
            data-id="quickLinks"
            className={`${styles.sectionHeading} ${visible.quickLinks ? styles.visible : ""}`}
          >
            Quick Links
          </h4>
          <ul>
            <li>
              <Link href="/about" className={styles.link}>
                <HiMiniArrowRight className={styles.linkIcon} />
                About Us
              </Link>
            </li>
            <li>
              <Link href="/programs" className={styles.link}>
                <HiMiniArrowRight className={styles.linkIcon} />
                Programs & Services
              </Link>
            </li>
            <li>
              <Link href="/faithree" className={styles.link}>
                <HiMiniArrowRight className={styles.linkIcon} />
                Faithree
              </Link>
            </li>
            <li>
              <Link href="/apply" className={styles.link} onClick={handleApplyClick}>
                <HiMiniArrowRight className={styles.linkIcon} />
                Apply Now
              </Link>
            </li>
            <li>
              <Link href="/faqs" className={styles.link}>
                <HiMiniArrowRight className={styles.linkIcon} />
                FAQs
              </Link>
            </li>
          </ul>
        </div>

        {footerData?.services && Array.isArray(footerData.services) && footerData.services.length > 0 && (
          <div className={styles.servicesSection}>
            <h4
              ref={servicesRef}
              data-id="services"
              className={`${styles.sectionHeading} ${visible.services ? styles.visible : ""}`}
            >
              Our Service
            </h4>
            <ul>
              {footerData.services.map((service, index) => (
                <li key={index}>{service.name || service}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.newsletter}>
          <h4
            ref={newsletterRef}
            data-id="newsletter"
            className={`${styles.sectionHeading} ${visible.newsletter ? styles.visible : ""}`}
          >
            Hear It From Us
          </h4>
          <p>Join our mailing list for updates on programs, volunteer opportunities, and stories that make a difference.</p>
          
          {isLoggedIn ? (
            // Logged-in user interface
            <div className={styles.loggedInNewsletter}>
              {newsletterSubscribed ? (
                <div className={styles.subscribedState}>
                  <p className={styles.subscribedMessage}>
                    <LuCircleCheck className={styles.checkIcon} />
                    You&apos;re subscribed to our newsletter!
                  </p>
                  <button 
                    onClick={handleLoggedInUnsubscribe}
                    disabled={sending}
                    className={styles.unsubscribeButton}
                  >
                    {sending ? (
                      <div className={styles.loadingDots}>
                        <div className={styles.loadingDot}></div>
                        <div className={styles.loadingDot}></div>
                        <div className={styles.loadingDot}></div>
                      </div>
                    ) : (
                      "Unsubscribe"
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLoggedInSubscribe}
                  disabled={sending}
                  className={styles.subscribeButton}
                >
                  {sending ? (
                    <div className={styles.loadingDots}>
                      <div className={styles.loadingDot}></div>
                      <div className={styles.loadingDot}></div>
                      <div className={styles.loadingDot}></div>
                    </div>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              )}
            </div>
          ) : (
            // Non-logged-in user interface
            <form className={styles.subscribeForm} onSubmit={handleSubscribe} noValidate>
              <label htmlFor="newsletter-email" className={styles.visuallyHidden}>
                Email address for newsletter
              </label>
              <input
                type="email"
                id="newsletter-email"
                name="email"
                placeholder="Enter your email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={sending} aria-busy={sending}>
                {sending ? (
                  <div className={styles.loadingDots}>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                  </div>
                ) : (
                  <Send className={styles.submitIcon} />
                )}
              </button>
            </form>
          )}

          <div className={styles.socials}>
            {footerData?.socialMedia && Array.isArray(footerData.socialMedia) && footerData.socialMedia.length > 0 && (
              footerData.socialMedia.map((social, index) => {
                const IconComponent = getPlatformIcon(social.platform);
                return (
                  <a 
                    key={index}
                    href={social.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label={social.platform}
                    className={styles.socialLink}
                  >
                    {IconComponent ? <IconComponent size={13} /> : <span>{social.platform.charAt(0)}</span>}
                  </a>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p>{footerData?.copyright || `© Copyright 2025 ${siteNameData?.site_name || 'FAITH CommUNITY'}. All Rights Reserved.`}</p>
      </div>
    </footer>
    </>
  );
}