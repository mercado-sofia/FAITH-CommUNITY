/**
 * Filtering Utilities
 * Pure functions for filtering and processing highlights data
 */

/**
 * Filter highlights by organization and year
 * @param {Array} highlights - Array of highlight objects
 * @param {number|null} organizationId - Selected organization ID (required)
 * @param {number|null} year - Selected year (optional)
 * @param {boolean} showAllYears - Whether to show all years
 * @returns {Array} Filtered highlights
 */
export function filterHighlights(highlights, organizationId, year, showAllYears) {
  // If no organization is selected, return empty array
  if (organizationId === null) {
    return [];
  }
  
  return highlights.filter(highlight => {
    // Organization must match (required)
    const orgMatch = highlight.organization_id === organizationId;
    
    // Year matching: if showAllYears is true, show all years; otherwise filter by selectedYear
    const yearMatch = showAllYears 
      ? true // Show all years when toggle is enabled
      : (year !== null && highlight.year === year); // Match exact year when toggle is disabled
    
    return orgMatch && yearMatch;
  });
}

/**
 * Chunk highlights into groups of specified size
 * @param {Array} highlights - Array of highlights to chunk
 * @param {number} chunkSize - Size of each chunk
 * @returns {Array} Array of chunks
 */
export function chunkHighlights(highlights, chunkSize) {
  const chunks = [];
  
  for (let i = 0; i < highlights.length; i += chunkSize) {
    chunks.push(highlights.slice(i, i + chunkSize));
  }
  
  // If no highlights, return empty array (no chunks)
  return chunks.length > 0 ? chunks : [];
}

/**
 * Generate array of years from start year to current year (descending)
 * @param {number} startYear - Starting year
 * @param {number} endYear - Ending year (defaults to current year)
 * @returns {Array} Array of years in descending order
 */
export function generateYears(startYear, endYear = new Date().getFullYear()) {
  const years = [];
  
  // Generate years from endYear to startYear (inclusive, descending)
  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }
  
  return years;
}
