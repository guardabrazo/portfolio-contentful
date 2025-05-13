import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { Billboard, Html, shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const RoundedRectMaterial = shaderMaterial(
  { map: null, radius: 0.15, smoothness: 0.01 },
  /*glsl*/`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  /*glsl*/`
    uniform sampler2D map;
    uniform float radius;
    uniform float smoothness;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      vec2 abs_uv = abs(uv);
      float dist = length(max(abs_uv - vec2(1.0 - radius), 0.0)) - radius;
      float alpha = 1.0 - smoothstep(-smoothness, 0.0, dist);
      vec4 texColor = texture2D(map, vUv);
      gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
    }
  `
);
extend({ RoundedRectMaterial });

// Accept index, onResumeCarousel, planeScale, and onPillHover props
function ProjectPlane({ project, position, index, onPlaneClick, onResumeCarousel, isFocused, planeScale = 1.0, onPillHover }) { // Default scale to 1
  const groupRef = useRef(); 
  const [hovered, setHovered] = useState(false);
  const isPointerOverHtmlRef = useRef(false); 
  const randomZRotation = useMemo(() => MathUtils.randFloatSpread(0.2), []);
  const videoRef = useRef(null); 
  const [texture, setTexture] = useState(null); 
  const posterImageUrl = project.fields.poster?.fields?.file?.url;
  const videoUrl = project.fields.video?.fields?.file?.url;

  useEffect(() => {
    let videoElement; let currentTexture; let onCanPlayHandler = null;
    if (videoUrl) {
      videoElement = document.createElement('video'); videoRef.current = videoElement; 
      videoElement.src = videoUrl; videoElement.crossOrigin = 'anonymous'; videoElement.loop = true; videoElement.muted = true; videoElement.playsInline = true;
      // Use 'loadedmetadata' event
      onCanPlayHandler = () => { 
        if (videoElement) { // Ensure videoElement still exists
          currentTexture = new THREE.VideoTexture(videoElement);
          // currentTexture.minFilter = THREE.LinearFilter; // Optional: improve quality
          // currentTexture.magFilter = THREE.LinearFilter; // Optional: improve quality
          // currentTexture.format = THREE.RGBFormat; // Optional: if alpha not needed
          
          setTexture(currentTexture); 
          
          // Ensure video is paused after texture creation
          videoElement.pause();

          // It might be beneficial to ensure the material updates after texture is set
          // This is often handled by R3F, but for VideoTexture, explicit update can sometimes help.
          // If groupRef.current and its material exist, you could try:
          // if (groupRef.current?.children[0]?.material) {
          //   groupRef.current.children[0].material.needsUpdate = true;
          // }
        }
      };
      videoElement.addEventListener('loadedmetadata', onCanPlayHandler); // Changed event
      videoElement.load(); // Start loading the video
    } else if (posterImageUrl) {
      currentTexture = new THREE.TextureLoader().load(posterImageUrl, (tex) => {
        // tex.minFilter = THREE.LinearFilter; // Optional
        // tex.magFilter = THREE.LinearFilter; // Optional
        setTexture(tex); 
      }, undefined, (err) => {
        console.error('Error loading image texture:', err, posterImageUrl);
      });
      setTexture(currentTexture); 
    }
    return () => {
      if (videoElement && onCanPlayHandler) { videoElement.removeEventListener('loadedmetadata', onCanPlayHandler); } // Changed event
      if (videoElement) { 
        videoElement.pause(); 
        videoElement.src = ''; // Release video resource
        videoElement.load(); // Abort any ongoing loading
        videoRef.current = null; 
      }
      if (currentTexture) { currentTexture.dispose(); }
      setTexture(null); 
    };
  }, [videoUrl, posterImageUrl]);

  useEffect(() => {
    if (videoRef.current && texture instanceof THREE.VideoTexture) {
      if (isFocused) { // Still play video if focused, though focusing mechanism will change
        videoRef.current.play().catch(e => console.error("Video play failed on focus:", e, videoUrl));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isFocused, texture, videoUrl]); 

  useFrame((state, delta) => {
    if (groupRef.current && texture) { 
      // Only apply hover scaling if the plane is NOT focused
      const targetHoverScale = !isFocused && hovered ? planeScale * 1.1 : planeScale; 
      groupRef.current.scale.x = MathUtils.lerp(groupRef.current.scale.x, targetHoverScale, delta * 5);
      groupRef.current.scale.y = MathUtils.lerp(groupRef.current.scale.y, targetHoverScale, delta * 5);
      groupRef.current.scale.z = MathUtils.lerp(groupRef.current.scale.z, targetHoverScale, delta * 5); 
      
      // Z-tilt animation remains
      const targetZRotation = isFocused ? 0 : randomZRotation; 
      groupRef.current.rotation.z = MathUtils.lerp(groupRef.current.rotation.z, targetZRotation, delta * 5);
    }
  });

  // if (isFocused) { // Log for focusing can be removed or kept if needed
  //   console.log(`ProjectPlane ${project.sys.id} IS FOCUSED.`);
  // }

  if (!texture) { return null; }

  const basePlaneSize = 4.5; // Match the geometry args

  return (
    <Billboard position={position}> 
      <group 
        ref={groupRef} 
        rotation-z={randomZRotation}
        // Apply the base scale from props here
        scale={[planeScale, planeScale, planeScale]} 
        onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
        onPointerOut={(event) => {
          event.stopPropagation();
          // Call onResumeCarousel when pointer leaves plane and HTML
          setTimeout(() => {
            if (!isPointerOverHtmlRef.current) { 
              setHovered(false); 
              if (onResumeCarousel) {
                onResumeCarousel(); 
              }
            }
          }, 0);
        }}
        onClick={(event) => { 
          event.stopPropagation(); 
          if (onPlaneClick) {
            onPlaneClick(index); // Pass index to the handler
          }
        }}
      >
        {/* Geometry size remains constant, scale is applied to the group */}
        <mesh name="front-plane">
          <planeGeometry args={[basePlaneSize, basePlaneSize]} /> 
          <roundedRectMaterial map={texture} radius={0.15} smoothness={0.01} transparent={true} toneMapped={false} />
        </mesh>
        {/* Position Html towards the bottom of the plane, ensuring it's visually on the plane. */}
        <Html position-y={0} position-z={0.05} center className="project-link-on-plane" style={{ display: (isFocused && project.fields.link) ? 'block' : 'none' }}>
          <div 
            onMouseEnter={() => { 
              isPointerOverHtmlRef.current = true; 
              setHovered(true); // Keep this for plane hover effects if any are still desired on pill hover
              if (onPillHover) onPillHover(true); 
            }}
            onMouseLeave={() => { 
              isPointerOverHtmlRef.current = false; 
              // setHovered(false) will be handled by the main group's onPointerOut
              if (onPillHover) onPillHover(false);
            }}
            style={{ pointerEvents: 'auto' }} 
          >
            {project.fields.link && (<a href={project.fields.link} target="_blank" rel="noopener noreferrer" style={{pointerEvents: 'auto'}}>Full Project</a>)}
          </div>
        </Html>
        {/* Debug angle display REMOVED */}
      </group>
    </Billboard>
  );
}
export default ProjectPlane;
