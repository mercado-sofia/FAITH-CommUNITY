"use client";

import { FaMobileAlt, FaUserCheck, FaCheckCircle, FaHandsHelping } from 'react-icons/fa';
import styles from './ApplicationSteps.module.css';

export default function ApplicationSteps() {
  const steps = [
    {
      id: 1,
      icon: FaMobileAlt,
      title: "Choose a program and apply for free",
      description: "Browse available programs and submit your application with your reason for volunteering"
    },
    {
      id: 2,
      icon: FaUserCheck,
      title: "Application under review",
      description: "Our organization reviews your application and checks your eligibility for the program"
    },
    {
      id: 3,
      icon: FaCheckCircle,
      title: "Get approved and receive confirmation",
      description: "Once approved, you'll receive a confirmation notification with program details"
    },
    {
      id: 4,
      icon: FaHandsHelping,
      title: "Prepare for your volunteer journey",
      description: "The organization will reach out to you using your account credentials to provide support and guidance every step of the way"
    }
  ];

  return (
    <section className={styles.stepsSection}>
      <div className={styles.stepsContainer}>
        <h2 className={styles.stepsTitle}>Application Process</h2>
        <div className={styles.stepsFlow}>
          {steps.map((step, index) => (
            <div key={step.id} className={styles.stepWrapper}>
              <div className={styles.step}>
                <div className={styles.stepIcon}>
                  <step.icon />
                </div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={styles.arrow}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M9 18L15 12L9 6" 
                      stroke="#14B8A6" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}