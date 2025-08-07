import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { client } from './contentfulClient';
import ProjectPlane from './ProjectPlane';
import ProjectFooter from './ProjectFooter';
import Header from './Header';
import MobileProjectList from './MobileProjectList';
import InfoModal from './InfoModal';
import './App.css';

const generatePositions = (num, radius, minDistance) => {
  const positions = [];
  let attempts = 0;
  const maxAttempts = 1000; // Increased attempts for denser packing

  while (positions.length < num && attempts < maxAttempts) {
    // Generate a random point within a sphere for a more 3D cloud effect
    const theta = Math.acos((2 * Math.random()) - 1);
    const phi = Math.random() * 2 * Math.PI;
    const r = radius * Math.cbrt(Math.random()); // Cube root for uniform distribution

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    const newPos = new THREE.Vector3(x, y, z);

    let valid = true;
    for (const pos of positions) {
      if (newPos.distanceTo(pos) < minDistance) {
        valid = false;
        break;
      }
    }

    if (valid) {
      positions.push(newPos);
      attempts = 0; // Reset attempts on success
    } else {
      attempts++;
    }
  }
  return positions;
};

function ProjectScatter({ projects, positions, onProjectClick, focusedProjectId, anyProjectFocused }) {
  return (
    <group>
      {positions.length > 0 && projects.map((project, index) => (
        <ProjectPlane
          key={project.sys.id}
          project={project}
          position={positions[index]}
          planeScale={1.0}
          onPlaneClick={() => onProjectClick(project, positions[index])}
          isFocused={project.sys.id === focusedProjectId}
          anyProjectFocused={anyProjectFocused}
        />
      ))}
    </group>
  );
}

// This component manages the camera and controls.
function CameraController({ isFocused, focusPoint, isOrbiting }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    let targetFov = 50;
    if (isFocused) {
      const distance = camera.position.distanceTo(focusPoint);
      const planeSize = 4.5; // This is the base size of the plane geometry.
      // This is the value to tweak. A smaller value (e.g., 1.2) makes the plane appear larger.
      const desiredVisibleHeight = planeSize * 1.5; 
      targetFov = 2 * Math.atan(desiredVisibleHeight / (2 * distance)) * (180 / Math.PI);
    }
    
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05);
    camera.updateProjectionMatrix();

    // Animate the controls' target to center the selected project, or apply parallax effect.
    let targetPosition = new THREE.Vector3(0, 0, 0);
    if (isFocused) {
      targetPosition = focusPoint;
    } else {
      // Add parallax effect when not focused
      const parallaxFactor = 0.5; // Tweak this value for more/less effect
      targetPosition.x = state.mouse.x * parallaxFactor;
      targetPosition.y = state.mouse.y * parallaxFactor;
    }

    controlsRef.current.target.lerp(targetPosition, 0.05);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      camera={camera}
      enableZoom={false}
      enablePan={false}
      enableRotate={true}
      autoRotate={isOrbiting}
      autoRotateSpeed={0.5}
      maxPolarAngle={Math.PI / 1.8}
      minPolarAngle={Math.PI / 3}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
}

function App() {
  const [projects, setProjects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [focusedProject, setFocusedProject] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [aboutContent, setAboutContent] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(true);
  const justFocusedRef = useRef(false);
  const initialCameraPosition = new THREE.Vector3(0, 2, 25);

  useEffect(() => {
    const checkViewport = () => setIsMobileView(window.innerWidth < 768);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    client.getEntries({ content_type: 'project' })
      .then((response) => {
        const fetchedProjects = response.items;
        setProjects(fetchedProjects);
        const radius = 5 + fetchedProjects.length * 0.5;
        const minDistance = 4.5;
        setPositions(generatePositions(fetchedProjects.length, radius, minDistance));
      })
      .catch(console.error);

    client.getEntries({ content_type: 'about', limit: 1 })
      .then((response) => {
        if (response.items.length > 0) {
          setAboutContent(response.items[0].fields.about);
        }
      })
      .catch(console.error);

    const handleEsc = (event) => {
      if (event.keyCode === 27) handleDeselect();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const displayableProjects = projects.filter(
    (project) => project.fields.poster?.fields?.file?.url || project.fields.video?.fields?.file?.url
  );

  if (displayableProjects.length > 0) {
    displayableProjects.sort((a, b) => {
      const orderA = a.fields.displayOrder || 0;
      const orderB = b.fields.displayOrder || 0;
      return orderA - orderB;
    });
  }

  const handleProjectClick = (clickedProject, position) => {
    setIsOrbiting(false);
    setFocusedProject(clickedProject);
    setFocusPoint(position);
    justFocusedRef.current = true;
    setTimeout(() => { justFocusedRef.current = false; }, 50);
  };

  const handleDeselect = () => {
    setFocusedProject(null);
    setFocusPoint(null);
    setIsOrbiting(true);
  };

  const handleAppContainerClick = (event) => {
    if (justFocusedRef.current) return;
    if (focusedProject && !isMobileView) {
      if (event.target.closest('.project-footer')) return;
      handleDeselect();
    }
  };

  const openInfoModal = () => setIsInfoModalOpen(true);
  const closeInfoModal = () => setIsInfoModalOpen(false);

  return (
    <>
      <Header onInfoClick={openInfoModal} />
      <div
        className="app-container"
        style={{ width: '100vw', height: 'calc(100vh - 0px)', position: 'relative', overflowY: isMobileView ? 'auto' : 'hidden' }}
        onClick={handleAppContainerClick}
      >
        {isMobileView ? (
          <MobileProjectList projects={displayableProjects} />
        ) : (
          <>
            <Canvas camera={{ fov: 50, position: initialCameraPosition }} style={{ zIndex: 0 }}>
              <color attach="background" args={['#ffffff']} />
              <ambientLight intensity={1.0} />
              <pointLight position={[0, 10, 10]} intensity={0.5} />
              <Suspense fallback={null}>
                <CameraController
                  isFocused={!!focusedProject}
                  focusPoint={focusPoint}
                  isOrbiting={isOrbiting}
                />
                {displayableProjects.length > 0 && (
                  <ProjectScatter
                    projects={displayableProjects}
                    positions={positions}
                    onProjectClick={handleProjectClick}
                    focusedProjectId={focusedProject?.sys?.id}
                    anyProjectFocused={!!focusedProject}
                  />
                )}
              </Suspense>
            </Canvas>
            <ProjectFooter
              projectDetails={focusedProject?.fields}
              isVisible={!!focusedProject}
            />
          </>
        )}
        <InfoModal
          content={aboutContent}
          isOpen={isInfoModalOpen}
          onClose={closeInfoModal}
        />
      </div>
    </>
  );
}

export default App;
