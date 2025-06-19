"use client";

import Link from "next/link";
import styles from "./styles/footer.module.css";
import { FaFacebookF, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { FaInstagram, FaXTwitter } from "react-icons/fa6";
import { HiMiniArrowRight } from "react-icons/hi2";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Footer() {
  const quickLinksRef = useRef(null);
  const servicesRef = useRef(null);
  const newsletterRef = useRef(null);

  const [visible, setVisible] = useState({
    quickLinks: false,
    services: false,
    newsletter: false,
  });

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

  return (
    <footer className={styles.footerWrapper}>
      <div className={styles.footerContent}>
        <div className={styles.about}>
          <h3>FAITH CommUNITY</h3>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam pulvinar ac.</p>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <div className={`${styles.iconCircle} ${styles.phone}`}>
                <FaPhoneAlt size={16} />
              </div>
              <div className={styles.contactText}>
                <small>Call us any time:</small>
                <p>+163-3654-7896</p>
              </div>
            </div>

            <div className={styles.contactItem}>
              <div className={`${styles.iconCircle} ${styles.email}`}>
                <FaEnvelope size={16} />
              </div>
              <div className={styles.contactText}>
                <small>Email us any time:</small>
                <p>info@faithcommunity.com</p>
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
              <Link href="/apply" className={styles.link}>
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
            <li>Give Donation</li>
            <li>Education Support</li>
            <li>Food Support</li>
            <li>Health Support</li>
            <li>Our Campaign</li>
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
          
          <form className={styles.subscribeForm} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              id="newsletter-email"
              name="email"
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
            <button type="submit">
              <Send className={styles.submitIcon} />
            </button>
          </form>

          <div className={styles.socials}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebookF size={13} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram size={14} />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter (X)">
              <FaXTwitter size={13} />
            </a>
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p>© Copyright 2025 <span>FAITH CommUNITY</span>. All Rights Reserved.</p>
      </div>
    </footer>
  );
}