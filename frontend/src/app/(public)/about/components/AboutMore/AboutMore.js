import styles from './aboutMore.module.css';
import Image from "next/image";
import { FaCheck } from 'react-icons/fa';

export default function AboutMore() {
  return (
    <section className={styles.aboutMoreSection}>
      <div className={styles.aboutMoreWrapper}>
        <div className={styles.aboutMoreImage}>
        <Image 
          src="/sample/sample1.jpg" 
          alt="About Image"
          width={500}
          height={400}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        </div>

        <div className={styles.aboutMoreContent}>
          <h4 className={styles.aboutMoreSubtitle}>About Us FAITH CommUNITY</h4>
          <h2 className={styles.aboutMoreTitle}>
            We Believe That We <br />
            Can Help More People <br />
            With You
          </h2>
          <p className={styles.aboutMoreText}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. In pretium vitae est non
            lacinia. Aenean ullamcorper eleifend massa, eu facilisis lectus ornare vel. Maecenas
            scelerisque congue metus at imperdiet. Donec et dictum ligula, vitae dapibus libero.
            Pellentesque odio dui, molestie non porttitor id, dignissim eu mauris. Suspendisse
            mauris nunc, egestas at nisl id, aliquet mattis erat.
          </p>

          <div className={styles.aboutMoreIcons}>
            <div>
              <span className={styles.checkCircle} style={{ backgroundColor: "#1A685B" }}>
                <FaCheck />
              </span>
              Extension For Education
            </div>
            <div>
              <span className={styles.checkCircle} style={{ backgroundColor: "#FFAC00" }}>
                <FaCheck />
              </span>
              Extension For Medical
            </div>
            <div>
              <span className={styles.checkCircle} style={{ backgroundColor: "#E74C3C" }}>
                <FaCheck />
              </span>
              Extension For Community
            </div>
            <div>
              <span className={styles.checkCircle} style={{ backgroundColor: "#134E4A" }}>
                <FaCheck />
              </span>
              Extension For Foods
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}