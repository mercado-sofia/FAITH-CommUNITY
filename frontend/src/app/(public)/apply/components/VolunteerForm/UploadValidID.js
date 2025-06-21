"use client";

import { useState, useEffect, forwardRef } from "react";
import Image from "next/image";
import styles from "./volunteerForm.module.css";
import { PiUploadSimpleBold } from "react-icons/pi";

const UploadValidID = forwardRef(function UploadValidID(
  { formData, handleChange, errorMessage },
  ref
) {
  const file = formData.validId;
  const [fileURL, setFileURL] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setFileURL(null);
      return;
    }

    const newUrl = URL.createObjectURL(file);
    setFileURL(newUrl);
    setIsLoading(true);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [file]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Invalid file type. Only PNG, JPEG, or PDF is allowed.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    handleChange(e);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowedTypes.includes(droppedFile.type)) {
      alert("Invalid file type. Only PNG, JPEG, or PDF is allowed.");
      return;
    }

    if (droppedFile.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    const fakeEvent = {
      target: {
        name: "validId",
        type: "file",
        files: [droppedFile],
      },
    };

    handleChange(fakeEvent);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`${styles.uploadSection} ${
        errorMessage ? styles.highlightError : ""
      }`}
      ref={ref}
    >
      {/* ✅ Label with htmlFor matches input below */}
      <label htmlFor="validId" className={styles.uploadLabel}>
        Upload Valid ID
      </label>

      <div
        className={`${styles.uploadBox} ${file ? styles.uploaded : ""} ${
          isDragging ? styles.dragging : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.uploadInner}>
          <PiUploadSimpleBold
            className={`${styles.uploadIcon} ${file ? styles.uploaded : ""}`}
          />
          <p
            className={`${styles.uploadText} ${
              file ? styles.uploaded : ""
            }`}
          >
            {file
              ? "File selected. You can change it below or drag to replace."
              : "Drag and drop your file here or browse manually"}
          </p>

          {/* ✅ Styled label for input, not wrapped */}
          <label className={styles.browseBtn}>
            Browse File
            <input
              type="file"
              name="validId"
              id="validId"
              accept="image/png, image/jpeg, application/pdf"
              onChange={handleFileChange}
              className={styles.hiddenInput}
              required
            />
          </label>

          {!file ? (
            <p className={styles.fileNoteInline}>
              Accepted: PNG, JPEG, or PDF <br />
              Max file size: 5MB
            </p>
          ) : (
            <button
              type="button"
              className={styles.fileLink}
              onClick={() => {
                if (file.type.startsWith("image/")) {
                  setShowOverlay(true);
                }
              }}
            >
              {file.name}
            </button>
          )}
        </div>
      </div>

      <small className={styles.fileNote}>
        Please upload a clear photo or scan of any valid government-issued or school ID.
      </small>

      {errorMessage && (
        <p className={styles.inlineError}>{errorMessage}</p>
      )}

      {showOverlay && file?.type.startsWith("image/") && fileURL && (
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
            <div
              style={{ position: "relative", width: "100%", height: "100%" }}
            >
              {isLoading && <div className={styles.shimmer}></div>}
              <Image
                key={fileURL}
                src={fileURL}
                alt="Selected Preview"
                width={800}
                height={600}
                style={{ objectFit: "contain", borderRadius: "10px" }}
                onLoad={() => setIsLoading(false)}
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default UploadValidID;