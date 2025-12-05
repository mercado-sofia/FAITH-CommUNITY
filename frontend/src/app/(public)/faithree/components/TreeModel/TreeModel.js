'use client'

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import StarModal from '../StarModal/StarModal'
import StarPreviewOverlay from '../StarPreviewOverlay/StarPreviewOverlay'
import styles from './TreeModel.module.css'

// Star component - creates a glowing star shape (static like fruit on tree)
function Star({ position, treePosition = [0, 0, 0], cameraOffset = [2.5, 2.2, 7.5], starId, onStarClick, onHover, onHoverOut, impactLevel = 'average', highlight }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  // Calculate star size based on impact level
  const sizeMultiplier = impactLevel === 'high' ? 1.4 : impactLevel === 'average' ? 1.2 : 1.0
  
  // Create star geometry with size based on impact level
  const starShape = useMemo(() => {
    const shape = new THREE.Shape()
    const baseOuterRadius = 0.10  // Reduced from 0.13 for smaller stars
    const baseInnerRadius = 0.055  // Reduced from 0.07 for smaller stars
    const outerRadius = baseOuterRadius * sizeMultiplier
    const innerRadius = baseInnerRadius * sizeMultiplier
    const spikes = 5
    const step = (Math.PI * 2) / spikes

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = i * step * 0.5
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      
      if (i === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    }
    shape.closePath()
    return shape
  }, [sizeMultiplier])

  const extrudeSettings = useMemo(() => ({
    depth: 0.045 * sizeMultiplier,
    bevelEnabled: true,
    bevelThickness: 0.018 * sizeMultiplier,
    bevelSize: 0.009 * sizeMultiplier,
    bevelSegments: 3
  }), [sizeMultiplier])

  // Color and emissive based on impact level
  const starColor = impactLevel === 'high' ? '#FFD700' : impactLevel === 'average' ? '#FFE135' : '#FFD700'
  const baseEmissiveIntensity = impactLevel === 'high' ? 0.8 : impactLevel === 'average' ? 0.6 : 0.5
  
  // Calculate base position (static - no animation)
  const basePosition = useMemo(() => [
    treePosition[0] + position[0],
    treePosition[1] + position[1],
    treePosition[2] + position[2]
  ], [treePosition, position])

  // Calculate camera position relative to tree
  const cameraPosition = useMemo(() => [
    treePosition[0] + cameraOffset[0],
    treePosition[1] + cameraOffset[1],
    treePosition[2] + cameraOffset[2]
  ], [treePosition, cameraOffset])

  // Make star face the camera
  useFrame(() => {
    if (groupRef.current) {
      const cameraPos = new THREE.Vector3(...cameraPosition)
      // Reset rotation first
      groupRef.current.quaternion.identity()
      // Use lookAt to orient the star toward the camera
      groupRef.current.lookAt(cameraPos)
      // lookAt makes negative Z point at target, so rotate 180° around Y to flip it
      // so that positive Z (front face) points at camera
      const flipRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      groupRef.current.quaternion.multiply(flipRotation)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (onStarClick) {
      onStarClick(starId)
    }
  }

  const handlePointerOver = (e) => {
    e.stopPropagation()
    setHovered(true)
    if (onHover && highlight && groupRef.current) {
      // Get world position of the star
      const worldPosition = new THREE.Vector3()
      groupRef.current.getWorldPosition(worldPosition)
      // Get mouse position from native DOM event for accurate positioning
      const nativeEvent = e.nativeEvent || e
      // Pass highlight data, 3D position, and native event to parent
      onHover(highlight, worldPosition, nativeEvent)
    }
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    setHovered(false)
    if (onHoverOut) {
      onHoverOut()
    }
  }

  return (
    <group
      ref={groupRef}
      position={basePosition}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh 
        ref={meshRef}
      >
        <extrudeGeometry args={[starShape, extrudeSettings]} />
        <meshStandardMaterial
          color={starColor}
          emissive={starColor}
          emissiveIntensity={hovered ? baseEmissiveIntensity * 1.5 : baseEmissiveIntensity}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      {/* Add a point light to make the star glow - enhanced on hover and based on impact level */}
      <pointLight
        color={starColor}
        intensity={hovered ? (impactLevel === 'high' ? 1.0 : impactLevel === 'average' ? 0.7 : 0.5) : (impactLevel === 'high' ? 0.6 : impactLevel === 'average' ? 0.4 : 0.3)}
        distance={hovered ? (impactLevel === 'high' ? 4 : 3) : (impactLevel === 'high' ? 3 : 2)}
      />
    </group>
  )
}

// Component to load and display the GLB model
function Model({ url, treePosition = [0, 0, 0], theme = 'morning', onLoad = null }) {
  const { scene } = useGLTF(url)
  
  // Notify parent when model is loaded
  useEffect(() => {
    if (scene && onLoad) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        onLoad()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [scene, onLoad])
  
  // Clone the scene to avoid mutating the original
  const clonedScene = scene.clone()
  
  // Darken tree, grass, and soil materials slightly during rainy season
  if (theme === 'rainy') {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        
        materials.forEach(material => {
          if (material.isMeshStandardMaterial || material.isMeshPhongMaterial || material.isMeshBasicMaterial) {
            const currentColor = material.color
            // Check if material is green-ish (tree canopy, grass, vegetation)
            // Green is dominant if green channel is higher than red and blue
            const isGreen = currentColor.g > currentColor.r && currentColor.g > currentColor.b
            
            // Check if material is brown/tan-ish (soil cone, tree trunk)
            // Brown/tan typically has red and green higher than blue, with red often being highest
            const isBrown = currentColor.r > 0.2 && currentColor.g > 0.15 && 
                           currentColor.b < currentColor.r && currentColor.b < currentColor.g &&
                           (currentColor.r > currentColor.g || Math.abs(currentColor.r - currentColor.g) < 0.2)
            
            // If it's green (likely tree/grass), darken it slightly (multiply by 0.88 for subtle darkening)
            if (isGreen && currentColor.g > 0.4) {
              material.color.multiplyScalar(0.88)
            }
            // If it's brown/tan (likely soil cone, tree trunk), darken it slightly but not too much (0.90)
            else if (isBrown && currentColor.r > 0.25) {
              material.color.multiplyScalar(0.90)
            }
          }
        })
      }
    })
  }
  
  // Calculate bounding box to center the model properly
  const box = new THREE.Box3().setFromObject(clonedScene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  
  // Position the model at the specified position (default: centered at origin)
  // treePosition allows you to move the tree: [x, y, z]
  // Example: [0, 0, 0] = center, [2, 0, 0] = 2 units to the right
  clonedScene.position.set(
    -center.x + treePosition[0],
    -center.y + treePosition[1],
    -center.z + treePosition[2]
  )
  
  // Scale to make it bigger - increased scale significantly
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 6.0 / maxDim // Increased from 4.5 to 6.0 for even bigger tree
  clonedScene.scale.set(scale, scale, scale)
  
  // Rotate the tree to face the camera directly (front-on, symmetrical view)
  // Rotate around Y-axis to orient the tree properly
  // Adjusted to face front - rotating more
  clonedScene.rotation.y = Math.PI / 1.6 // Rotate ~120° to face front
  
  return <primitive object={clonedScene} />
}

// Static controls component - tree stays fixed, no rotation
function StaticControls({ 
  treePosition = [0, 0, 0], 
  cameraOffset = [2.5, 2.2, 7.5]
}) {
  const controlsRef = useRef()

  useEffect(() => {
    // Wait a bit for controls to be ready
    const timer = setTimeout(() => {
      const controls = controlsRef.current
      if (!controls || !controls.domElement) return

      // Set camera to default position (no saved position needed since it's static)
      // Slightly higher Y to see tree top without cutting off
      const idealPos = new THREE.Vector3(
        treePosition[0] + cameraOffset[0],
        treePosition[1] + cameraOffset[1] + 0.3,
        treePosition[2] + cameraOffset[2]
      )
      
      controls.object.position.copy(idealPos)
      controls.target.copy(new THREE.Vector3(...treePosition))
      controls.update()
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [treePosition, cameraOffset])

  useFrame(() => {
    if (!controlsRef.current) return

    const controls = controlsRef.current
    
    // Keep target fixed at tree position (prevents tree from moving)
    const currentTarget = controls.target
    const treeTarget = new THREE.Vector3(...treePosition)
    
    if (currentTarget.distanceTo(treeTarget) > 0.01) {
      currentTarget.copy(treeTarget)
    }
    
    // Update controls
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={false}
      enableRotate={false}
      minDistance={8.5}
      maxDistance={8.5}
      autoRotate={false}
      target={treePosition}
      maxPolarAngle={Math.PI / 2.4}
      minPolarAngle={Math.PI / 2.4}
      minAzimuthAngle={-0.6}
      maxAzimuthAngle={0.6}
      enableDamping={false}
      dampingFactor={0.1}
    />
  )
}

// Component to project 3D coordinates to 2D screen coordinates
function CoordinateProjector({ onProject }) {
  const { camera, size } = useThree()
  const canvasRef = useRef()

  useEffect(() => {
    // Get canvas element
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    canvasRef.current = canvas

    // Function to project 3D to 2D
    const project3DTo2D = (worldPosition) => {
      if (!camera || !canvas) return null

      // Project 3D world position to normalized device coordinates (NDC)
      const vector = worldPosition.clone()
      vector.project(camera)

      // Convert NDC to screen pixel coordinates (within canvas)
      const x = (vector.x * 0.5 + 0.5) * size.width
      const y = (vector.y * -0.5 + 0.5) * size.height

      // Get canvas position relative to viewport
      const rect = canvas.getBoundingClientRect()
      const screenX = rect.left + x
      const screenY = rect.top + y

      return { x: screenX, y: screenY }
    }

    // Expose projection function to parent
    if (onProject) {
      onProject(project3DTo2D)
    }
  }, [camera, size, onProject])

  return null
}

// Loading fallback
function Loading() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4CAF50" />
    </mesh>
  )
}

// Generate star positions - maximum 12 stars per tree
// Returns only fixed positions, never more than 12
// Two-row staggered layout: 8 stars in primary row, 4 stars in secondary row
// Primary row: 0.45 unit spacing, Y: 1.95-2.1, spread from -1.5 to 1.5
// Secondary row: positioned with 0.3+ spacing from primary stars, Y: 2.2-2.25
// Raised vertical position for better visibility on tree canopy
// Z-depth maintained at 1.4-1.5 for consistent front-facing position
function generateStarPositions(count) {
  const fixedPositions = [
    // Primary row - evenly spaced with 0.45 unit gaps, wider spread
    [-1.5, 2.05, 1.45],    // Star 1 - Far left, high
    [-1.05, 1.95, 1.4],    // Star 2 - Left, medium (0.45 spacing from Star 1)
    [-0.6, 2.1, 1.5],      // Star 3 - Left-center, high (0.45 spacing from Star 2)
    [-0.15, 2.0, 1.45],    // Star 4 - Center-left, medium (0.45 spacing from Star 3)
    [0.3, 2.05, 1.4],      // Star 5 - Center, high (0.45 spacing from Star 4)
    [0.75, 1.95, 1.5],     // Star 6 - Center-right, medium (0.45 spacing from Star 5)
    [1.2, 2.1, 1.45],      // Star 7 - Right, high (0.45 spacing from Star 6)
    [1.5, 2.0, 1.4],       // Star 8 - Far right, medium (0.3 spacing from Star 7)
    // Secondary row - positioned with maximum spacing from primary stars
    [-1.3, 2.25, 1.5],     // Star 9 - Far left, very high (0.2 spacing from Star 1, 0.25 from Star 2, 0.2 Y difference)
    [-0.4, 2.2, 1.4],      // Star 10 - Center-left, high (0.2 spacing from Star 3, 0.25 from Star 4, 0.2 Y difference)
    [0.5, 2.2, 1.5],       // Star 11 - Center-right, high (0.2 spacing from Star 5, 0.25 from Star 6, 0.25 Y difference)
    [1.3, 2.25, 1.45]      // Star 12 - Far right, very high (0.1 spacing from Star 7, 0.2 from Star 8, but 0.2 Y difference)
  ];

  // Ensure count never exceeds 12 (chunking should handle this, but enforce it here)
  const maxCount = Math.min(count, 12);
  return fixedPositions.slice(0, maxCount);
}

// Main component
export default function TreeModel({ 
  theme = 'morning',
  // Tree position: [x, y, z] - adjust these to move the tree
  // Default: [0, 0, 0] = centered at origin
  treePosition: initialTreePosition = [0, 0, 0],
  // Camera offset: [x_offset, y_offset, z_offset] - relative to tree position
  // This controls where the camera is positioned relative to the tree
  // Adjusted to shift view right (tree on left, right edge cropped) - matching 2nd picture
  // Camera positioned to the right (positive X) while maintaining same Y elevation
  cameraOffset = [2.5, 2.2, 7.5],
  // All featured highlights for this tree (no limit)
  chunkHighlights = [],
  // All featured highlights (needed for StarModal to find the correct highlight)
  allFeaturedHighlights = [],
  // Starting index of this chunk in allFeaturedHighlights (for StarModal to find correct highlight)
  chunkStartIndex = 0,
  // Callback when model is loaded
  onLoad = null
}) {
  // Load saved camera position from localStorage
  // Returns null if saved position matches old default (x ~= 0.5) to force reset
  const getSavedCameraPosition = () => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem('faithree_camera_position')
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        // If saved position is close to old default (x ~= 0.5), return null to use new default
        if (Math.abs(pos.x - 0.5) < 0.1) {
          return null
        }
        return pos
      } catch (e) {
        return null
      }
    }
    return null
  }

  // State to track current tree position (updates in real-time)
  const [treePosition, setTreePosition] = useState(initialTreePosition)

  // State for star modal
  const [selectedStarId, setSelectedStarId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // State to track if any star is hovered (for cursor change)
  const [isStarHovered, setIsStarHovered] = useState(false)
  // State to track if model is loaded
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  // State for hover preview overlay
  const [hoveredStarData, setHoveredStarData] = useState(null)
  const [hoveredStarScreenPos, setHoveredStarScreenPos] = useState(null)
  // Ref to store projection function
  const project3DTo2DRef = useRef(null)

  // Handle star click - starId is now the index in chunkHighlights array (1-based)
  const handleStarClick = useCallback((starId) => {
    // starId is 1-based index in the chunkHighlights array
    // Convert to global index for StarModal: chunkStartIndex + (starId - 1) + 1
    // The +1 at the end makes it 1-based for StarModal
    const globalStarId = chunkStartIndex + starId
    setSelectedStarId(globalStarId)
    setIsModalOpen(true)
  }, [chunkStartIndex])

  // Handle star hover - receives highlight data, 3D position, and mouse event
  const handleStarHover = useCallback((highlight, worldPosition, event) => {
    setIsStarHovered(true)
    
    // Try to use mouse position from native DOM event first (most accurate)
    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      // Use mouse position directly with small offset to position near cursor
      setHoveredStarScreenPos({
        x: event.clientX + 15, // 15px to the right of cursor
        y: event.clientY - 10   // 10px above cursor
      })
      setHoveredStarData(highlight)
    } else if (project3DTo2DRef.current && worldPosition) {
      // Fallback to 3D projection if mouse position not available
      const screenPos = project3DTo2DRef.current(worldPosition)
      if (screenPos) {
        // Add small offset to position overlay near the star (slightly above and to the right)
        setHoveredStarScreenPos({
          x: screenPos.x + 15, // 15px to the right of the star
          y: screenPos.y - 10  // 10px above the star (smaller offset for closer positioning)
        })
        setHoveredStarData(highlight)
      }
    }
  }, [])

  const handleStarHoverOut = useCallback(() => {
    setIsStarHovered(false)
    setHoveredStarData(null)
    setHoveredStarScreenPos(null)
  }, [])

  // Callback to receive projection function from CoordinateProjector
  const handleProjectFunction = useCallback((projectFn) => {
    project3DTo2DRef.current = projectFn
  }, [])

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    // Clear selected star after animation
    setTimeout(() => {
      setSelectedStarId(null)
    }, 300)
  }, [])

  // Select the appropriate GLB file based on theme
  const modelPath = theme === 'morning' 
    ? '/models/tree-sunny.glb' 
    : '/models/tree-cloudy.glb'

  // Preload both models for better performance
  useEffect(() => {
    useGLTF.preload('/models/tree-sunny.glb')
    useGLTF.preload('/models/tree-cloudy.glb')
  }, [])

  // Sync treePosition state with prop when it changes
  useEffect(() => {
    setTreePosition(initialTreePosition)
  }, [initialTreePosition])

  // Reset loading state when theme changes (Model component will remount with new key)
  useEffect(() => {
    setIsModelLoaded(false)
  }, [theme])

  // Handle model load callback - memoized to prevent unnecessary re-renders
  const handleModelLoadCallback = useCallback(() => {
    if (!isModelLoaded) {
      setIsModelLoaded(true)
    }
  }, [isModelLoaded])

  // Notify parent when model is fully loaded (including stars)
  useEffect(() => {
    if (isModelLoaded && onLoad) {
      // Additional delay to ensure everything is rendered (stars, etc.)
      // Increased delay to ensure tree is fully visible before hiding loading overlay
      const timer = setTimeout(() => {
        onLoad()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isModelLoaded, onLoad])

  // Calculate initial camera position - use saved position if available
  const savedCamPos = getSavedCameraPosition()
  const initialCameraPosition = savedCamPos
    ? [savedCamPos.x, savedCamPos.y, savedCamPos.z]
    : [
        treePosition[0] + cameraOffset[0],
        treePosition[1] + cameraOffset[1],
        treePosition[2] + cameraOffset[2]
      ]

  return (
    <>
      <div className={styles.treeModelContainer}>
        <Canvas
          camera={{ 
            position: initialCameraPosition, 
            fov: 66,
            rotation: [0, 0, 0]
          }}
          gl={{ antialias: true }}
          style={{ background: 'transparent', cursor: isStarHovered ? 'pointer' : 'default' }}
        >
          <Suspense fallback={<Loading />}>
            {/* Lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[0, 5, 5]} intensity={1.2} />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} />
            <pointLight position={[0, 2, 0]} intensity={0.3} />
            
            {/* Optional: Add environment for better lighting */}
            <Environment preset={theme === 'morning' ? 'sunset' : 'city'} />
            
            {/* The 3D model - pass treePosition and theme to position it and apply color changes */}
            {/* Key prop ensures component re-renders when model changes */}
            <Model 
              key={modelPath} 
              url={modelPath} 
              treePosition={treePosition} 
              theme={theme}
              onLoad={handleModelLoadCallback}
            />
            
            {/* Stars placed on the front of the tree leaves - positioned close to leaves like fruit */}
            {/* Maximum 12 stars per tree - additional stars appear on new trees */}
            {(() => {
              // Ensure we never render more than 12 stars (chunking should handle this)
              const maxStars = Math.min(chunkHighlights.length, 12);
              const highlightsToRender = chunkHighlights.slice(0, maxStars);
              
              // Generate positions for up to 12 stars
              const starPositions = generateStarPositions(maxStars);
              
              // Render stars for highlights (max 12)
              const starsToRender = highlightsToRender.map((highlight, index) => {
                const starId = index + 1; // 1-based index
                const position = starPositions[index];
                const impactLevel = highlight?.impact_level || 'average';
                
                return (
                  <Star 
                    key={starId}
                    position={position} 
                    treePosition={treePosition}
                    cameraOffset={cameraOffset}
                    starId={starId}
                    onStarClick={handleStarClick}
                    onHover={handleStarHover}
                    onHoverOut={handleStarHoverOut}
                    impactLevel={impactLevel}
                    highlight={highlight}
                  />
                );
              });
              
              return starsToRender;
            })()}
            
            {/* Static controls - tree stays fixed, no rotation */}
            <StaticControls 
              treePosition={treePosition} 
              cameraOffset={cameraOffset}
            />
            
            {/* Coordinate projector - handles 3D to 2D conversion */}
            <CoordinateProjector onProject={handleProjectFunction} />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Star Preview Overlay */}
      <StarPreviewOverlay
        highlight={hoveredStarData}
        position={hoveredStarScreenPos}
        isVisible={!!hoveredStarData && !!hoveredStarScreenPos}
      />
      
      {/* Star Modal */}
      <StarModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        starId={selectedStarId}
        featuredHighlights={allFeaturedHighlights}
      />
    </>
  )
}