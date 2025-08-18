"use client";

import Link from "next/link";
import styles from "./styles/footer.module.css";
import { FaFacebookF, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { FaInstagram, FaXTwitter } from "react-icons/fa6";
import { HiMiniArrowRight } from "react-icons/hi2";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const [msg, setMsg] = useState({ type: "", text: "" }); // "success" | "error" | ""

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
    setMsg({ type: "", text: "" });

    if (!isValidEmail(email)) {
      setMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    try {
      setSending(true);

      const res = await fetch(`${API_BASE}/api/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errText = data?.error || data?.message || "Failed to subscribe.";
        throw new Error(errText);
      }

      setMsg({
        type: "success",
        text:
          data?.message ||
          "Thanks! Please check your email to confirm your subscription.",
      });
      setEmail("");
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.message ||
          "Something went wrong while subscribing. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

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
              aria-invalid={msg.type === "error" ? "true" : "false"}
              aria-describedby="newsletter-feedback"
            />
            <button type="submit" disabled={sending} aria-busy={sending}>
              {sending ? <span className={styles.loadingDot}>• • •</span> : <Send className={styles.submitIcon} />}
            </button>
          </form>

          <div id="newsletter-feedback" aria-live="polite" className={styles.feedback}>
            {msg.type === "success" && <span className={styles.successText}>{msg.text}</span>}
            {msg.type === "error" && <span className={styles.errorText}>{msg.text}</span>}
          </div>

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