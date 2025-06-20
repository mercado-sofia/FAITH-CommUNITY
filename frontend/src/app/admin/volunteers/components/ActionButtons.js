import { FaCheck, FaTimes } from 'react-icons/fa';
import styles from '../../styles/volunteers.module.css';

export default function ActionButtons({ app, onTrigger }) {
  return (
    <>
      <button
        className={styles.iconButton}
        onClick={() => onTrigger(app.id, 'Approved')}
        title={`Approve ${app.name}`}
      >
        <FaCheck />
      </button>
      <button
        className={styles.iconButton}
        onClick={() => onTrigger(app.id, 'Rejected')}
        title={`Reject ${app.name}`}
      >
        <FaTimes />
      </button>
    </>
  );
}