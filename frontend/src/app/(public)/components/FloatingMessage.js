"use client";

import { useState, useRef, useEffect } from "react";
import styles from "../styles/floatingMessage.module.css";
import { FiMessageCircle } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";

const orgOptions = [
  "JMAP", "FACTS", "JPIA", "FAICEPS", "FTL",
  "UTHYP", "FAIPS", "FABCOMMS", "FAPSS", "FAHSS"
];

export default function FloatingMessage() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");
  const [clickLocked, setClickLocked] = useState(false);

  const boxRef = useRef(null);

  // Handle outside click, ESC press
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        closeMessageBox();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMessageBox();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeMessageBox = () => {
    setIsOpen(false);
    setDropdownOpen(false);
    setOrg("");
    setMessage("");

    setClickLocked(true); // prevent quick reopen
    setTimeout(() => setClickLocked(false), 300); // adjust to match your close animation
  };

  const handleToggleChat = () => {
    if (clickLocked) return;

    if (isOpen) {
      closeMessageBox();
    } else {
      setIsOpen(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Message to ${org}: ${message}`);
    alert("Message sent successfully!");
    closeMessageBox();
  };

  return (
    <div className={styles.floatingWrapper}>
      {isOpen && (
        <div className={styles.messageBox} ref={boxRef}>
          <h2>Hi There</h2>
          <p className={styles.subtext}>How can we help?</p>
          <form onSubmit={handleSubmit}>
            <label className={styles.label}>Select an Organization</label>

            <div className={styles.customDropdown}>
              <div
                id="org-select"
                className={`${styles.selected} ${org ? styles.selectedFilled : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                role="button"
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
              >
                {org || "Select an Organization"}
                <FaChevronDown className={styles.dropdownIcon} />
              </div>

              {dropdownOpen && (
                <ul className={styles.dropdownList} role="listbox">
                  {orgOptions.map((option, index) => (
                    <li
                      key={index}
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrg(option);
                        setDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={org === option}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input type="hidden" name="organization" value={org} />

            <textarea
              id="user-message"
              name="message"
              rows={5}
              placeholder="Write your message here"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              autoComplete="off"
            />

            <button
              className={styles.sendBtn}
              type="submit"
              disabled={!org || !message.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        className={styles.chatBtn}
        onClick={handleToggleChat}
        aria-label="Chat"
      >
        <FiMessageCircle />
      </button>
    </div>
  );
}