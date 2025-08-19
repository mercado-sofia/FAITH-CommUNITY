'use client'

import styles from './styles/SkeletonLoader.module.css'

export default function SkeletonLoader({ type = 'section', count = 1, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'orgInfo':
        return (
          <div className={styles.orgInfoSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.editButtonSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.logoSkeleton} />
              <div className={styles.detailsSkeleton}>
                <div className={styles.nameSkeleton} />
                <div className={styles.descriptionSkeleton} />
                <div className={styles.contactSkeleton} />
              </div>
            </div>
          </div>
        )
      
      case 'orgHeads':
        return (
          <div className={styles.orgHeadsSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
              <div className={styles.controlsSkeleton}>
                <div className={styles.buttonSkeleton} />
                <div className={styles.buttonSkeleton} />
              </div>
            </div>
            <div className={styles.headsGridSkeleton}>
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.headCardSkeleton}>
                  <div className={styles.headPhotoSkeleton} />
                  <div className={styles.headInfoSkeleton}>
                    <div className={styles.headNameSkeleton} />
                    <div className={styles.headRoleSkeleton} />
                    <div className={styles.headContactSkeleton} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'table':
        return (
          <div className={styles.tableSkeleton}>
            <div className={styles.tableHeaderSkeleton}>
              <div className={styles.tableTitleSkeleton} />
              <div className={styles.tableActionsSkeleton}>
                <div className={styles.buttonSkeleton} />
                <div className={styles.buttonSkeleton} />
              </div>
            </div>
            <div className={styles.tableContentSkeleton}>
              <div className={styles.tableRowSkeleton}>
                {Array.from({ length: count }).map((_, index) => (
                  <div key={index} className={styles.tableCellSkeleton} />
                ))}
              </div>
              <div className={styles.tableRowSkeleton}>
                {Array.from({ length: count }).map((_, index) => (
                  <div key={index} className={styles.tableCellSkeleton} />
                ))}
              </div>
              <div className={styles.tableRowSkeleton}>
                {Array.from({ length: count }).map((_, index) => (
                  <div key={index} className={styles.tableCellSkeleton} />
                ))}
              </div>
            </div>
          </div>
        )
      
      case 'card':
        return (
          <div className={styles.cardSkeleton}>
            <div className={styles.cardHeaderSkeleton}>
              <div className={styles.cardTitleSkeleton} />
              <div className={styles.cardMetaSkeleton} />
            </div>
            <div className={styles.cardContentSkeleton}>
              <div className={styles.cardImageSkeleton} />
              <div className={styles.cardTextSkeleton}>
                <div className={styles.textSkeleton} />
                <div className={styles.textSkeleton} />
                <div className={styles.textSkeleton} />
              </div>
            </div>
            <div className={styles.cardFooterSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'grid':
        return (
          <div className={styles.gridSkeleton}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className={styles.gridItemSkeleton}>
                <div className={styles.gridImageSkeleton} />
                <div className={styles.gridContentSkeleton}>
                  <div className={styles.gridTitleSkeleton} />
                  <div className={styles.gridTextSkeleton} />
                  <div className={styles.gridTextSkeleton} />
                </div>
              </div>
            ))}
          </div>
        )
      
      case 'form':
        return (
          <div className={styles.formSkeleton}>
            <div className={styles.formHeaderSkeleton}>
              <div className={styles.formTitleSkeleton} />
            </div>
            <div className={styles.formContentSkeleton}>
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
            </div>
            <div className={styles.formFooterSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        )
      
      case 'dashboard':
        return (
          <div className={styles.dashboardSkeleton}>
            <div className={styles.dashboardHeaderSkeleton}>
              <div className={styles.dashboardTitleSkeleton} />
              <div className={styles.dashboardStatsSkeleton}>
                <div className={styles.statCardSkeleton} />
                <div className={styles.statCardSkeleton} />
                <div className={styles.statCardSkeleton} />
                <div className={styles.statCardSkeleton} />
              </div>
            </div>
            <div className={styles.dashboardContentSkeleton}>
              <div className={styles.chartSkeleton} />
              <div className={styles.recentActivitySkeleton}>
                <div className={styles.activityItemSkeleton} />
                <div className={styles.activityItemSkeleton} />
                <div className={styles.activityItemSkeleton} />
              </div>
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
