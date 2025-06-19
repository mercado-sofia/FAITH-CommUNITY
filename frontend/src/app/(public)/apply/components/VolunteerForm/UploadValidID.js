"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./volunteerForm.module.css";
import { PiUploadSimpleBold } from "react-icons/pi";

export default function UploadValidID({ formData, handleChange }) {
  const file = formData.validId;
  const [fileURL, setFileURL] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!file) return;

    const newUrl = URL.createObjectURL(file);
    setFileURL(newUrl);
    setIsLoading(true);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [file]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    handleChange(e);
  };

  return (
    <div className={styles.uploadSection}>
      <label htmlFor="validId" className={styles.uploadLabel}>
        Upload Valid ID
      </label>

      <div className={`${styles.uploadBox} ${file ? styles.uploaded : ""}`}>
        <div className={styles.uploadInner}>
          <PiUploadSimpleBold
            className={`${styles.uploadIcon} ${file ? styles.uploaded : ""}`}
          />
          <p className={`${styles.uploadText} ${file ? styles.uploaded : ""}`}>
            {file
              ? "File selected. You can change it below."
              : "Drag and drop your valid ID here, or"}
          </p>

          <label htmlFor="validId" className={styles.browseBtn}>
            Browse File
          </label>
          <input
            type="file"
            id="validId"
            name="validId"
            accept="image/png, image/jpeg, application/pdf"
            onChange={handleFileChange}
            className={styles.hiddenInput}
            required
          />

          {file && (
            <button
              type="button"
              className={styles.fileLink}
              onClick={() => setShowOverlay(true)}
            >
              {file.name}
            </button>
          )}
        </div>
      </div>

      <small className={styles.fileNote}>
        Please upload a clear photo or scan of any valid government-issued or school ID.
        <br />
        <strong>Max file size: 5MB</strong>
      </small>

      {showOverlay && file?.type.startsWith("image/") && (
        <div className={styles.overlayPreview}>
          <div
            className={styles.overlayBackdrop}
            onClick={() => setShowOverlay(false)}
          />
          <div className={styles.overlayContent}>
            <button
              className={styles.overlayClose}
              onClick={() => setShowOverlay(false)}
            >
              &times;
            </button>
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {isLoading && <div className={styles.shimmer}></div>}
              {fileURL && (
                <Image
                  key={fileURL}
                  src={fileURL}
                  alt="Selected Preview"
                  width={800}
                  height={600}
                  style={{ objectFit: "contain", borderRadius: "10px" }}
                  onLoad={() => setIsLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}