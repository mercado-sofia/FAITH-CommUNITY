"use client"

import { useState, useMemo } from "react"
import {
  useGetAllFaqsQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
} from "../../../rtk/superadmin/faqApi"
import styles from "../styles/faqs.module.css"

const FaqCard = ({ faq, onUpdate, onDelete, isDeleting, isUpdating }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    question: faq.question,
    answer: faq.answer,
    status: faq.status,
  })

  const handleInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await onUpdate({ id: faq.id, ...editForm })
      setIsEditing(false)
    } catch (error) {
      console.error("Update failed:", error)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
    })
  }

  if (isEditing) {
    return (
      <div className={`${styles.faqCard} ${styles.editingCard}`}>
        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.editField}>
            <label>Question:</label>
            <textarea
              name="question"
              value={editForm.question}
              onChange={handleInputChange}
              required
              disabled={isUpdating}
              className={styles.editTextarea}
              rows={3}
            />
          </div>

          <div className={styles.editField}>
            <label>Answer:</label>
            <textarea
              name="answer"
              value={editForm.answer}
              onChange={handleInputChange}
              required
              disabled={isUpdating}
              className={styles.editTextarea}
              rows={5}
            />
          </div>

          <div className={styles.editField}>
            <label>Status:</label>
            <select
              name="status"
              value={editForm.status}
              onChange={handleInputChange}
              disabled={isUpdating}
              className={styles.editSelect}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className={styles.editActions}>
            <button type="submit" className={styles.btnSave} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </button>
            <button type="button" className={styles.btnCancel} onClick={handleCancel} disabled={isUpdating}>
              Cancel
            </button>
          </div>

          <div className={styles.editNote}>
            <small>Created: {new Date(faq.created_at).toLocaleString()}</small>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.faqCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTags}>
          <span className={`${styles.statusTag} ${styles[faq.status.toLowerCase()]}`}>{faq.status.toUpperCase()}</span>
        </div>
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.question}>{faq.question}</h3>
        <p className={styles.answer}>{faq.answer}</p>
        <p className={styles.createdAt}>
          <strong>Created:</strong> {new Date(faq.created_at).toLocaleString()}
        </p>
      </div>

      <div className={styles.cardActions}>
        <button onClick={handleEdit} className={styles.btnEdit} disabled={isDeleting || isUpdating}>
          Edit
        </button>
        <button onClick={() => onDelete(faq.id)} className={styles.btnDelete} disabled={isDeleting || isUpdating}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  )
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, question, isCreating }) => {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Confirm FAQ Creation</h2>
        <div className={styles.modalBody}>
          <p>Please confirm the details for the new FAQ:</p>
          <div className={styles.confirmDetails}>
            <p>
              <strong>Question:</strong> {question}
            </p>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button onClick={onConfirm} className={styles.btnConfirm} disabled={isCreating}>
            {isCreating ? "Creating..." : "Confirm"}
          </button>
          <button onClick={onClose} className={styles.btnCancel} disabled={isCreating}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const ManageFaqs = () => {
  const [form, setForm] = useState({
    question: "",
    answer: "",
    status: "active",
  })
  const [notification, setNotification] = useState({ message: "", type: "" })
  const [statusFilter, setStatusFilter] = useState("all") // 'all', 'active', 'inactive'
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const { data: faqs = [], error: fetchError, isLoading: isFetching, refetch } = useGetAllFaqsQuery()

  const [createFaq, { isLoading: isCreating }] = useCreateFaqMutation()
  const [updateFaq, { isLoading: isUpdating }] = useUpdateFaqMutation()
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation()

  // Filter FAQs based on status
  const filteredFaqs = useMemo(() => {
    if (statusFilter === "all") return faqs
    if (statusFilter === "active") return faqs.filter((faq) => faq.status === "active")
    if (statusFilter === "inactive") return faqs.filter((faq) => faq.status === "inactive")
    return faqs
  }, [faqs, statusFilter])

  // Count active and inactive FAQs
  const faqCounts = useMemo(() => {
    const active = faqs.filter((faq) => faq.status === "active").length
    const inactive = faqs.filter((faq) => faq.status === "inactive").length
    return { active, inactive, total: faqs.length }
  }, [faqs])

  const showNotification = (message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification({ message: "", type: "" }), 5000)
  }

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCreateFaq = async (e) => {
    e.preventDefault()
    setShowConfirmModal(true)
  }

  const handleConfirmCreate = async () => {
    try {
      await createFaq(form).unwrap()
      showNotification("FAQ created successfully!")
      setForm({ question: "", answer: "", status: "active" })
      setShowConfirmModal(false)
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || "An error occurred"
      showNotification(errorMessage, "error")
      console.error("Error:", error)
    }
  }

  const handleUpdateFaq = async (updateData) => {
    try {
      await updateFaq(updateData).unwrap()
      showNotification("FAQ updated successfully!")
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || "Failed to update FAQ"
      showNotification(errorMessage, "error")
      console.error("Update error:", error)
      throw error
    }
  }

  const handleDeleteFaq = async (id) => {
    if (!window.confirm("Are you sure you want to delete this FAQ? This action cannot be undone.")) return

    try {
      await deleteFaq(id).unwrap()
      showNotification("FAQ deleted successfully!")
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || "Failed to delete FAQ"
      showNotification(errorMessage, "error")
      console.error("Delete error:", error)
    }
  }

  const handleRefresh = () => {
    refetch()
    showNotification("Data refreshed!")
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
  }

  if (isFetching) {
    return (
      <div className={styles.manageFaqsContainer}>
        <div className={styles.loading}>Loading FAQs...</div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className={styles.manageFaqsContainer}>
        <div className={styles.error}>
          <h2>Error loading FAQs</h2>
          <p>{fetchError?.data?.error || fetchError?.message || "Failed to fetch data"}</p>
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.manageFaqsContainer}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Manage FAQs</h1>
        <div className={styles.headerActions}>
          <div className={styles.filterSection}>
            <label htmlFor="statusFilter" className={styles.filterLabel}>
              Filter by Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className={styles.filterSelect}
            >
              <option value="all">All FAQs ({faqCounts.total})</option>
              <option value="active">Active ({faqCounts.active})</option>
              <option value="inactive">Inactive ({faqCounts.inactive})</option>
            </select>
          </div>
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Refresh Data
          </button>
        </div>
      </div>

      {notification.message && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>{notification.message}</div>
      )}

      <div className={styles.createSection}>
        <h2>Create New FAQ</h2>
        <form className={styles.faqForm} onSubmit={handleCreateFaq}>
          <div className={styles.formField}>
            <label htmlFor="faq-question">Question:</label>
            <textarea
              id="faq-question"
              name="question"
              placeholder="Enter the FAQ question..."
              value={form.question}
              onChange={handleInputChange}
              required
              disabled={isCreating}
              className={styles.formTextarea}
              rows={3}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="faq-answer">Answer:</label>
            <textarea
              id="faq-answer"
              name="answer"
              placeholder="Enter the FAQ answer..."
              value={form.answer}
              onChange={handleInputChange}
              required
              disabled={isCreating}
              className={styles.formTextarea}
              rows={5}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="faq-status">Status:</label>
            <select
              id="faq-status"
              name="status"
              value={form.status}
              onChange={handleInputChange}
              disabled={isCreating}
              className={styles.formSelect}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button type="submit" className={styles.btnCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create FAQ"}
          </button>
        </form>
      </div>

      <div className={styles.faqStats}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total FAQs:</span>
            <span className={styles.statValue}>{faqCounts.total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active:</span>
            <span className={`${styles.statValue} ${styles.activeCount}`}>{faqCounts.active}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Inactive:</span>
            <span className={`${styles.statValue} ${styles.inactiveCount}`}>{faqCounts.inactive}</span>
          </div>
        </div>
      </div>

      <div className={styles.faqCardsWrapper}>
        {filteredFaqs.length === 0 ? (
          <div className={styles.noData}>
            <p>
              {statusFilter === "all"
                ? "No FAQs found. Create your first FAQ above."
                : `No ${statusFilter} FAQs found.`}
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              onUpdate={handleUpdateFaq}
              onDelete={handleDeleteFaq}
              isDeleting={isDeleting}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreate}
        question={form.question}
        isCreating={isCreating}
      />
    </div>
  )
}

export default ManageFaqs
