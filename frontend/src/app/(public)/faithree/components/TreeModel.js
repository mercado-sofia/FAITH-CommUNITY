'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Component to load and display the GLB model
function Model({ url, treePosition = [0, 0, 0], theme = 'morning' }) {
  const { scene } = useGLTF(url)
  
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
  // Original working rotation was Math.PI * 0.25 (45°), adjusting for front-on view
  clonedScene.rotation.y = Math.PI * 0.25 // 45 degrees - original working angle
  
  return <primitive object={clonedScene} />
}

// Auto-return controls component
function AutoReturnControls({ 
  treePosition = [0, 0, 0], 
  cameraOffset = [2.5, 2.2, 7.5],
  onPositionChange 
}) {
  const controlsRef = useRef()
  const isInteractingRef = useRef(false)
  const returnTimeoutRef = useRef(null)
  const lastInteractionTimeRef = useRef(0)
  const initialPositionSetRef = useRef(false)

  useEffect(() => {
    let cleanup = null
    // Capture the current timeout ref value at the start of the effect
    const initialTimeoutId = returnTimeoutRef.current
    
    // Wait a bit for controls to be ready
    const timer = setTimeout(() => {
      const controls = controlsRef.current
      if (!controls || !controls.domElement) return

      // Load saved camera position from localStorage, or use default
      // Check if saved position matches old default (x ~= 0.5) and reset if so
      let idealPos
      const savedPosition = localStorage.getItem('faithree_camera_position')
      if (savedPosition) {
        try {
          const pos = JSON.parse(savedPosition)
          // If saved position is close to old default (x ~= 0.5), use new default instead
          if (Math.abs(pos.x - 0.5) < 0.1) {
            // Old saved position detected, use new default
            idealPos = new THREE.Vector3(
              treePosition[0] + cameraOffset[0],
              treePosition[1] + cameraOffset[1],
              treePosition[2] + cameraOffset[2]
            )
            // Update localStorage with new default
            localStorage.setItem('faithree_camera_position', JSON.stringify({
              x: idealPos.x,
              y: idealPos.y,
              z: idealPos.z
            }))
          } else {
            idealPos = new THREE.Vector3(pos.x, pos.y, pos.z)
          }
        } catch (e) {
          // If parsing fails, use default
          idealPos = new THREE.Vector3(
            treePosition[0] + cameraOffset[0],
            treePosition[1] + cameraOffset[1],
            treePosition[2] + cameraOffset[2]
          )
        }
      } else {
        // Use default position if no saved position
        idealPos = new THREE.Vector3(
          treePosition[0] + cameraOffset[0],
          treePosition[1] + cameraOffset[1],
          treePosition[2] + cameraOffset[2]
        )
      }
      
      controls.object.position.copy(idealPos)
      controls.target.copy(new THREE.Vector3(...treePosition))
      controls.update()
      initialPositionSetRef.current = true

      const handleStart = () => {
        isInteractingRef.current = true
        lastInteractionTimeRef.current = Date.now()
        if (returnTimeoutRef.current) {
          clearTimeout(returnTimeoutRef.current)
        }
      }

      const handleEnd = () => {
        lastInteractionTimeRef.current = Date.now()
        // Update position when interaction ends (after panning)
        if (controlsRef.current && onPositionChange) {
          const currentTarget = controlsRef.current.target
          onPositionChange([currentTarget.x, currentTarget.y, currentTarget.z])
        }
        
        // Save camera position to localStorage when user finishes rotating
        if (controlsRef.current) {
          const camera = controlsRef.current.object
          const savedPosition = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
          }
          localStorage.setItem('faithree_camera_position', JSON.stringify(savedPosition))
        }
        
        // Keep isInteracting as false so rotation stays where user left it
        isInteractingRef.current = false
      }

      // Add event listeners
      const domElement = controls.domElement
      domElement.addEventListener('mousedown', handleStart)
      domElement.addEventListener('mouseup', handleEnd)
      domElement.addEventListener('touchstart', handleStart)
      domElement.addEventListener('touchend', handleEnd)

      cleanup = () => {
        domElement.removeEventListener('mousedown', handleStart)
        domElement.removeEventListener('mouseup', handleEnd)
        domElement.removeEventListener('touchstart', handleStart)
        domElement.removeEventListener('touchend', handleEnd)
        // Capture the current timeout ref value to avoid stale closure
        const timeoutId = returnTimeoutRef.current
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (cleanup) cleanup()
      // Use the captured timeout ref value from the start of the effect
      if (initialTimeoutId) {
        clearTimeout(initialTimeoutId)
      }
    }
  }, [treePosition, cameraOffset, onPositionChange])

  useFrame(() => {
    if (!controlsRef.current) return

    const controls = controlsRef.current
    
    // Track the current target position (where the tree is)
    const currentTarget = controls.target
    const treeTarget = new THREE.Vector3(...treePosition)
    
    // Keep target fixed at tree position (prevents tree from moving)
    if (currentTarget.distanceTo(treeTarget) > 0.01) {
      currentTarget.copy(treeTarget)
    }
    
    // No auto-return - camera stays where user rotates it
    // The camera position will remain wherever the user rotates it to
    
    // Update controls
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={false}
      enableRotate={true}
      minDistance={8.5}
      maxDistance={8.5}
      autoRotate={false}
      target={treePosition}
      maxPolarAngle={Math.PI / 2.4}
      minPolarAngle={Math.PI / 2.4}
      enableDamping={true}
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
  cameraOffset = [2.5, 2.2, 7.5]
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
  const savedCamPos = getSavedCameraPosition()
  const initialCamPos = savedCamPos 
    ? [savedCamPos.x, savedCamPos.y, savedCamPos.z]
    : [
        initialTreePosition[0] + cameraOffset[0],
        initialTreePosition[1] + cameraOffset[1],
        initialTreePosition[2] + cameraOffset[2]
      ]
  const [cameraPosition, setCameraPosition] = useState(initialCamPos)

  // Select the appropriate GLB file based on theme
  const modelPath = theme === 'morning' 
    ? '/models/for website sunny.glb' 
    : '/models/for website cloudy.glb'

  // Preload both models for better performance
  useEffect(() => {
    useGLTF.preload('/models/for website sunny.glb')
    useGLTF.preload('/models/for website cloudy.glb')
  }, [])

  // Sync treePosition state with prop when it changes
  useEffect(() => {
    setTreePosition(initialTreePosition)
  }, [initialTreePosition])

  // Handle position changes from controls
  const handlePositionChange = useCallback((newPosition) => {
    setTreePosition(newPosition)
    // Update camera position based on new tree position
    setCameraPosition([
      newPosition[0] + cameraOffset[0],
      newPosition[1] + cameraOffset[1],
      newPosition[2] + cameraOffset[2]
    ])
  }, [cameraOffset])

  // Calculate initial camera position - use saved position if available
  const savedPos = getSavedCameraPosition()
  const initialCameraPosition = savedPos
    ? [savedPos.x, savedPos.y, savedPos.z]
    : [
        treePosition[0] + cameraOffset[0],
        treePosition[1] + cameraOffset[1],
        treePosition[2] + cameraOffset[2]
      ]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'visible' }}>
      <Canvas
        camera={{ 
          position: initialCameraPosition, 
          fov: 65,
          rotation: [0, 0, 0]
        }}
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
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
          <Model key={modelPath} url={modelPath} treePosition={treePosition} theme={theme} />
          
          {/* Controls with auto-return - pass treePosition and cameraOffset */}
          <AutoReturnControls 
            treePosition={treePosition} 
            cameraOffset={cameraOffset}
            onPositionChange={handlePositionChange}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

