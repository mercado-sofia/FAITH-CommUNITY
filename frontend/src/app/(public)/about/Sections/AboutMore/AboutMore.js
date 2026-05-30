import styles from './aboutMore.module.css';
import Image from "next/image";
import { useMemo } from 'react';
import { FaCheck } from 'react-icons/fa';
import { usePublicAboutUs } from '@/hooks/(public)/usePublicData';
import { Loader } from '@/components';
import { getImageUrl } from '@/utils/shared/uploadPaths';
import { normalizeExtensionCategories, SAMPLE_EXTENSION_CATEGORIES } from '@/data/siteContent';

const CATEGORY_COLORS = {
  green: '#1A685B',
  red: '#E74C3C',
  orange: '#FFAC00',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  yellow: '#F59E0B',
  pink: '#EC4899',
  teal: '#14B8A6',
  indigo: '#6366F1',
  gray: '#6B7280',
  emerald: '#10B981',
  rose: '#F43F5E',
  cyan: '#06B6D4',
  lime: '#84CC16',
  amber: '#F59E0B',
};

export default function AboutMore() {
  const { aboutUsData, isLoading } = usePublicAboutUs();

  const extensionCategories = useMemo(() => {
    const fromApi = aboutUsData?.extension_categories;
    if (fromApi?.length > 0) {
      return normalizeExtensionCategories(fromApi);
    }
    return SAMPLE_EXTENSION_CATEGORIES;
  }, [aboutUsData?.extension_categories]);

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

  return (
    <section className={styles.aboutMoreSection}>
      <div className={styles.aboutMoreWrapper}>
        <div className={`${styles.aboutMoreImage} ${styles.fadeIn}`}>
        <Image 
          src={(() => {
            if (!aboutUsData?.image_url) return "/samples/sample1.jpg";
            const imageUrl = getImageUrl(aboutUsData.image_url, 'aboutus', 'images');
            return imageUrl === 'IMAGE_UNAVAILABLE' ? "/samples/sample1.jpg" : imageUrl;
          })()}
          alt="About Image"
          width={500}
          height={400}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        </div>

        <div className={styles.aboutMoreContent}>
          <h4 className={`${styles.aboutMoreSubtitle} ${styles.fadeInDelay1}`}>About Us</h4>
          <h2 className={`${styles.aboutMoreTitle} ${styles.fadeInDelay2}`}>
            About Us
          </h2>
          <p className={`${styles.aboutMoreText} ${styles.fadeInDelay3}`}>
            {aboutUsData?.description || 'No description available yet.'}
          </p>

          <div className={styles.aboutMoreIcons}>
            {extensionCategories.map((category, index) => (
              <div 
                key={index}
                className={styles.fadeIn}
                style={{ 
                  animationDelay: `${0.8 + (index * 0.15)}s`,
                  opacity: 0
                }}
              >
                <span 
                  className={styles.checkCircle} 
                  style={{ 
                    backgroundColor: CATEGORY_COLORS[category.color] || '#134E4A',
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