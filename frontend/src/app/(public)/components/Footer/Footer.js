"use client";

import Link from "next/link";
import styles from "./Footer.module.css";
import { FaFacebookF, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { FaInstagram, FaXTwitter } from "react-icons/fa6";
import { HiMiniArrowRight } from "react-icons/hi2";
import { Send } from "lucide-react";
import { LuCircleCheck } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Toast from "../Toast/Toast";
import { usePublicSiteName, usePublicFooterContent } from "../../hooks/usePublicData";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

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
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setIsLoggedIn(true);
        setNewsletterSubscribed(parsedUserData.newsletterSubscribed || false);
      } catch (error) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Handle apply link click
  const handleApplyClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      // Dispatch custom event to show login modal
      window.dispatchEvent(new CustomEvent('showLoginModal'));
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

    [quickLinksRef, servicesRef, newsletterRef].forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

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

      const token = localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/api/users/newsletter/subscribe`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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

      const token = localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/api/users/newsletter/unsubscribe`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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

  return (
    <>
      {toast.show && createPortal(
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
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam pulvinar ac.</p>
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

        <div className={styles.servicesSection}>
          <h4
            ref={servicesRef}
            data-id="services"
            className={`${styles.sectionHeading} ${visible.services ? styles.visible : ""}`}
          >
            Our Service
          </h4>
          <ul>
            {footerData?.services?.map((service, index) => (
              <li key={index}>{service.name || service}</li>
            )) || (
              <>
                <li>Give Donation</li>
                <li>Education Support</li>
                <li>Food Support</li>
                <li>Health Support</li>
                <li>Our Campaign</li>
              </>
            )}
          </ul>
        </div>

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
            <a href={footerData?.socialMedia?.facebook || "https://facebook.com"} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebookF size={13} />
            </a>
            <a href={footerData?.socialMedia?.instagram || "https://instagram.com"} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram size={14} />
            </a>
            <a href={footerData?.socialMedia?.twitter || "https://x.com"} target="_blank" rel="noopener noreferrer" aria-label="Twitter (X)">
              <FaXTwitter size={13} />
            </a>
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