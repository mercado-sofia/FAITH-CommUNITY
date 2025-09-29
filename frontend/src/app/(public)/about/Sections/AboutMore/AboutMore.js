import styles from './aboutMore.module.css';
import Image from "next/image";
import { FaCheck } from 'react-icons/fa';
import { usePublicAboutUs, usePublicSiteName } from '../../../hooks/usePublicData';
import { Loader } from '@/components';

export default function AboutMore() {
  const { aboutUsData, isLoading, error } = usePublicAboutUs();
  const { siteNameData } = usePublicSiteName();

  if (isLoading) {
    return (
      <section className={styles.aboutMoreSection}>
        <div className={styles.aboutMoreWrapper}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader small />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    // Handle error silently in production
  }

  return (
    <section className={styles.aboutMoreSection}>
      <div className={styles.aboutMoreWrapper}>
        <div className={styles.aboutMoreImage}>
        <Image 
          src={aboutUsData?.image_url || "/samples/sample1.jpg"} 
          alt="About Image"
          width={500}
          height={400}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        </div>

        <div className={styles.aboutMoreContent}>
          <h4 className={styles.aboutMoreSubtitle}>About Us{siteNameData?.site_name ? ` ${siteNameData.site_name}` : ''}</h4>
          <h2 className={styles.aboutMoreTitle}>
            {aboutUsData?.heading || 'We Believe That We Can Help More People With You'}
          </h2>
          <p className={styles.aboutMoreText}>
            {aboutUsData?.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. In pretium vitae est non lacinia. Aenean ullamcorper eleifend massa, eu facilisis lectus ornare vel. Maecenas scelerisque congue metus at imperdiet. Donec et dictum ligula, vitae dapibus libero. Pellentesque odio dui, molestie non porttitor id, dignissim eu mauris. Suspendisse mauris nunc, egestas at nisl id, aliquet mattis erat.'}
          </p>

          <div className={styles.aboutMoreIcons}>
            {aboutUsData?.extension_categories?.map((category, index) => (
              <div key={index}>
                <span 
                  className={styles.checkCircle} 
                  style={{ 
                    backgroundColor: category.color === 'green' ? '#1A685B' : 
                                   category.color === 'red' ? '#E74C3C' : 
                                   category.color === 'orange' ? '#FFAC00' : 
                                   category.color === 'blue' ? '#3B82F6' :
                                   category.color === 'purple' ? '#8B5CF6' :
                                   category.color === 'yellow' ? '#F59E0B' :
                                   category.color === 'pink' ? '#EC4899' :
                                   category.color === 'teal' ? '#14B8A6' :
                                   category.color === 'indigo' ? '#6366F1' :
                                   category.color === 'gray' ? '#6B7280' :
                                   category.color === 'emerald' ? '#10B981' :
                                   category.color === 'rose' ? '#F43F5E' :
                                   category.color === 'cyan' ? '#06B6D4' :
                                   category.color === 'lime' ? '#84CC16' :
                                   category.color === 'amber' ? '#F59E0B' : '#134E4A' 
                  }}
                >
                  <FaCheck />
                </span>
                {category.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}