import logger from '../../../../../utils/logger';

// Direct fetch implementation without Redux
export const submitVolunteerApplication = async (formData) => {
  try {
    // Create a FormData object for file uploads
    const form = new FormData()

    // Add all form fields to the FormData
    Object.keys(formData).forEach((key) => {
      if (key === "validId" && formData[key]) {
        form.append("validId", formData[key]);
      } else if (key === "program" && formData[key]) {
        form.append("program_id", formData[key].id);
      } else if (key !== "validId" && key !== "agreeToTerms" && key !== "program") {
        form.append(key, formData[key]);
      }
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/apply`, {
      method: "POST",
      // Don't set Content-Type header when sending FormData
      // The browser will set it automatically with the correct boundary
      body: form,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to submit application")
    }

    return {
      success: true,
      data: data,
      message: "Application submitted successfully!",
    }
  } catch (error) {
    logger.error("Error submitting application", error, { formData: Object.keys(formData) });
    return {
      success: false,
      error: error.message || "Failed to submit application. Please try again.",
    }
  }
}

// Get all volunteer applications (for admin purposes)
export const getVolunteerApplications = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/apply`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch applications")
    }

    return {
      success: true,
      data: data.data || [],
      count: data.count || 0,
    }
  } catch (error) {
    logger.error("Error fetching applications", error);
    return {
      success: false,
      error: error.message || "Failed to fetch applications.",
    }
  }
}

// Test connection to backend
export const testBackendConnection = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/test-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to connect to the server")
    }

    const data = await response.json()
    return {
      success: true,
      message: "Successfully connected to backend!",
    }
  } catch (error) {
    logger.error("Error connecting to backend", error);
    return {
      success: false,
      error: "Failed to connect to backend. Please check if the server is running.",
    }
  }
}