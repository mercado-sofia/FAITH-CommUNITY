'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FiChevronRight } from 'react-icons/fi';
import styles from './PageBanner.module.css';

export default function PageBanner({ title, breadcrumbs = [], backgroundImage }) {
  return (
    <section className={styles.banner}>
      <Image
        src={backgroundImage}
        alt={title}
        fill
        priority
        className={styles.bannerImage}
      />
      <div className={styles.overlay}></div>

      <div className={styles.content}>
        <h1>{title}</h1>
        <div className={styles.breadcrumb}>
          {breadcrumbs.map((crumb, i) => (
            <span className={styles.breadcrumbItem} key={i}>
              {crumb.href ? (
                <Link href={crumb.href} className={styles.breadcrumbHome}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
              )}
              {i < breadcrumbs.length - 1 && (
                <FiChevronRight className={styles.breadcrumbArrow} />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}