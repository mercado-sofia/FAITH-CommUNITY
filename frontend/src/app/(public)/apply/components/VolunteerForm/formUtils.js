// Returns a reusable handleChange function
export const handleChange = (setFormData) => (e) => {
  const { name, value, type, checked, files } = e.target;

  if (type === "file") {
    setFormData((prev) => ({
      ...prev,
      [name]: files && files.length > 0 ? files[0] : null,
    }));
  } else {
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }
};