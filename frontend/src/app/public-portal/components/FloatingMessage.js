"use client";

import { useState } from "react";
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Message to ${org}: ${message}`);
    alert("Message sent successfully!");
    setIsOpen(false);
    setOrg("");
    setMessage("");
    setDropdownOpen(false);
  };

  return (
    <div className={styles.floatingWrapper}>
      {isOpen && (
        <div className={styles.messageBox}>
          <h2>Hi There</h2>
          <p className={styles.subtext}>How can we help?</p>
          <form onSubmit={handleSubmit}>
            <label className={styles.label}>Select an Organization</label>

            {/* Custom dropdown */}
            <div className={styles.customDropdown}>
              <div
                className={`${styles.selected} ${org ? styles.selectedFilled : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {org || "Select an Organization"}
                <FaChevronDown className={styles.dropdownIcon} />
              </div>

              {dropdownOpen && (
                <ul className={styles.dropdownList}>
                  {orgOptions.map((option, index) => (
                    <li
                      key={index}
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrg(option);
                        setDropdownOpen(false);
                      }}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <textarea
              rows={5}
              placeholder="Write your message here"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />

            <button type="submit">Send</button>
          </form>
        </div>
      )}

      <button
        className={styles.chatBtn}
        onClick={() => {
          setIsOpen(!isOpen);
          setDropdownOpen(false);
        }}
        aria-label="Chat"
      >
        <FiMessageCircle />
      </button>
    </div>
  );
}