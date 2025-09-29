'use client'

import styles from './SkeletonLoader.module.css'

export default function SkeletonLoader({ type = 'section', count = 1, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'siteContent':
        return (
          <div className={styles.siteContentSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.inputSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.textareaSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.imageUploadSkeleton}>
                  <div className={styles.imagePreviewSkeleton} />
                  <div className={styles.uploadButtonSkeleton} />
                </div>
              </div>
            </div>
            <div className={styles.footerSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'aboutUs':
        return (
          <div className={styles.aboutUsSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.inputSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.inputSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.textareaSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.imageUploadSkeleton}>
                  <div className={styles.imagePreviewSkeleton} />
                  <div className={styles.uploadButtonSkeleton} />
                </div>
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.categoriesSkeleton}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className={styles.categoryItemSkeleton}>
                      <div className={styles.categoryNameSkeleton} />
                      <div className={styles.categoryActionsSkeleton}>
                        <div className={styles.actionButtonSkeleton} />
                        <div className={styles.actionButtonSkeleton} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.footerSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'heroSection':
        return (
          <div className={styles.heroSectionSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.inputSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.textareaSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.bannerImagesSkeleton}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className={styles.bannerImageSkeleton}>
                      <div className={styles.imagePreviewSkeleton} />
                      <div className={styles.imageActionsSkeleton}>
                        <div className={styles.actionButtonSkeleton} />
                        <div className={styles.actionButtonSkeleton} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.footerSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'missionVision':
        return (
          <div className={styles.missionVisionSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.textareaSkeleton} />
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.textareaSkeleton} />
              </div>
            </div>
            <div className={styles.footerSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'branding':
        return (
          <div className={styles.brandingSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.logoUploadSkeleton}>
                  <div className={styles.logoPreviewSkeleton} />
                  <div className={styles.uploadButtonSkeleton} />
                </div>
              </div>
              <div className={styles.formGroupSkeleton}>
                <div className={styles.labelSkeleton} />
                <div className={styles.colorPickerSkeleton}>
                  <div className={styles.colorSwatchSkeleton} />
                  <div className={styles.colorSwatchSkeleton} />
                  <div className={styles.colorSwatchSkeleton} />
                </div>
              </div>
            </div>
            <div className={styles.footerSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'section':
      default:
        return (
          <div className={styles.sectionSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.textSkeleton} />
              <div className={styles.textSkeleton} />
              <div className={styles.textSkeleton} />
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`${styles.skeletonContainer} ${className}`}>
      {renderSkeleton()}
    </div>
  )
}
