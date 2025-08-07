import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
  const maxAttempts = 500; // Prevent infinite loops

  while (positions.length < num && attempts < maxAttempts) {
    const x = (Math.random() - 0.5) * radius * 2;
    const y = (Math.random() - 0.5) * radius * 1.5; // Keep Y spread smaller
    const z = (Math.random() - 0.5) * radius * 2;
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


// New component for scattered projects
function ProjectScatter({ projects, positions, onProjectClick, focusedProjectId, anyProjectFocused }) {
  return (
    <group>
      {positions.length > 0 && projects.map((project, index) => (
        <ProjectPlane
          key={project.sys.id}
          project={project}
          position={positions[index]}
          planeScale={1.0} // Keep scale uniform for now
          onPlaneClick={() => onProjectClick(project, positions[index])}
          isFocused={project.sys.id === focusedProjectId}
          anyProjectFocused={anyProjectFocused}
        />
      ))}
    </group>
  );
}


function App() {
  const [projects, setProjects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [focusedProject, setFocusedProject] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null); // For camera focus
  const [isMobileView, setIsMobileView] = useState(false);
  const [aboutContent, setAboutContent] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(true);
  const justFocusedRef = useRef(false);
  const controlsRef = useRef();
  const initialCameraPosition = new THREE.Vector3(0, 2, 25);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };
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
      if (event.keyCode === 27) {
        handleDeselect();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
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

  const handleProjectClick = (clickedProject, position) => {
    setIsOrbiting(false);
    setFocusedProject(clickedProject);
    setFocusPoint(position); // Set the focus point for the camera rig

    justFocusedRef.current = true;
    setTimeout(() => {
      justFocusedRef.current = false;
    }, 50);
  };

  const handleDeselect = () => {
    setFocusedProject(null);
    setFocusPoint(null); // Clear the focus point
    setIsOrbiting(true);
  };

  const handleAppContainerClick = (event) => {
    if (justFocusedRef.current) return;
    if (focusedProject && !isMobileView) {
      if (event.target.closest('.project-footer')) {
        return;
      }
      handleDeselect();
    }
  };

  const openInfoModal = () => setIsInfoModalOpen(true);
  const closeInfoModal = () => setIsInfoModalOpen(false);

  // This component will only manage the camera's FOV (zoom) and target.
  function CameraManager({ isFocused, focusPoint }) {
    useFrame((state) => {
      if (!controlsRef.current) return;

      // Animate FOV
      // To make the camera closer or further when focused, change the first value (e.g., 20 is closer than 35)
      const targetFov = isFocused ? 20 : 50;
      state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.05);
      state.camera.updateProjectionMatrix();

      // Animate controls target
      const target = isFocused ? focusPoint : new THREE.Vector3(0, 0, 0);
      controlsRef.current.target.lerp(target, 0.05);
    });
    return null;
  }


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
            <Canvas camera={{ position: initialCameraPosition, fov: 50 }}>
              <color attach="background" args={['#ffffff']} />
              <ambientLight intensity={1.0} />
              <pointLight position={[0, 10, 10]} intensity={0.5} />
              <Suspense fallback={null}>
                <OrbitControls
                  ref={controlsRef}
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
                <CameraManager
                  isFocused={!!focusedProject}
                  focusPoint={focusPoint}
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
