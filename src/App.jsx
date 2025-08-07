import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { client } from './contentfulClient';
import ProjectPlane from './ProjectPlane';
import ProjectFooter from './ProjectFooter';
import Header from './Header';
import MobileProjectList from './MobileProjectList';
import InfoModal from './InfoModal';
import * as THREE from 'three';
import './App.css';

// Function to generate random positions for projects
const generatePositions = (num, radius, minDistance) => {
  const positions = [];
  let attempts = 0;
  const maxAttempts = 500; // Prevent infinite loops

  while (positions.length < num && attempts < maxAttempts) {
    const x = (Math.random() - 0.5) * radius * 2;
    const y = (Math.random() - 0.5) * radius * 0.5; // Keep Y spread smaller
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
function ProjectScatter({ projects, onProjectClick, focusedProjectId }) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (projects.length > 0) {
      // Adjust radius and minDistance based on number of projects
      const radius = 5 + projects.length * 0.5;
      const minDistance = 4.5; // Min distance between centers
      setPositions(generatePositions(projects.length, radius, minDistance));
    }
  }, [projects]);

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
        />
      ))}
    </group>
  );
}


function App() {
  const [projects, setProjects] = useState([]);
  const [focusedProject, setFocusedProject] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null); // For camera focus
  const [isMobileView, setIsMobileView] = useState(false);
  const [aboutContent, setAboutContent] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const justFocusedRef = useRef(false);
  const controlsRef = useRef(); // Ref for OrbitControls

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
      })
      .catch(console.error);

    client.getEntries({ content_type: 'about', limit: 1 })
      .then((response) => {
        if (response.items.length > 0) {
          setAboutContent(response.items[0].fields.about);
        }
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

  const handleProjectClick = (clickedProject, position) => {
    setFocusedProject(clickedProject);
    // Set target for camera to move to (a bit behind the project)
    const newTargetPos = position.clone().add(new THREE.Vector3(0, 1, 5));
    setTargetPosition(newTargetPos);

    justFocusedRef.current = true;
    setTimeout(() => {
      justFocusedRef.current = false;
    }, 50);
  };

  const handleDeselect = () => {
    setFocusedProject(null);
    setTargetPosition(null); // Reset camera target
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

  // Camera animation logic
  const CameraController = ({ targetPosition }) => {
    useFrame((state) => {
      if (targetPosition) {
        state.camera.position.lerp(targetPosition, 0.05);
        if (controlsRef.current) {
          controlsRef.current.target.lerp(targetPosition.clone().sub(new THREE.Vector3(0, 1, 5)), 0.05);
        }
      }
    });
    return null;
  };

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
            <Canvas camera={{ position: [0, 2, 15], fov: 50 }}>
              <color attach="background" args={['#ffffff']} />
              <ambientLight intensity={1.0} />
              <pointLight position={[0, 10, 10]} intensity={0.5} />
              <Suspense fallback={null}>
                <OrbitControls
                  ref={controlsRef}
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  maxPolarAngle={Math.PI / 1.8} // Restrict vertical rotation
                  minPolarAngle={Math.PI / 3}
                />
                <CameraController targetPosition={targetPosition} />
                {displayableProjects.length > 0 && (
                  <ProjectScatter
                    projects={displayableProjects}
                    onProjectClick={handleProjectClick}
                    focusedProjectId={focusedProject?.sys?.id}
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
