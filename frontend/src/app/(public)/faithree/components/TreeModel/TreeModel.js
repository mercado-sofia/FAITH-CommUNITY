'use client'

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import StarModal from '../StarModal/StarModal'
import styles from './TreeModel.module.css'

// Star component - creates a glowing star shape (static like fruit on tree)
function Star({ position, treePosition = [0, 0, 0], starId, onStarClick, onHover, onHoverOut }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  // Create star geometry
  const starShape = useMemo(() => {
    const shape = new THREE.Shape()
    const outerRadius = 0.13
    const innerRadius = 0.07
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
  }, [])

  const extrudeSettings = useMemo(() => ({
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.009,
    bevelSegments: 3
  }), [])
  
  // Calculate base position (static - no animation)
  const basePosition = useMemo(() => [
    treePosition[0] + position[0],
    treePosition[1] + position[1],
    treePosition[2] + position[2]
  ], [treePosition, position])

  const handleClick = (e) => {
    e.stopPropagation()
    if (onStarClick) {
      onStarClick(starId)
    }
  }

  const handlePointerOver = (e) => {
    e.stopPropagation()
    setHovered(true)
    if (onHover) {
      onHover()
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
      position={basePosition}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh 
        ref={meshRef}
        rotation={[0, 0, 0]}
      >
        <extrudeGeometry args={[starShape, extrudeSettings]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={hovered ? 1.2 : 0.5}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      {/* Add a point light to make the star glow - enhanced on hover */}
      <pointLight
        color="#FFD700"
        intensity={hovered ? 0.8 : 0.3}
        distance={hovered ? 3 : 2}
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

// Loading fallback
function Loading() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4CAF50" />
    </mesh>
  )
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
  // Chunk of featured highlights for this tree (max 12)
  chunkHighlights = [],
  // Offset for this chunk (0 for first tree, 12 for second, etc.)
  chunkOffset = 0,
  // All featured highlights (needed for StarModal to find the correct highlight)
  allFeaturedHighlights = [],
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

  // Handle star click - convert local starId (1-12) to global index
  const handleStarClick = useCallback((localStarId) => {
    // Convert local starId (1-12) to global index: chunkOffset + (localStarId - 1)
    // Then add 1 because StarModal expects starId (1-based index)
    const globalIndex = chunkOffset + (localStarId - 1)
    setSelectedStarId(globalIndex + 1)
    setIsModalOpen(true)
  }, [chunkOffset])

  // Handle star hover state for cursor change
  const handleStarHover = useCallback(() => {
    setIsStarHovered(true)
  }, [])

  const handleStarHoverOut = useCallback(() => {
    setIsStarHovered(false)
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
      const timer = setTimeout(() => {
        onLoad()
      }, 500)
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
            {/* Only render stars 1 to chunkHighlights.length (max 12 per tree) */}
            {/* Positions are relative to tree position, all in front (positive Z values) */}
            {/* Star positions array - indexed by starId - 1 (0-11) */}
            {(() => {
              const starPositions = [
                [-1.4, 2.0, 0.8],   // Star 1
                [0.8, 1.75, 0.8],    // Star 2
                [0.2, 1.8, 1.0],     // Star 3
                [-0.2, 2, 1.0],      // Star 4
                [-1.1, 1.7, 0.8],    // Star 5
                [0.6, 2.1, 0.8],     // Star 6
                [-0.5, 1.7, 0.9],    // Star 7
                [-0.7, 2.1, 0.85],   // Star 8
                [1.0, 1.9, 0.85],    // Star 9
                [-1.3, 1.9, 0.9],    // Star 10
                [0.4, 1.65, 0.9],    // Star 11
                [-0.9, 1.85, 0.95]   // Star 12
              ]
              
              // Render stars only for chunk highlights (1 to chunkHighlights.length, max 12 per tree)
              const starsToRender = starPositions.map((position, index) => {
                const localStarId = index + 1 // 1-12 (local to this tree)
                // Only render if there's a corresponding highlight in this chunk
                if (localStarId <= chunkHighlights.length) {
                  return (
                    <Star 
                      key={localStarId}
                      position={position} 
                      treePosition={treePosition}
                      starId={localStarId}
                      onStarClick={handleStarClick}
                      onHover={handleStarHover}
                      onHoverOut={handleStarHoverOut}
                    />
                  )
                }
                return null
              }).filter(Boolean); // Remove null entries
              
              return starsToRender;
            })()}
            
            {/* Static controls - tree stays fixed, no rotation */}
            <StaticControls 
              treePosition={treePosition} 
              cameraOffset={cameraOffset}
            />
          </Suspense>
        </Canvas>
      </div>
      
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