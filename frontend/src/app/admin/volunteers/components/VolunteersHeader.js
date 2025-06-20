'use client';

import { useState } from 'react';
import styles from './VolunteersHeader.module.css';
import { FaSearch } from 'react-icons/fa';

export default function VolunteersHeader({ onSearch, onFilterChange, onSortChange }) {
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    onSearch(searchText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className={styles.headerContainer}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Search by org or section..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSearch}>
          <FaSearch />
        </button>
      </div>

      <select onChange={(e) => onFilterChange(e.target.value)} className={styles.dropdown}>
        <option value="all">All</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="rejected">Rejected</option>
      </select>

      <select onChange={(e) => onSortChange(e.target.value)} className={styles.dropdown}>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="nameAsc">Name A-Z</option>
        <option value="nameDesc">Name Z-A</option>
      </select>
    </div>
  );
}
