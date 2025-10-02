'use client';

import { FaCheckCircle, FaTimes, FaShieldAlt, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import { createPortal } from 'react-dom';

/**
 * Success modal for email and password change confirmation
 * EXCLUSIVELY for public users only
 * Admin and superadmin users have their own reusable success modal components
 */
export default function ChangeSuccessModal({ 
  isOpen, 
  onClose, 
  changeType, // 'email' or 'password'
  newEmail, 
  oldEmail 
}) {
  if (!isOpen) return null;

  const isEmailChange = changeType === 'email';
  const isPasswordChange = changeType === 'password';

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem 1.5rem 0',
            position: 'relative'
          }}
        >
          <div 
            style={{
              color: '#28a745',
              fontSize: '3.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '1rem',
              marginBottom: '1rem'
            }}
          >
            <FaCheckCircle />
          </div>
          <button 
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'none',
              border: 'none',
              color: '#d1d5db',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2rem',
              height: '2rem'
            }}
            onClick={onClose}
            type="button"
            onMouseEnter={(e) => {
              e.target.style.background = '#f3f4f6';
              e.target.style.color = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = '#d1d5db';
            }}
          >
            <FaTimes />
          </button>
        </div>
        
        <div 
          style={{
            padding: '1rem 1.5rem'
          }}
        >
          <h2 
            style={{
              margin: '0 0 1rem 0',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1A685B',
              textAlign: 'center'
            }}
          >
            {isEmailChange ? 'Email Changed Successfully!' : 'Password Changed Successfully!'}
          </h2>
          <p 
            style={{
              margin: '0 0 1.5rem 0',
              fontSize: '15px',
              color: '#6c757d',
              textAlign: 'center',
              lineHeight: 1.5
            }}
          >
            {isEmailChange 
              ? 'Your email address has been updated successfully.' 
              : 'Your password has been updated successfully.'
            }
          </p>
          
          {isEmailChange && (
            <div 
              style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '1rem',
                margin: '1rem 0',
                border: '1px solid #e9ecef'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e9ecef'
                }}
              >
                <span 
                  style={{
                    fontWeight: 600,
                    color: '#495057',
                    fontSize: '0.9rem'
                  }}
                >
                  Previous Email:
                </span>
                <span 
                  style={{
                    color: '#1A685B',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    wordBreak: 'break-all'
                  }}
                >
                  {oldEmail}
                </span>
              </div>
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0'
                }}
              >
                <span 
                  style={{
                    fontWeight: 600,
                    color: '#495057',
                    fontSize: '0.9rem'
                  }}
                >
                  New Email:
                </span>
                <span 
                  style={{
                    color: '#1A685B',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    wordBreak: 'break-all'
                  }}
                >
                  {newEmail}
                </span>
              </div>
            </div>
          )}

          {isPasswordChange && (
            <div 
              style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '1rem',
                margin: '1rem 0',
                border: '1px solid #e9ecef'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}
              >
                <FaShieldAlt 
                  style={{
                    color: '#28a745',
                    marginRight: '0.5rem',
                    fontSize: '1.1rem'
                  }}
                />
                <span 
                  style={{
                    fontWeight: 600,
                    color: '#495057',
                    fontSize: '0.95rem'
                  }}
                >
                  Security Update Complete
                </span>
              </div>
              
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e9ecef'
                }}
              >
                <FaLock 
                  style={{
                    color: '#1A685B',
                    marginRight: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                />
                <span 
                  style={{
                    color: '#495057',
                    fontSize: '0.9rem'
                  }}
                >
                  Your password has been securely updated
                </span>
              </div>
              
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem 0'
                }}
              >
                <FaCheckCircle 
                  style={{
                    color: '#28a745',
                    marginRight: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                />
                <span 
                  style={{
                    color: '#495057',
                    fontSize: '0.9rem'
                  }}
                >
                  All active sessions have been updated
                </span>
              </div>
            </div>
          )}
          
          <div 
            style={{
              background: isPasswordChange ? '#fff3cd' : '#e7f3ff',
              border: isPasswordChange ? '1px solid #ffeaa7' : '1px solid #b3d9ff',
              borderRadius: '8px',
              padding: '1rem',
              margin: '1rem 0'
            }}
          >
            {isEmailChange ? (
              <p 
                style={{
                  margin: 0,
                  color: '#0066cc',
                  fontSize: '0.9rem',
                  textAlign: 'left'
                }}
              >
                Please use your new email address for future logins and communications.
              </p>
            ) : (
              <p 
                style={{
                  margin: 0,
                  color: '#856404',
                  fontSize: '0.9rem',
                  textAlign: 'left'
                }}
              >
                Please use your new password for future logins.
              </p>
            )}
          </div>
        </div>
        
        <div 
          style={{
            padding: '0 1.5rem 1.5rem',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <button 
            type="button" 
            style={{
              background: 'linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '120px'
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(26, 104, 91, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {isPasswordChange ? 'Understood' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}