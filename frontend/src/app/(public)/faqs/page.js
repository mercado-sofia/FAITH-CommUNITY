"use client"

import { useState, useMemo, useEffect } from "react"
import { FaChevronDown, FaChevronUp } from "react-icons/fa"
import { FiSearch, FiX } from "react-icons/fi"
import { usePublicFAQs, usePublicSiteName } from "@/hooks/(public)/usePublicData"
import { PageBanner } from "../components"
import Loader from "../../../components/ui/Loader/Loader"
import { usePublicPageLoader } from "@/hooks/(public)/usePublicPageLoader"
import styles from "./faqs.module.css"

export default function FaqPage() {
  const [activeIndex, setActiveIndex] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader('faqs');
  
  // Use SWR hook for data fetching
  const { faqs = [], error, isLoading: dataLoading } = usePublicFAQs()
  
  // Fetch site name data
  const { siteNameData } = usePublicSiteName()

  // Filter FAQs based on search term
  const filteredFaqs = useMemo(() => {
    if (!searchTerm.trim()) {
      return faqs
    }
    
    const searchLower = searchTerm.toLowerCase()
    return faqs.filter((faq) => 
      faq.question?.toLowerCase().includes(searchLower) ||
      faq.answer?.toLowerCase().includes(searchLower)
    )
  }, [faqs, searchTerm])

  const toggleFaq = (index) => {
    setActiveIndex(index === activeIndex ? null : index)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchTerm("")
  }

  // Reset active FAQ when search changes
  useEffect(() => {
    setActiveIndex(null)
  }, [searchTerm])

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
            Everything You Need to Know About <span>{siteNameData?.site_name || 'CommUNITY'}</span> Here.
          </h1>
        </section>

        {/* Search Bar */}
        {faqs.length > 0 && (
          <section className={styles.searchSection}>
            <div className={styles.searchBar}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
              />
              {searchTerm ? (
                <button
                  className={styles.searchButton}
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              ) : (
                <div className={styles.searchIcon}>
                  <FiSearch />
                </div>
              )}
            </div>
            {searchTerm && (
              <p className={styles.searchResults}>
                {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
              </p>
            )}
          </section>
        )}

        {faqs.length === 0 ? (
          <section className={styles.noFaqs}>
            <p>No FAQs available at the moment. Please check back later.</p>
          </section>
        ) : filteredFaqs.length === 0 ? (
          <section className={styles.noFaqs}>
            <p>No FAQs found matching your search. Please try different keywords.</p>
          </section>
        ) : (
          <section className={styles.faqGrid}>
            {[0, 1].map((col) => (
              <div key={col} className={styles.faqColumn}>
                {filteredFaqs
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
