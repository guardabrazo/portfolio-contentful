import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { client } from './contentfulClient';
import ProjectPlane from './ProjectPlane';
import ProjectFooter from './ProjectFooter';
import Header from './Header';
import MobileProjectList from './MobileProjectList'; // Import MobileProjectList
import * as THREE from 'three';
import { Vector3 } from 'three'; // Import Vector3
import './App.css';

// Component for subtle camera movement based on mouse
function CameraRig({ children, isPillHovered }) { // Added isPillHovered prop
  const vec = new Vector3();
  useFrame((state) => {
    if (isPillHovered) { // If pill is hovered, don't move camera
      return;
    }
    // Lerp camera position based on normalized mouse coords (-1 to 1)
    // Only move vertically
    const targetX = 0; // Keep X fixed
    const targetY = 2 + state.pointer.y * 1.2; // Keep Y movement sensitivity
    
    state.camera.position.lerp(vec.set(targetX, targetY, state.camera.position.z), 0.05); // Keep lerp factor for smoothness
    state.camera.lookAt(0, 0, 0); // Ensure camera always looks at the center
  });
  return children;
}


// Added targetRotation, isAnimatingToTarget, handleAnimationComplete props
function ProjectCarousel({ 
  projects, 
  isRotating, 
  onProjectClick, 
  radius, 
  focusedProjectId, 
  targetRotation, 
  isAnimatingToTarget, 
  handleAnimationComplete,
  onResumeCarousel, // Add onResumeCarousel to props destructuring
  onPillHover // Add onPillHover prop
}) { 
  const groupRef = useRef();
  const numProjects = projects.length;
  const basePlaneSize = 4.5; // Original size used in ProjectPlane geometry
  let planeScale = 1.0; // Default scale

  if (numProjects > 3) { // Only scale if more than 3 projects to avoid excessive scaling
    // Calculate scale to prevent overlap based on radius and number of projects
    const angleStep = (Math.PI * 2) / numProjects;
    // Calculate max width based on chord length between planes, with a small gap (e.g., 90% of chord)
    const maxPlaneWidth = 0.9 * (2 * radius * Math.sin(angleStep / 2));
    // Calculate the scale factor relative to the base size
    const calculatedScale = maxPlaneWidth / basePlaneSize;
    // Clamp the scale to reasonable limits (e.g., min 0.5, max 1.0)
    planeScale = Math.max(0.5, Math.min(1.0, calculatedScale)); 
  }


  useFrame((state, delta) => {
    if (groupRef.current && numProjects > 0) {
      const currentY = groupRef.current.rotation.y;

      if (isAnimatingToTarget && targetRotation !== null) {
        // Calculate shortest path for rotation
        let deltaY = targetRotation - currentY;
        // Normalize the angle difference to [-PI, PI]
        while (deltaY > Math.PI) deltaY -= Math.PI * 2;
        while (deltaY < -Math.PI) deltaY += Math.PI * 2;
        
        const lerpTargetY = currentY + deltaY;
        
        groupRef.current.rotation.y = THREE.MathUtils.lerp(currentY, lerpTargetY, delta * 5); // Adjust speed (5) if needed

        // Check if animation is close enough using deltaY
        if (Math.abs(deltaY) < 0.01) { 
          // Normalize the target rotation to [-PI, PI] before snapping
          let normalizedTarget = targetRotation;
          while (normalizedTarget > Math.PI) normalizedTarget -= Math.PI * 2;
          while (normalizedTarget < -Math.PI) normalizedTarget += Math.PI * 2;

          groupRef.current.rotation.y = normalizedTarget; // Snap to NORMALIZED final rotation
          handleAnimationComplete(); // Notify App component
        }
      } else if (isRotating) {
        groupRef.current.rotation.y += delta * 0.5; 
      }
      // Normalize continuous rotation to prevent overflow
      groupRef.current.rotation.y %= (Math.PI * 2); 
    }
  });

  return (
    <group ref={groupRef}>
      {projects.map((project, index) => {
        const angle = (index / numProjects) * Math.PI * 2; 
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        return (
          <ProjectPlane
            key={project.sys.id}
            project={project}
            index={index} // Pass index
            position={new THREE.Vector3(x, 0, z)}
            planeScale={planeScale} // Pass calculated scale
            // Pass index along with project
            onPlaneClick={(idx) => onProjectClick(project, idx)} 
            onResumeCarousel={onResumeCarousel} // Pass down onResumeCarousel
            isFocused={project.sys.id === focusedProjectId}
            onPillHover={onPillHover} // Pass down onPillHover
          />
        );
      })}
    </group>
  );
}

