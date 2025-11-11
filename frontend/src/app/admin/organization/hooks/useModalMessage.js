import { useEffect, useState } from 'react';

export const useModalMessage = (isOpen, autoClearDelay = 3000) => {
  const [modalMessage, setModalMessage] = useState({ text: "", type: "" });

  // Auto-clear modal message after specified delay
  useEffect(() => {
    if (modalMessage?.text) {
      const timer = setTimeout(() => {
        setModalMessage({ text: "", type: "" });
      }, autoClearDelay);
      return () => clearTimeout(timer);
    }
  }, [modalMessage, autoClearDelay]);

  // Clear modal message when modal closes
  useEffect(() => {
    if (!isOpen) {
      setModalMessage({ text: "", type: "" });
    }
  }, [isOpen]);

  const showMessage = (text, type) => {
    setModalMessage({ text, type });
  };

  const clearMessage = () => {
    setModalMessage({ text: "", type: "" });
  };

  return {
    modalMessage,
    setModalMessage,
    showMessage,
    clearMessage
  };
};
