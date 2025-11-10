'use client'

import { Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Cloud component - loads and displays a cloud GLB model with movement animation
function Cloud({ url, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], speed = 0.0005, delay = 0 }) {
  const { scene } = useGLTF(url)
  const cloudRef = useRef()
  const startTimeRef = useRef(null)
  
  // Clone the scene to avoid mutating the original
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    
    // Calculate bounding box to center the model
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Center the cloud
    cloned.position.set(
      -center.x,
      -center.y,
      -center.z
    )
    
    // Scale the cloud
    const maxDim = Math.max(size.x, size.y, size.z)
    const scaleFactor = scale / maxDim
    cloned.scale.set(scaleFactor, scaleFactor, scaleFactor)
    
    // Apply rotation
    cloned.rotation.set(rotation[0], rotation[1], rotation[2])
    
    return cloned
  }, [scene, scale, rotation])
  
  // Animate cloud movement (horizontal drift with different speeds and delays)
  useFrame((state, delta) => {
    if (cloudRef.current) {
      // Initialize start time on first frame
      if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.elapsedTime + delay
      }
      
      // Only start moving after delay
      if (state.clock.elapsedTime >= startTimeRef.current) {
        cloudRef.current.position.x += speed * delta * 60 // Scale by delta for consistent speed
        
        // Reset position when it goes too far to the right
        if (cloudRef.current.position.x > 20) {
          cloudRef.current.position.x = -20
          startTimeRef.current = state.clock.elapsedTime // Reset delay
        }
      }
    }
  })
  
  return (
    <group ref={cloudRef} position={position}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Loading fallback
function Loading() {
  return null
}

// CloudBackground component - renders clouds across full page width
export default function CloudBackground({ theme = 'morning' }) {
  // Preload cloud models
  useEffect(() => {
    useGLTF.preload('/models/clouds.glb')
    useGLTF.preload('/models/clouds 2.glb')
    useGLTF.preload('/models/cloud 3.glb')
  }, [])

  // Only show clouds in morning theme
  if (theme !== 'morning') {
    return null
  }

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: 1,
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      <Canvas
        camera={{ 
          position: [0, 0, 10], 
          fov: 75
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Suspense fallback={<Loading />}>
          {/* Lighting for clouds */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[0, 5, 5]} intensity={0.5} />
          
          {/* 3D Clouds - positioned to span full width */}
          <Cloud 
            url="/models/clouds.glb" 
            position={[-15, 3.5, -12]} 
            scale={2} 
            rotation={[0, 0, 0]}
            speed={0.0003}
            delay={0}
          />
          <Cloud 
            url="/models/clouds 2.glb" 
            position={[-18, 4.5, -10]} 
            scale={1.8} 
            rotation={[0, 0.2, 0]}
            speed={0.00025}
            delay={5}
          />
          <Cloud 
            url="/models/cloud 3.glb" 
            position={[-12, 4, -14]} 
            scale={1.5} 
            rotation={[0, -0.1, 0]}
            speed={0.0002}
            delay={10}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