function App() {
  const [projects, setProjects] = useState([]);
  const [isRotating, setIsRotating] = useState(true); 
  const [focusedProject, setFocusedProject] = useState(null); 
  const [targetRotation, setTargetRotation] = useState(null); // State for target angle
  const [isAnimatingToTarget, setIsAnimatingToTarget] = useState(false); // State for animation status
  const [isPillHovered, setIsPillHovered] = useState(false); // State for pill hover
  const [isMobileView, setIsMobileView] = useState(false); // Default to desktop view initially
  const CAROUSEL_RADIUS = 3.5; 

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkViewport(); // Check on initial mount
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    client.getEntries({ content_type: 'project' })
      .then((response) => {
        const fetchedProjects = response.items;
        setProjects(fetchedProjects); 
      })
      .catch(console.error);
  }, []);

  const displayableProjects = projects.filter(
    (project) =>
      project.fields.poster?.fields?.file?.url || 
      project.fields.video?.fields?.file?.url 
  );

  if (displayableProjects.length > 0) {
    displayableProjects.sort((a, b) => {
      const orderA = a.fields.displayOrder || 0; 
      const orderB = b.fields.displayOrder || 0;
      return orderA - orderB;
    });
  }
  
  // Updated handler to accept index and calculate target rotation
  const handleProjectClick = (clickedProjectObject, index) => { 
    if (isAnimatingToTarget) return; // Prevent clicks during animation

    const numProjects = displayableProjects.length;
    if (numProjects === 0) return;

    const initialAngle = (index / numProjects) * Math.PI * 2;
    // Target angle based on user feedback: Base rotation for item 0 (-PI/2) + offset for the clicked item's initial angle.
    const targetY = (-Math.PI / 2) + initialAngle; 

    // Let useFrame handle shortest path via lerp.
    setTargetRotation(targetY); // Store the raw calculated target angle
    setIsAnimatingToTarget(true); // Start the animation
    setIsRotating(false); // Stop continuous rotation
    setFocusedProject(clickedProjectObject); // Set focused project (info shown in footer)
  };

  // Handler for when the animation completes
  const handleAnimationComplete = () => {
    setIsAnimatingToTarget(false);
    // Keep focusedProject set, rotation is now stopped at the target.
    // setTargetRotation(null); // Keep targetRotation so useFrame doesn't jump
  };

  // Resume rotation (e.g., if clicking background or a button)
  // Resume rotation when focus is lost, even during animation
  const handleResumeCarousel = () => {
    if (isMobileView) return; // No carousel to resume on mobile
    setIsRotating(true); 
    setFocusedProject(null); 
    setIsAnimatingToTarget(false); // Explicitly stop target animation
    // targetRotation can be left as is or set to null, useFrame will take over with isRotating=true
  };

  // MobileProjectList is now imported

  return (
    <>
      <Header /> 
      <div className="app-container" style={{ width: '100vw', height: 'calc(100vh - 0px)', /* Adjust if header has fixed height */ position: 'relative', overflowY: isMobileView ? 'auto' : 'hidden' }}>
        {isMobileView ? (
          <MobileProjectList projects={displayableProjects} />
        ) : (
          <>
            <Canvas camera={{ position: [0, 2, 12], fov: 50 }}> 
              <color attach="background" args={['#ffffff']} />
              <ambientLight intensity={1.0} /> 
              <pointLight position={[0, 10, 10]} intensity={0.5} />
              <Suspense fallback={null}>
            <CameraRig isPillHovered={isPillHovered}> 
              <group position-y={0.25}> {/* Adjust this Y value to move carousel up/down */}
                {displayableProjects.length > 0 && ( 
                  <ProjectCarousel 
                    projects={displayableProjects} 
                    isRotating={isRotating}
                      onProjectClick={handleProjectClick} 
                      onResumeCarousel={handleResumeCarousel} 
                      onPillHover={setIsPillHovered} 
                      radius={CAROUSEL_RADIUS} 
                      focusedProjectId={focusedProject?.sys?.id} 
                      targetRotation={targetRotation} 
                      isAnimatingToTarget={isAnimatingToTarget} 
                    handleAnimationComplete={handleAnimationComplete} 
                  />
                )}
              </group>
            </CameraRig>
              </Suspense>
            </Canvas>
            <ProjectFooter 
              projectDetails={focusedProject?.fields} 
              isVisible={!!focusedProject} 
            /> 
          </>
        )}
      </div>
    </>
  );
}

export default App;
