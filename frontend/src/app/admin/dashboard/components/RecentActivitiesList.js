'use client';

import React from 'react';
import styles from './styles/RecentActivities.module.css';
import { recentActivities } from '../data/mockData';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function RecentActivitiesList() {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Recent Activity</h2>
      <ul className={styles.activityList}>
        {recentActivities.map((activity, index) => (
          <li key={index} className={styles.activityItem}>
            <div className={styles.statusDot}></div>
            <div className={styles.activityContent}>
              <span className={styles.activityText}>
                {activity.text}
              </span>
              <span className={styles.activityTime}>
                {dayjs(activity.timestamp).fromNow()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}