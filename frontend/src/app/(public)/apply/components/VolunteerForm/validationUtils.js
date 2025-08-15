// Comprehensive form validation utilities
export const validationRules = {
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s]+$/,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Full name is required";
      }
      if (value.trim().length < 2) {
        return "Full name must be at least 2 characters long";
      }
      if (value.trim().length > 100) {
        return "Full name must be less than 100 characters";
      }
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return "Full name can only contain letters and spaces";
      }
      if (value.trim().split(' ').length < 2) {
        return "Please enter your complete name (First Name, Middle Name, Last Name)";
      }
      return null;
    }
  },
  
  age: {
    required: true,
    min: 16,
    max: 100,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Age is required";
      }
      const age = parseInt(value);
      if (isNaN(age)) {
        return "Age must be a valid number";
      }
      if (age < 16) {
        return "You must be at least 16 years old to volunteer";
      }
      if (age > 100) {
        return "Please enter a valid age";
      }
      return null;
    }
  },
  
  gender: {
    required: true,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Please select your gender";
      }
      const validGenders = ["Male", "Female"];
      if (!validGenders.includes(value)) {
        return "Please select a valid gender option";
      }
      return null;
    }
  },
  
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Email address is required";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Please enter a valid email address (e.g., example@email.com)";
      }
      if (value.length > 254) {
        return "Email address is too long";
      }
      return null;
    }
  },
  
  phoneNumber: {
    required: true,
    pattern: /^09[0-9]{9}$/,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Contact number is required";
      }
      if (!/^09[0-9]{9}$/.test(value)) {
        return "Please enter a valid 11-digit mobile number starting with 09";
      }
      return null;
    }
  },
  
  address: {
    required: true,
    minLength: 10,
    maxLength: 500,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Complete address is required";
      }
      if (value.trim().length < 10) {
        return "Please provide a complete address (at least 10 characters)";
      }
      if (value.trim().length > 500) {
        return "Address is too long (maximum 500 characters)";
      }
      return null;
    }
  },
  
  occupation: {
    required: true,
    minLength: 2,
    maxLength: 100,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Occupation is required";
      }
      if (value.trim().length < 2) {
        return "Occupation must be at least 2 characters long";
      }
      if (value.trim().length > 100) {
        return "Occupation must be less than 100 characters";
      }
      return null;
    }
  },
  
  citizenship: {
    required: true,
    minLength: 2,
    maxLength: 50,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Citizenship is required";
      }
      if (value.trim().length < 2) {
        return "Citizenship must be at least 2 characters long";
      }
      if (value.trim().length > 50) {
        return "Citizenship must be less than 50 characters";
      }
      return null;
    }
  },
  
  reason: {
    required: true,
    minLength: 20,
    maxLength: 800,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Please tell us why you want to volunteer";
      }
      if (value.trim().length < 20) {
        return "Please provide a more detailed reason (at least 20 characters)";
      }
      if (value.trim().length > 800) {
        return "Reason is too long (maximum 800 characters)";
      }
      return null;
    }
  },
  
  program: {
    required: true,
    validate: (value) => {
      if (!value || !value.id) {
        return "Please select a program to volunteer for";
      }
      return null;
    }
  },
  
  validId: {
    required: true,
    validate: (value) => {
      if (!value) {
        return "Please upload a valid government-issued ID";
      }
      return null;
    }
  },
  
  agreeToTerms: {
    required: true,
    validate: (value) => {
      if (!value) {
        return "You must agree to the terms and conditions to continue";
      }
      return null;
    }
  }
};

// Main validation function
export const validateField = (fieldName, value) => {
  const rule = validationRules[fieldName];
  if (!rule) {
    return null; // No validation rule for this field
  }
  
  return rule.validate(value);
};

// Validate entire form
export const validateForm = (formData) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(fieldName => {
    const error = validateField(fieldName, formData[fieldName]);
    if (error) {
      errors[fieldName] = error;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Get field-specific help text
export const getFieldHelpText = (fieldName) => {
  const helpTexts = {
    fullName: "Enter your complete name as it appears on your ID",
    age: "You must be at least 16 years old to volunteer",
    gender: "Select your gender from the dropdown",
    email: "We'll use this to contact you about your application",
    phoneNumber: "Enter your 11-digit mobile number (e.g., 09123456789)",
    address: "Provide your complete address including house number, street, barangay, city, and province",
    occupation: "What do you do for work? (e.g., Student, Engineer, Unemployed)",
    citizenship: "Your nationality or citizenship",
    reason: "Tell us why you want to volunteer and what you hope to contribute",
    program: "Select the program you're most interested in joining",
    validId: "Upload a clear photo of your government-issued ID (Driver's License, Passport, etc.)",
    agreeToTerms: "You must read and agree to our terms and conditions"
  };
  
  return helpTexts[fieldName] || "";
};

// Get field-specific placeholder text
export const getFieldPlaceholder = (fieldName) => {
  const placeholders = {
    fullName: "First Name, Middle Name, Last Name",
    age: "Enter your age",
    gender: "Select Gender",
    email: "example@email.com",
    phoneNumber: "09XXXXXXXXX",
    address: "House No., Street, Purok, Barangay, City, Province",
    occupation: "e.g., Student, Engineer, Unemployed",
    citizenship: "e.g., Filipino, American, etc.",
    reason: "Tell us why you'd like to volunteer with our organization...",
    program: "Choose Program",
    validId: "Click to upload your valid ID",
    agreeToTerms: "I agree to the terms and conditions"
  };
  
  return placeholders[fieldName] || "";
};
