'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import styles from './RelatedPrograms.module.css';
import { getProgramImageUrl } from '@/utils/shared/uploadPaths';
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils';


const getStatusClass = (status) => {
  switch (status) {
    case 'Upcoming':
      return styles.statusUpcoming;
    case 'Active':
      return styles.statusActive;
    case 'Completed':
      return styles.statusCompleted;
    default:
      return styles.statusCompleted;
  }
};

// Utility function to truncate HTML while preserving formatting
const truncateHTML = (html, maxChars = 100) => {
  if (!html) return '';
  
  // First sanitize the HTML
  const sanitized = DOMPurify.sanitize(html);
  
  // Check if we need to truncate by getting plain text length
  if (typeof document === 'undefined') {
    // Server-side: return sanitized HTML (will be handled on client)
    return sanitized;
  }
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;
  const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
  
  // If content is short enough, return as-is
  if (plainText.length <= maxChars) {
    return sanitized;
  }
  
  // Need to truncate - use a simpler approach that preserves HTML structure
  return truncateHTMLContent(tempDiv, maxChars);
};

// Helper function to truncate HTML content while preserving tags
const truncateHTMLContent = (container, maxChars) => {
  let charCount = 0;
  const result = document.createElement('div');
  const stack = [result];
  
  const walk = (node) => {
    if (charCount >= maxChars) {
      return;
    }
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const remaining = maxChars - charCount;
      
      if (text.length <= remaining) {
        // Add all text
        stack[stack.length - 1].appendChild(document.createTextNode(text));
        charCount += text.length;
      } else {
        // Truncate text
        const truncated = text.substring(0, remaining);
        stack[stack.length - 1].appendChild(document.createTextNode(truncated));
        charCount = maxChars;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Clone the element (without children)
      const clone = node.cloneNode(false);
      stack[stack.length - 1].appendChild(clone);
      stack.push(clone);
      
      // Process children
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (charCount >= maxChars) break;
        walk(child);
      }
      
      stack.pop();
    }
  };
  
  // Process all nodes
  const children = Array.from(container.childNodes);
  for (const child of children) {
    if (charCount >= maxChars) break;
    walk(child);
  }
  
  // Add ellipsis if truncated
  if (charCount >= maxChars) {
    const lastNode = getLastTextNode(result);
    if (lastNode) {
      lastNode.textContent = (lastNode.textContent || '') + '...';
    } else {
      result.appendChild(document.createTextNode('...'));
    }
  }
  
  return result.innerHTML;
};

// Helper to get the last text node in a tree
const getLastTextNode = (node) => {
  let lastTextNode = null;
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    lastTextNode = currentNode;
  }
  
  return lastTextNode;
};

export default function OtherPrograms({ otherPrograms, organizationName, organizationAcronym, organizationId }) {
  const router = useRouter();

  if (!otherPrograms || otherPrograms.length === 0) {
    return null;
  }

  return (
    <div className={styles.otherProgramsContainer}>
      <div className={styles.otherProgramsContent}>
        <div className={styles.otherProgramsHeader}>
          <h3 className={styles.otherProgramsTitle}>
            Related Programs from {organizationAcronym || organizationName}
          </h3>
          <span className={styles.programsCount}>
            {otherPrograms.length} {otherPrograms.length === 1 ? 'program' : 'programs'}
          </span>
        </div>
        
        <div className={styles.otherProgramsGrid}>
          {otherPrograms.slice(0, 6).map((otherProgram) => {
            const otherProgramStatus = getProgramStatusByDates(otherProgram);
            return (
              <div 
                key={otherProgram.id} 
                className={styles.otherProgramCard}
                onClick={() => router.push(`/programs/${otherProgram.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/programs/${otherProgram.slug}`);
                  }
                }}
                aria-label={`View ${otherProgram.title} program details`}
              >
                {otherProgram.image && (
                  <div className={styles.otherProgramImageContainer}>
                    <Image
                      src={getProgramImageUrl(otherProgram.image)}
                      alt={otherProgram.title}
                      width={300}
                      height={200}
                      className={styles.otherProgramImage}
                    />
                    <div className={styles.otherProgramOverlay}>
                      <span className={styles.viewDetails}>View Details</span>
                    </div>
                  </div>
                )}
                
                <div className={styles.otherProgramContent}>
                  <h4 className={styles.otherProgramTitle}>{otherProgram.title}</h4>
                  <div 
                    className={`${styles.otherProgramDescription} richTextContent`}
                    dangerouslySetInnerHTML={{ 
                      __html: otherProgram.description 
                        ? truncateHTML(otherProgram.description, 100)
                        : '' 
                    }} 
                  />
                  
                  <div className={styles.otherProgramMeta}>
                    <span className={`${styles.otherProgramStatusBadge} ${getStatusClass(otherProgramStatus)}`}>
                      {otherProgramStatus}
                    </span>
                    <span className={styles.otherProgramCategory}>{otherProgram.category}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {otherPrograms.length > 6 && (
          <div className={styles.seeAllContainer}>
            <button 
              className={styles.seeAllButton}
              onClick={() => router.push(`/programs/org/${organizationAcronym || organizationId}`)}
            >
              See All Programs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
