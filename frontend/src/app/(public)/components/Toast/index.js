'use client';

import Toast from './Toast';

export { default as Toast } from './Toast';
export { useToast } from './useToast';

// ToastContainer that accepts props (for profile page)
export const ToastContainer = ({ toasts, onRemoveToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000000, pointerEvents: 'none' }}>
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ 
            pointerEvents: 'auto',
            marginTop: index > 0 ? '0.75rem' : '0',
            transform: `translateY(${index * 80}px)`
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration || 4000}
            onClose={() => onRemoveToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};
