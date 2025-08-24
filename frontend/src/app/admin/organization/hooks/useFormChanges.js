import { useCallback } from 'react';

export const useFormChanges = () => {
  const hasChanges = useCallback((originalData, currentData, fieldsToCheck) => {
    if (!originalData || !currentData) return false;
    
    return fieldsToCheck.some(field => 
      originalData[field] !== currentData[field]
    );
  }, []);

  const hasOrganizationChanges = useCallback((originalData, currentData) => {
    if (!originalData || !currentData) return false;
    
    return (
      originalData.logo !== currentData.logo ||
      originalData.facebook !== currentData.facebook ||
      originalData.description !== currentData.description ||
      originalData.orgColor !== currentData.orgColor
    );
  }, []);

  const hasSectionChanges = useCallback((originalData, currentData, section) => {
    if (!originalData || !currentData) return false;
    
    if (section === 'advocacy') {
      return originalData.advocacy !== currentData.advocacy;
    }
    
    if (section === 'competency') {
      return originalData.competency !== currentData.competency;
    }
    
    return false;
  }, []);

  const hasSectionChangesFromData = useCallback((originalData, sectionData, section) => {
    if (!originalData || !sectionData) return false;
    
    if (section === 'advocacy') {
      return originalData.advocacy !== sectionData.advocacy;
    }
    
    if (section === 'competency') {
      return originalData.competency !== sectionData.competency;
    }
    
    return false;
  }, []);

  return {
    hasChanges,
    hasOrganizationChanges,
    hasSectionChanges,
    hasSectionChangesFromData
  };
};
