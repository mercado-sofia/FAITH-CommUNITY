"use client"

import { useState } from "react"
import { FaChevronDown, FaChevronUp } from "react-icons/fa"
import { useGetActiveFaqsQuery } from "../../../rtk/superadmin/faqApi"
import PageBanner from "../components/PageBanner"
import Loader from "../../../components/Loader"
import styles from "./faqs.module.css"

export default function FaqPage() {
  const [activeIndex, setActiveIndex] = useState(null)
  const { data: faqs = [], error, isLoading } = useGetActiveFaqsQuery()

  const toggleFaq = (index) => {
    setActiveIndex(index === activeIndex ? null : index)
  }

  if (isLoading) return <Loader />

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
