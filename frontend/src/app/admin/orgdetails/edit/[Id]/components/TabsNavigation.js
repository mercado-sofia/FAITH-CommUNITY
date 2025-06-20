'use client';

import styles from "../../../../styles/edit-orgdetails.module.css";  
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

export default function TabsNavigation({ activeTab, setActiveTab }) {
  return (
    <div className={styles.tabsNav}>
      <button
        className={`${styles.tabButton} ${activeTab === "details" ? styles.activeTab : ""}`}
        onClick={() => setActiveTab("details")}
      >
        Details
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === "preview" ? styles.activeTab : ""}`}
        onClick={() => setActiveTab("preview")}
      >
        Preview
      </button>
    </div>
  );
}