'use client';

import { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import PageBanner from '../components/PageBanner';
import Loader from '../../../components/Loader';
import styles from './faqs.module.css';

// ✅ Tracks first-time visit
let hasVisitedFaqs = false;

// ✅ Simulated mock data
const mockFaqData = [
  {
    question: "What is the CommUNITY platform all about?",
    answer: "CommUNITY is a centralized platform for showcasing community extension programs by FAITH Colleges, encouraging students to participate and learn about ongoing and past initiatives."
  },
  {
    question: "Who can apply to become a volunteer?",
    answer: "Any currently enrolled FAITH Colleges student can apply to volunteer in the programs listed on the platform, as long as they meet the specific requirements set by the organization."
  },
  {
    question: "How do I know if my volunteer application was approved?",
    answer: "You will receive an email notification once your application is reviewed. You can also check the status by logging into your account and going to the 'My Applications' section."
  },
  {
    question: "Can I volunteer in more than one program at the same time?",
    answer: "Yes, as long as the schedules of the programs do not conflict and you meet the qualifications, you are allowed to join multiple programs."
  },
  {
    question: "How are organizations selected to be featured on the homepage?",
    answer: "Organizations featured on the homepage are selected based on the relevance, impact, and engagement level of their submitted projects, reviewed and approved by the superadmin."
  },
  {
    question: "Is there a certificate given after volunteering?",
    answer: "Yes, volunteers who complete their participation in approved programs will receive a digital certificate from the organizing group, which may also be used as proof of involvement."
  }
];

export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(!hasVisitedFaqs);
  const [activeIndex, setActiveIndex] = useState(null);

  // ✅ Toggle FAQ answer
  const toggleFaq = (index) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  // ✅ Simulate loading + set mock data only on first visit
  useEffect(() => {
    if (hasVisitedFaqs) return;

    hasVisitedFaqs = true;

    const timer = setTimeout(() => {
      setFaqs(mockFaqData);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // ✅ If user has already visited, skip loading delay
  useEffect(() => {
    if (hasVisitedFaqs && faqs.length === 0) {
      setFaqs(mockFaqData);
      setLoading(false);
    }
  }, []);

  if (loading) return <Loader small />;

  return (
    <>
      <PageBanner
        title="FAQs"
        backgroundImage="/sample/sample8.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { label: 'FAQs' },
        ]}
      />

      <main className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.tag}>COMMON QUESTIONS</p>
          <h1 className={styles.heading}>
            Everything You Need to Know<br />About <span>CommUNITY</span> Here.
          </h1>
        </section>

        <section className={styles.faqGrid}>
          {[0, 1].map((col) => (
            <div key={col} className={styles.faqColumn}>
              {faqs.filter((_, i) => i % 2 === col).map((item, i) => {
                const actualIndex = col + i * 2;
                const isOpen = activeIndex === actualIndex;

                return (
                  <div
                    key={actualIndex}
                    className={`${styles.faqItem} ${isOpen ? styles.open : ''}`}
                    onClick={() => toggleFaq(actualIndex)}
                  >
                    <div className={styles.question}>
                      <strong>{item.question}</strong>
                      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {isOpen && <p className={styles.answer}>{item.answer}</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      </main>
    </>
  );
}