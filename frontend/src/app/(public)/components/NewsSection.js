"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './styles/newsSection.module.css';

  const mockNews = [
    {
      id: 1,
      org: "FACTS",
      date: "June 25, 2025",
      title: "Barangay Computer Literacy Program Recognized by City Mayor",
      description: "Our recent Computer Literacy Program in Barangay Malvar was recognized by the City Mayor for its impact on senior citizens learning basic computer use for daily life tasks.",
    },
    {
      id: 2,
      org: "FACTS",
      date: "June 26, 2025",
      title: "Reminders: Volunteer Orientation This Friday",
      description: "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
    },
    {
      id: 3,
      org: "FACTS",
      date: "June 26, 2025",
      title: "Reminders: Volunteer Orientation This Friday",
      description: "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
    },
    {
      id: 4,
      org: "FACTS",
      date: "June 25, 2025",
      title: "Barangay Computer Literacy Program Recognized by City Mayor",
      description: "Our recent Computer Literacy Program in Barangay Malvar was recognized by the City Mayor for its impact on senior citizens learning basic computer use for daily life tasks.",
    },
    {
      id: 5,
      org: "FACTS",
      date: "June 26, 2025",
      title: "Reminders: Volunteer Orientation This Friday",
      description: "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
    },
    {
      id: 6,
      org: "FACTS",
      date: "June 26, 2025",
      title: "Reminders: Volunteer Orientation This Friday",
      description: "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
    },
    {
      id: 7,
      org: "FACTS",
      date: "June 26, 2025",
      title: "Reminders: Volunteer Orientation This Friday",
      description: "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
    },
    {
      id: 8,
      org: "FABCOMMS",
      date: "June 25, 2025",
      title: "Barangay Computer Literacy Program Recognized by City Mayor",
      description: "Our recent Computer Literacy Program in Barangay Malvar was recognized by the City Mayor for its impact on senior citizens learning basic computer use for daily life tasks.",
    },
    {
      id: 9,
      org: "FABCOMMS",
      date: "June 26, 2025",
      title: "Reminders: Volunteer Orientation This Friday",
      description: "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
    },
  ];

  const orgs = [
    { name: "FACTS", logo: "/logo/facts_logo.png" },
    { name: "FABCOMMS", logo: "/logo/fabcomms_logo.jpg" },
    { name: "FAHSS", logo: "/logo/fahss_logo.jpg" },
    { name: "FAICES", logo: "/logo/faices_logo.jpg" },
    { name: "FAIEES", logo: "/logo/faiees_logo.jpg" },
    { name: "FAIIES", logo: "/logo/faiies_logo.jpg" },
    { name: "FAIPS", logo: "/logo/faips_logo.png" },
    { name: "FAPSS", logo: "/logo/fapss_logo.jpg" },
    { name: "FTL", logo: "/logo/ftl_logo.jpg" },
    { name: "IIEE", logo: "/logo/iiee_logo.jpg" },
    { name: "JMAP", logo: "/logo/jmap_logo.jpg" },
    { name: "JPIA", logo: "/logo/jpia_logo.jpg" },
    { name: "UTHYP", logo: "/logo/uthyp_logo.jpg" },
  ];

export default function NewsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgNavRef = useRef(null);
  const initialOrg = searchParams.get('news_org') || orgs[0].name;
  const [selectedOrg, setSelectedOrg] = useState(initialOrg);
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 7;

  useEffect(() => {
    const urlOrg = searchParams.get('news_org');
    setSelectedOrg(urlOrg || orgs[0].name);
  }, [searchParams]);

  const handleOrgClick = (orgObj, index) => {
    setSelectedOrg(orgObj.name);
    router.push(`${pathname}?news_org=${orgObj.name}`, { scroll: false });

    if (index >= startIndex + visibleCount - 2 && startIndex + visibleCount < orgs.length) {
      setStartIndex(startIndex + 1);
    }
    if (index <= startIndex + 1 && startIndex > 0) {
      setStartIndex(startIndex - 1);
    }
  };

  const filteredNews = useMemo(() =>
    mockNews.filter((news) => news.org === selectedOrg),
    [selectedOrg]
  );

  const visibleOrgs = orgs.slice(startIndex, Math.min(startIndex + visibleCount, orgs.length));
  const maxDisplay = 6;

  return (
    <section className={styles.newsSection}>
      <div className={styles.newsContainer}>
        <h2 className={styles.heading}>Latest News & Announcements</h2>
      </div>

      <div className={styles.orgNav}>
        <div className={styles.orgNavInner} ref={orgNavRef}>
          {visibleOrgs.map((orgObj, index) => (
            <div
              key={`${orgObj.name}-${index}`}
              role="button"
              tabIndex={0}
              aria-pressed={selectedOrg === orgObj.name}
              onClick={() => handleOrgClick(orgObj, index + startIndex)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleOrgClick(orgObj, index + startIndex)}
              className={`${styles.orgItem} ${selectedOrg === orgObj.name ? styles.active : ""}`}
            >
              <Image
                src={orgObj.logo}
                alt={`${orgObj.name} logo`}
                width={30}
                height={30}
                className={styles.orgLogo}
              />
              <span>{orgObj.name}</span>
              {selectedOrg === orgObj.name && (
                <div className={styles.activeCircle}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.newsContainer}>
        <div className={styles.newsList}>
          {filteredNews.length === 0 ? (
            <p>No announcements yet for {selectedOrg}.</p>
          ) : (
            filteredNews.slice(0, maxDisplay).map((news) => (
              <Link key={news.id} href={`/news/${news.id}`} className={styles.newsCard}>
                <p className={styles.newsDate}>{news.date || "June 25, 2025"} / By {news.org}</p>
                <h3 className={styles.newsTitle}>{news.title}</h3>
                <p className={styles.newsDesc}>
                  {news.description.length > 128
                    ? `${news.description.substring(0, 128)}...`
                    : news.description}
                </p>
                {news.description.length > 150 && (
                  <span className={styles.readMore}>Read More</span>
                )}
              </Link>
            ))
          )}
        </div>

        {filteredNews.length > maxDisplay && (
          <div className={styles.seeAllNewsContainer}>
            <Link href={`/news?news_org=${selectedOrg}`} className={styles.seeAllNewsBtn}>
              SEE ALL NEWS
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}