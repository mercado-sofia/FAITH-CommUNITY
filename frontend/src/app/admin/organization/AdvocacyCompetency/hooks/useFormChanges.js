/**
 * Custom hook for form change detection
 * @returns {Object} Object containing change detection functions
 */
export default function useFormChanges() {
  /**
   * Check if section data has changes from original data
   * @param {Object} originalData - Original data object
   * @param {Object} currentData - Current data object (advocacy or competency)
   * @param {string} sectionType - Type of section ('advocacy' or 'competency')
   * @returns {boolean} Whether there are changes
   */
  const hasSectionChangesFromData = (originalData, currentData, sectionType) => {
    if (!originalData || !currentData) return false

    // Get the field name based on section type
    const fieldName = sectionType === 'advocacy' ? 'advocacy' : 'competency'
    
    // Compare the specific field
    const originalValue = originalData[fieldName] || ''
    const currentValue = currentData[fieldName] || ''
    
    return originalValue.trim() !== currentValue.trim()
  }

  /**
   * Check if any form data has changes
   * @param {Object} originalData - Original data object
   * @param {Object} currentData - Current data object
   * @returns {boolean} Whether there are any changes
   */
  const hasAnyChanges = (originalData, currentData) => {
    if (!originalData || !currentData) return false

    // Check all relevant fields
    const fieldsToCheck = ['advocacy', 'competency', 'org', 'orgName', 'email', 'facebook', 'description']
    
    return fieldsToCheck.some(field => {
      const originalValue = originalData[field] || ''
      const currentValue = currentData[field] || ''
      return originalValue.trim() !== currentValue.trim()
    })
  }

  return {
    hasSectionChangesFromData,
    hasAnyChanges
  }
}
