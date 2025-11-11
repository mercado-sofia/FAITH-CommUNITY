'use client'

import styles from './SkeletonLoader.module.css'

export default function SkeletonLoader({ type = 'section', count = 1, className = '', columns = [] }) {
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
      
      case 'approvals':
        return (
          <div className={styles.approvalsSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
            </div>
            <div className={styles.tableSkeleton}>
              <div className={styles.tableHeaderSkeleton}>
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
              </div>
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.tableRowSkeleton}>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.checkboxSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.textSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.textSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.textSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.badgeSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.actionButtonSkeleton} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'invites':
        return (
          <div className={styles.invitesSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
            </div>
            <div className={styles.tableSkeleton}>
              <div className={styles.tableHeaderSkeleton}>
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
              </div>
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.tableRowSkeleton}>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.checkboxSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.emailSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.dateTimeSkeleton}>
                      <div className={styles.dateSkeleton} />
                      <div className={styles.timeSkeleton} />
                    </div>
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.dateTimeSkeleton}>
                      <div className={styles.dateSkeleton} />
                      <div className={styles.timeSkeleton} />
                    </div>
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.badgeSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.actionButtonSkeleton} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'faqs':
        return (
          <div className={styles.faqsSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
            </div>
            <div className={styles.tableSkeleton}>
              <div className={styles.faqsTableHeaderSkeleton}>
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
                <div className={styles.headerCellSkeleton} />
              </div>
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.faqsTableRowSkeleton}>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.numberSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.checkboxSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.textSkeleton} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.textSkeleton} style={{ width: '80%' }} />
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.dateTimeSkeleton}>
                      <div className={styles.dateSkeleton} />
                      <div className={styles.timeSkeleton} />
                    </div>
                  </div>
                  <div className={styles.cellSkeleton}>
                    <div className={styles.actionButtonsSkeleton}>
                      <div className={styles.actionButtonSkeleton} />
                      <div className={styles.actionButtonSkeleton} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'programs':
        return (
          <div className={styles.programsSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
            </div>
            <div className={styles.programsGridSkeleton}>
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.programCardSkeleton}>
                  <div className={styles.cardImageSkeleton} />
                  <div className={styles.cardContentSkeleton}>
                    <div className={styles.cardTitleSkeleton} />
                    <div className={styles.cardOrgSkeleton} />
                    <div className={styles.cardDescriptionSkeleton} />
                    <div className={styles.cardDescriptionSkeleton} style={{ width: '70%' }} />
                    <div className={styles.cardFooterSkeleton}>
                      <div className={styles.badgeSkeleton} />
                      <div className={styles.dateSkeleton} style={{ width: '100px' }} />
                    </div>
                    <div className={styles.cardButtonSkeleton} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'highlights':
        return (
          <div className={styles.highlightsSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
            </div>
            <div className={styles.highlightsGridSkeleton}>
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.highlightCardSkeleton}>
                  <div className={styles.cardImageSkeleton} />
                  <div className={styles.cardContentSkeleton}>
                    <div className={styles.cardTitleSkeleton} />
                    <div className={styles.cardOrgSkeleton} />
                    <div className={styles.cardDescriptionSkeleton} />
                    <div className={styles.cardDescriptionSkeleton} style={{ width: '70%' }} />
                    <div className={styles.cardFooterSkeleton}>
                      <div className={styles.badgeSkeleton} />
                      <div className={styles.dateSkeleton} style={{ width: '100px' }} />
                    </div>
                    <div className={styles.cardButtonSkeleton} />
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
              <div className={styles.headerCellSkeleton} />
              <div className={styles.headerCellSkeleton} />
              <div className={styles.headerCellSkeleton} />
              <div className={styles.headerCellSkeleton} />
              <div className={styles.headerCellSkeleton} />
              <div className={styles.headerCellSkeleton} />
            </div>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className={styles.tableRowSkeleton}>
                <div className={styles.cellSkeleton}>
                  <div className={styles.checkboxSkeleton} />
                </div>
                <div className={styles.cellSkeleton}>
                  <div className={styles.textSkeleton} />
                </div>
                <div className={styles.cellSkeleton}>
                  <div className={styles.textSkeleton} />
                </div>
                <div className={styles.cellSkeleton}>
                  <div className={styles.textSkeleton} />
                </div>
                <div className={styles.cellSkeleton}>
                  <div className={styles.badgeSkeleton} />
                </div>
                <div className={styles.cellSkeleton}>
                  <div className={styles.actionButtonSkeleton} />
                </div>
              </div>
            ))}
          </div>
        )
      
      case 'settings':
        return (
          <div className={styles.settingsPageSkeleton}>
            {/* Header Skeleton */}
            <div className={styles.settingsHeaderSkeleton}>
              <div className={styles.settingsTitleSkeleton} />
            </div>
            
            {/* Tab Navigation Skeleton */}
            <div className={styles.tabNavigationSkeleton}>
              <div className={styles.tabButtonSkeleton} />
              <div className={styles.tabButtonSkeleton} />
            </div>
            
            {/* Settings Grid Skeleton */}
            <div className={styles.settingsGridSkeleton}>
              {/* Email Address Panel Skeleton */}
              <div className={styles.settingsPanelSkeleton}>
                <div className={styles.panelHeaderSkeleton}>
                  <div className={styles.panelIconSkeleton} />
                  <div className={styles.panelTitleGroupSkeleton}>
                    <div className={styles.panelTitleTextSkeleton} />
                    <div className={styles.panelSubtitleSkeleton} />
                  </div>
                  <div className={styles.panelEditButtonSkeleton} />
                </div>
                <div className={styles.panelContentSkeleton}>
                  <div className={styles.fieldGroupSkeleton}>
                    <div className={styles.fieldLabelSkeleton} />
                    <div className={styles.fieldValueSkeleton} />
                  </div>
                </div>
              </div>
              
              {/* Password & Security Panel Skeleton */}
              <div className={styles.settingsPanelSkeleton}>
                <div className={styles.panelHeaderSkeleton}>
                  <div className={styles.panelIconSkeleton} />
                  <div className={styles.panelTitleGroupSkeleton}>
                    <div className={styles.panelTitleTextSkeleton} />
                    <div className={styles.panelSubtitleSkeleton} />
                  </div>
                  <div className={styles.panelEditButtonSkeleton} />
                </div>
                <div className={styles.panelContentSkeleton}>
                  <div className={styles.fieldGroupSkeleton}>
                    <div className={styles.fieldLabelSkeleton} />
                    <div className={styles.passwordInfoSkeleton}>
                      <div className={styles.infoTextSkeleton} />
                      <div className={styles.infoTextSkeleton} style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Two-Factor Authentication Panel Skeleton */}
            <div className={styles.twoFAPanelSkeleton}>
              <div className={styles.settingsPanelSkeleton}>
                <div className={styles.panelHeaderSkeleton}>
                  <div className={styles.panelIconSkeleton} />
                  <div className={styles.panelTitleGroupSkeleton}>
                    <div className={styles.panelTitleTextSkeleton} />
                    <div className={styles.panelSubtitleSkeleton} />
                  </div>
                  <div className={styles.panelEditButtonSkeleton} />
                </div>
                <div className={styles.panelContentSkeleton}>
                  <div className={styles.fieldGroupSkeleton}>
                    <div className={styles.fieldLabelSkeleton} />
                    <div className={styles.passwordInfoSkeleton}>
                      <div className={styles.infoTextSkeleton} />
                      <div className={styles.infoTextSkeleton} style={{ width: '90%' }} />
                    </div>
                  </div>
                </div>
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