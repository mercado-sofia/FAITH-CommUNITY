# AdvocacyCompetency Component

## Overview
This module provides a unified approach to handling advocacy and competency sections for organizations.

## Final Structure

```
AdvocacyCompetency/
├── index.js                          # Main exports
├── README.md                         # Documentation
├── components/                       # Reusable components
│   ├── index.js                      # Component exports
│   ├── AutoResizeTextarea/           # Self-contained component
│   │   ├── index.js
│   │   ├── AutoResizeTextarea.js
│   │   └── AutoResizeTextarea.module.css
│   └── Section/                      # Unified section component
│       ├── index.js
│       ├── Section.js
│       └── Section.module.css
├── modals/                          # Modal components
│   ├── index.js                     # Modal exports
│   ├── SectionEditModal.js          # Edit modal
│   ├── SectionSummaryModal.js       # Summary modal
│   └── styles/                      # Modal styles
│       ├── modalBase.module.css     # Shared base styles
│       ├── SectionEditModal.module.css
│       └── SectionSummaryModal.module.css
├── hooks/                           # Custom hooks
│   ├── index.js                     # Hook exports
│   ├── useModalScrollLock.js        # Modal scroll lock
│   └── useFormChanges.js            # Form change detection
└── config/                          # Configuration
    ├── index.js                     # Config exports
    └── sectionConfig.js             # Section configurations
```

### Components
- **Section**: Unified component that handles both advocacy and competency sections
- **AutoResizeTextarea**: Reusable textarea component with auto-resize functionality

### Modals
- **SectionEditModal**: Modal for editing section content
- **SectionSummaryModal**: Modal for reviewing changes before submission

### Hooks
- **useModalScrollLock**: Locks background scroll when modal is open
- **useFormChanges**: Detects changes in form data

### Configuration
- **sectionConfigs**: Configuration object defining section types and their properties

## Usage

### Using the Unified Section Component

```javascript
import { Section } from './AdvocacyCompetency'

// In your parent component
<Section 
  type="advocacy"
  data={advocacyData}
  setIsEditing={setIsEditing}
  setShowEditModal={setShowEditModal}
  setOriginalData={setOriginalData}
  setCurrentSection={setCurrentSection}
  setTempEditData={setTempEditData}
/>

<Section 
  type="competency"
  data={competencyData}
  setIsEditing={setIsEditing}
  setShowEditModal={setShowEditModal}
  setOriginalData={setOriginalData}
  setCurrentSection={setCurrentSection}
  setTempEditData={setTempEditData}
/>
```

### Migration from Old Components

Replace:
```javascript
// Old way
<AdvocacySection advocacyData={advocacyData} ... />
<CompetencySection competencyData={competencyData} ... />
```

With:
```javascript
// New way
<Section type="advocacy" data={advocacyData} ... />
<Section type="competency" data={competencyData} ... />
```

## Benefits
- **DRY Principle**: Single component handles both section types
- **Easier Maintenance**: Changes only need to be made once
- **Consistent Behavior**: Guaranteed identical functionality
- **Extensible**: Easy to add new section types by updating sectionConfigs
- **Better Testing**: Only one component to test thoroughly

## Adding New Section Types

To add a new section type (e.g., 'mission'), simply update the configuration:

```javascript
// In config/sectionConfig.js
export const sectionConfigs = {
  advocacy: { ... },
  competency: { ... },
  mission: {
    title: 'Mission',
    field: 'mission',
    placeholder: 'No mission information specified',
    type: 'mission'
  }
}
```

Then use it:
```javascript
<Section type="mission" data={missionData} ... />
```
