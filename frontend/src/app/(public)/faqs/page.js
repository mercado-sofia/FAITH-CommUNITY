"use client"

import { useState } from "react"
import { FaChevronDown, FaChevronUp } from "react-icons/fa"
import { usePublicFAQs, usePublicSiteName } from "../hooks/usePublicData"
import { PageBanner } from "../components"
import Loader from "../../../components/ui/Loader/Loader"
import { usePublicPageLoader } from "../hooks/usePublicPageLoader"
import styles from "./faqs.module.css"

export default function FaqPage() {
  const [activeIndex, setActiveIndex] = useState(null)
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader('faqs');
  
  // Use SWR hook for data fetching
  const { faqs = [], error, isLoading: dataLoading } = usePublicFAQs()
  
  // Fetch site name data
  const { siteNameData } = usePublicSiteName()

  const toggleFaq = (index) => {
    setActiveIndex(index === activeIndex ? null : index)
  }

  if (pageLoading || !pageReady || dataLoading) return <Loader small centered />

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
        backgroundImage="/samples/sample8.jpg"
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "FAQs" }]}
      />

      <main className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.tag}>COMMON QUESTIONS</p>
          <h1 className={styles.heading}>
            Everything You Need to Know
            <br />
            About <span>{siteNameData?.site_name || 'CommUNITY'}</span> Here.
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
