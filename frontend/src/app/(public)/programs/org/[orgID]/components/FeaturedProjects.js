import styles from '../../org.module.css';
import Image from 'next/image';

export default function FeaturedProjects({ projects }) {
  return (
    <section className={styles.featuredSection}>
      <p className={styles.subheading}>Together, We Made These Happen</p>
      <h2 className={styles.heading}>Featured Projects</h2>

      <div className={styles.projectGrid}>
        {projects.length ? (
          projects.map((project) => (
            <div key={project.id} className={styles.projectCard}>
              <Image
                src={project.image}
                alt={project.title}
                width={280}
                height={160}
                className={styles.projectImage}
              />
              <div className={styles.projectoverlay}>
                <div className={styles.projectText}>
                  <h4>{project.title}</h4>
                  <p>{project.description}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noData}>No featured projects available.</p>
        )}
      </div>
    </section>
  );
}