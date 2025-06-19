import styles from "./volunteerForm.module.css";

export default function SubmitStatus({ status }) {
  if (!status.submitted) return null;

  return (
    <div
      className={`${styles.statusMessage} ${
        status.success ? styles.success : styles.error
      }`}
    >
      {status.message}
    </div>
  );
}