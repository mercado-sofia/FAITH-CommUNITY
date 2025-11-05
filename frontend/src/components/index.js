// components/index.js
export { default as PagePreloader } from './layout/PagePreloader';
export { default as DisableTabOnButtonsLinks } from './layout/DisableTabOnButtonsLinks';
export { default as SWRProvider } from './providers/SWRProvider';
export { default as DynamicFavicon } from './layout/DynamicFavicon';

// Auth components
export { EmailChange, useEmailChange, PasswordChange, StepUpModal } from './auth';

// UI components
export { Loader, LoaderWrapper, ErrorBoundary, OptimizedImage, SuccessModal, ConfirmationModal, UnavailableImagePlaceholder, Tooltip } from './ui';