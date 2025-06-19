import styles from './styles/aboutOrg.module.css';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useState } from 'react';

export default function AboutOrg() {
  const cardWidth = 140;
  const orgVisibleCount = 7;
  const [orgStart, setOrgStart] = useState(0);

  const mockOrgs = [
    { name: "JPIA", logo: "/logo/jpia_logo.jpg" },
    { name: "FACTS", logo: "/logo/facts_logo.png" },
    { name: "FTL", logo: "/logo/ftl_logo.jpg" },
    { name: "JMAP", logo: "/logo/jmap_logo.jpg" },
    { name: "FAIPS", logo: "/logo/faips_logo.png" },
    { name: "FABCOMMS", logo: "/logo/fabcomms_logo.jpg" },
    { name: "UTHYP", logo: "/logo/uthyp_logo.jpg" },
    { name: "FAPSS", logo: "/logo/fapss_logo.jpg" },
    { name: "FAHSS", logo: "/logo/fahss_logo.jpg" },
  ];

  return (
    <section className={styles.orgSection}>
      <h2 className={styles.orgHeading}>
        Total of <span>{mockOrgs.length}</span> Organizations
      </h2>
      <div className={styles.orgCarouselWrapper}>
        <button
          className={styles.orgNavBtn}
          onClick={() => orgStart > 0 && setOrgStart(orgStart - 1)}
          disabled={orgStart === 0}
        >
          <FaChevronLeft />
        </button>

        <div className={styles.orgSliderWrapper}>
          <div
            className={styles.orgSliderTrack}
            style={{ transform: `translateX(-${orgStart * (cardWidth + 2)}px)` }}
          >
            {mockOrgs.map((org, i) => (
              <div className={styles.orgItem} key={i}>
                <Image src={org.logo} alt={org.name} width={100} height={100} />
                <p>{org.name}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          className={styles.orgNavBtn}
          onClick={() =>
            orgStart < mockOrgs.length - orgVisibleCount &&
            setOrgStart(orgStart + 1)
          }
          disabled={orgStart >= mockOrgs.length - orgVisibleCount}
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}