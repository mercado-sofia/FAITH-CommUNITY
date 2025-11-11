'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import styles from './styles/SearchBar.module.css';

const SearchBar = ({
  searchQuery,
  onSearchChange
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  useEffect(() => {
    setLocalQuery(searchQuery || '');
  }, [searchQuery]);

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchInputContainer}>
        <input
          type="text"
          placeholder="Search programs..."
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            onSearchChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearchChange(localQuery);
            }
          }}
          className={styles.searchInput}
        />
        {localQuery ? (
          <FiX className={styles.clearIcon} onClick={() => {
            setLocalQuery('');
            onSearchChange('');
          }} />
        ) : (
          <FiSearch className={styles.searchIcon} onClick={() => onSearchChange(localQuery)} />
        )}
      </div>
    </div>
  );
};

export default SearchBar;
