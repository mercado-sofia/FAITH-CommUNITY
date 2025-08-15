"use client"

import { useState, useEffect } from "react"
import { FaChevronDown, FaChevronUp } from "react-icons/fa"
import { usePublicFAQs } from "../../../hooks/usePublicData"
import PageBanner from "../components/PageBanner"
import Loader from "../../../components/Loader"
import styles from "./faqs.module.css"

export default function FaqPage() {
  const [activeIndex, setActiveIndex] = useState(null)
  const [pageReady, setPageReady] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const { faqs = [], error, isLoading } = usePublicFAQs()

  const toggleFaq = (index) => {
    setActiveIndex(index === activeIndex ? null : index)
  }

  // Add extra 1 second delay only for first visits after data loads
  useEffect(() => {
    if (!isLoading) {
      const extraDelay = isFirstVisit ? 1000 : 0; // Extra delay only for first visit
      const timer = setTimeout(() => {
        setPageReady(true);
        setIsFirstVisit(false); // Mark as no longer first visit
      }, extraDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, isFirstVisit]);

  if (isLoading || !pageReady) return <Loader small centered />

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error loading FAQs</h2>
        <p>Please try again later.</p>
      </div>
    )
  }

  return (
    <>
      <PageBanner
        title="FAQs"
        backgroundImage="/sample/sample8.jpg"
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "FAQs" }]}
      />

      <main className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.tag}>COMMON QUESTIONS</p>
          <h1 className={styles.heading}>
            Everything You Need to Know
            <br />
            About <span>CommUNITY</span> Here.
          </h1>
        </section>

        {faqs.length === 0 ? (
          <section className={styles.noFaqs}>
            <p>No FAQs available at the moment. Please check back later.</p>
          </section>
        ) : (
          <section className={styles.faqGrid}>
            {[0, 1].map((col) => (
              <div key={col} className={styles.faqColumn}>
                {faqs
                  .filter((_, i) => i % 2 === col)
                  .map((item, i) => {
                    const actualIndex = col + i * 2
                    const isOpen = activeIndex === actualIndex

                    return (
                      <div
                        key={actualIndex}
                        className={`${styles.faqItem} ${isOpen ? styles.open : ""}`}
                        onClick={() => toggleFaq(actualIndex)}
                      >
                        <div className={styles.question}>
                          <strong>{item.question}</strong>
                          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                        {isOpen && <p className={styles.answer}>{item.answer}</p>}
                      </div>
                    )
                  })}
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  )
}
