// Returns a reusable handleChange function
export const handleChange = (setFormData, clearFieldError) => (e) => {
  const { name, value, type, checked, files } = e.target;

  if (type === "file") {
    setFormData((prev) => ({
      ...prev,
      [name]: files && files.length > 0 ? files[0] : null,
    }));
    
    // Clear field error immediately when file is selected
    if (clearFieldError && files && files.length > 0) {
      clearFieldError(name);
    }
  } else {
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    // Clear field error immediately when user starts typing
    if (clearFieldError) {
      clearFieldError(name);
    }
  }
};