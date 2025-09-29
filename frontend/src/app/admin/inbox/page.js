'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { formatDateTime } from '@/utils/dateUtils.js';
import { 
  useGetMessagesQuery, 
  useGetUnreadCountQuery,
  useMarkMessageAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteMessageMutation 
} from '@/rtk/admin/inboxApi';
import { FiMail, FiTrash2, FiEye, FiCheck, FiX } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import { SkeletonLoader } from '../components';
import { ConfirmationModal } from '@/components';
import styles from './inbox.module.css';

export default function InboxPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState('all'); // 'all' or 'unread'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const itemsPerPage = 10;

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab]);

  // Fetch messages
  const { 
    data: messagesData, 
    isLoading: messagesLoading, 
    error: messagesError,
    refetch: refetchMessages 
  } = useGetMessagesQuery({
    organizationId: currentAdmin?.org,
    page: currentPage,
    limit: itemsPerPage,
    unreadOnly: currentTab === 'unread'
  }, {
    skip: !currentAdmin?.org
  });

  // Fetch unread count
  const { 
    data: unreadCountData,
    refetch: refetchUnreadCount 
  } = useGetUnreadCountQuery(currentAdmin?.org, {
    skip: !currentAdmin?.org
  });

  // Fetch total count for "All" tab (always get all messages, not just current page)
  const { 
    data: totalMessagesData 
  } = useGetMessagesQuery({
    organizationId: currentAdmin?.org,
    page: 1,
    limit: 1000, // Large limit to get total count
    unreadOnly: false // Always get all messages
  }, {
    skip: !currentAdmin?.org
  });

  // Mutations with loading states
  const [markAsRead, { isLoading: markingAsRead }] = useMarkMessageAsReadMutation();
  const [markAllAsRead, { isLoading: markingAllAsRead }] = useMarkAllAsReadMutation();
  const [deleteMessage, { isLoading: deletingMessage }] = useDeleteMessageMutation();

  const messages = messagesData?.data?.messages || [];
  const pagination = messagesData?.data?.pagination;
  const unreadCount = unreadCountData?.data?.count || 0;
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!messagesLoading && messages.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [messagesLoading, messages.length]);

  const handleMarkAsRead = async (messageId) => {
    try {
      setErrorMessage('');
      await markAsRead({
        messageId,
        organizationId: currentAdmin?.org
      }).unwrap();
      
      // Refetch data
      refetchMessages();
      refetchUnreadCount();
    } catch (error) {
      setErrorMessage('Failed to mark message as read. Please try again.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setErrorMessage('');
      await markAllAsRead(currentAdmin?.org).unwrap();
      
      // Refetch data
      refetchMessages();
      refetchUnreadCount();
    } catch (error) {
      setErrorMessage('Failed to mark all messages as read. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      setErrorMessage('');
      await deleteMessage({
        messageId,
        organizationId: currentAdmin?.org
      }).unwrap();
      
      // Close modal and refetch data
      setShowDeleteModal(false);
      setMessageToDelete(null);
      refetchMessages();
      refetchUnreadCount();
    } catch (error) {
      setErrorMessage('Failed to delete message. Please try again.');
    }
  };

  const openDeleteModal = (message) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    return formatDateTime(dateString);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setErrorMessage(''); // Clear any existing errors
  };

  // Handle message selection
  const handleMessageSelect = (messageId) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(m => m.id));
    }
  };

  // Handle cancel selection
  const handleCancelSelection = () => {
    setSelectedMessages([]);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      setErrorMessage('');
      for (const messageId of selectedMessages) {
        await deleteMessage({
          messageId,
          organizationId: currentAdmin?.org
        }).unwrap();
      }
      setSelectedMessages([]);
      setShowBulkDeleteModal(false);
      refetchMessages();
      refetchUnreadCount();
    } catch (error) {
      setErrorMessage('Failed to delete some messages. Please try again.');
    }
  };

  if (!currentAdmin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p>Unable to load inbox. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Inbox</h1>
          <p className={styles.subheader}>
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'No unread messages'}
          </p>
        </div>
        
        <div className={styles.headerActions}>
          {selectedMessages.length > 0 && (
            <div className={styles.bulkActionsContainer}>
              <button 
                className={styles.deleteSelectedBtn}
                onClick={() => setShowBulkDeleteModal(true)}
              >
                <FiTrash2 size={16} />
                Delete Selected ({selectedMessages.length})
              </button>
              <button 
                className={styles.cancelSelectionBtn}
                onClick={handleCancelSelection}
                title="Cancel selection"
              >
                <FiX size={16} />
              </button>
            </div>
          )}
          
          {unreadCount > 0 && (
            <button
              className={styles.markAllReadButton}
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead}
            >
              {markingAllAsRead ? <FaSpinner className={styles.spinner} /> : <FiCheck />}
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Error Message Display */}
      {errorMessage && (
        <div className={styles.errorMessage}>
          <p>{errorMessage}</p>
          <button 
            onClick={() => setErrorMessage('')}
            className={styles.dismissError}
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.navTabs}>
        <button 
          className={`${styles.navTab} ${currentTab === 'all' ? styles.active : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <span>All</span>
          <span className={styles.tabCount}>{totalMessagesData?.data?.messages?.length || 0}</span>
        </button>
        <button 
          className={`${styles.navTab} ${currentTab === 'unread' ? styles.active : ''}`}
          onClick={() => handleTabChange('unread')}
        >
          <span>Unread</span>
          <span className={styles.tabCount}>{unreadCount}</span>
        </button>
      </div>

      <div className={styles.content}>
        {!hasInitiallyLoaded || (messagesLoading && !messages.length) ? (
          <SkeletonLoader type="table" count={8} />
        ) : messagesError ? (
          <div className={styles.errorContainer}>
            <p>Error loading messages. Please try again.</p>
            <button onClick={refetchMessages} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <FiMail className={styles.emptyIcon} />
            <h3>No messages found</h3>
            <p>
              {currentTab === 'unread' 
                ? "You have no unread messages." 
                : "You haven't received any messages yet."
              }
            </p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {/* Select All Checkbox */}
            {messages.length > 0 && (
              <div className={styles.selectAllContainer}>
                <input
                  type="checkbox"
                  checked={selectedMessages.length === messages.length && messages.length > 0}
                  onChange={handleSelectAll}
                  className={styles.selectAllCheckbox}
                />
                <span className={styles.selectAllText}>
                  Select All ({messages.length})
                </span>
              </div>
            )}
            
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`${styles.messageItem} ${!message.is_read ? styles.unread : ''}`}
              >
                <div className={styles.messageCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(message.id)}
                    onChange={() => handleMessageSelect(message.id)}
                  />
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <div className={styles.messageMeta}>
                      <div className={styles.senderInfo}>
                         {/* Check if user is authenticated (has user_id) */}
                         {message.user_id ? (
                           // Auth user: name above email
                           <>
                             <span className={styles.senderName}>
                               {message.sender_full_name || `${message.sender_first_name} ${message.sender_last_name}`}
                             </span>
                             <span className={styles.senderEmail}>{message.sender_email}</span>
                           </>
                         ) : (
                           // Unauth user: "Guest User" above email
                           <>
                             <span className={styles.senderName}>Guest User</span>
                             <span className={styles.senderEmail}>{message.sender_email}</span>
                           </>
                         )}
                       </div>
                    </div>
                    
                    <div className={styles.messageActions}>
                      <span className={styles.messageDate}>{formatDate(message.created_at)}</span>
                      {!message.is_read && (
                        <button
                          className={styles.actionButton}
                          onClick={() => handleMarkAsRead(message.id)}
                          title="Mark as read"
                          disabled={markingAsRead}
                        >
                          {markingAsRead ? (
                            <div className={styles.smallSpinner}></div>
                          ) : (
                            <FiEye />
                          )}
                        </button>
                      )}
                      
                      <button
                        className={styles.actionButton}
                        onClick={() => openDeleteModal(message)}
                        title="Delete message"
                        disabled={deletingMessage}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.messageText}>
                    <p>{truncateText(message.message)}</p>
                  </div>
                </div>
                
                {!message.is_read && (
                  <div className={styles.unreadIndicator}></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationBtn}
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || messagesLoading}
            >
              Previous
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
                  onClick={() => setCurrentPage(page)}
                  disabled={messagesLoading}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              className={styles.paginationBtn}
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === pagination.total_pages || messagesLoading}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Individual Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={messageToDelete?.sender_email || 'this message'}
        itemType="message"
        onConfirm={() => handleDeleteMessage(messageToDelete?.id)}
        onCancel={() => {
          setShowDeleteModal(false);
          setMessageToDelete(null);
        }}
        isDeleting={deletingMessage}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedMessages.length} message${selectedMessages.length > 1 ? 's' : ''}`}
        itemType="message"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        isDeleting={deletingMessage}
      />
    </div>
  );
}
