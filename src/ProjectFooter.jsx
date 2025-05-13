import React, { useState, useEffect, useRef } from 'react'; // Import useState, useEffect
import { CSSTransition } from 'react-transition-group'; // Import CSSTransition

// Added isVisible prop
function ProjectFooter({ projectDetails, isVisible }) { 
  const [detailsForRender, setDetailsForRender] = useState(projectDetails);
  const nodeRef = useRef(null); // Create the ref here

  useEffect(() => {
    // Update detailsForRender only when becoming visible or if details change while visible
    if (isVisible && projectDetails) {
      setDetailsForRender(projectDetails);
    }
    // If becoming not visible, detailsForRender will retain the last visible details for the fade-out
  }, [projectDetails, isVisible]);

  // Use detailsForRender for destructuring to ensure content stability during fade-out
  const { title, client, description, year } = detailsForRender || {}; 

  return (
    <CSSTransition
      in={isVisible && !!projectDetails}
      timeout={400}
      classNames="fade"
      unmountOnExit
      nodeRef={nodeRef}
    >
      <div className="project-footer" ref={nodeRef}>
        <div className="footer-left-block">
          {title && <h2 className="footer-title-text">{title}</h2>}
          {description && <p className="footer-description-text">{typeof description === 'string' ? description : 'Description not available.'}</p>}
        </div>
        <div className="footer-right-block">
          {client && <p className="footer-client-text"><strong>Client:</strong> {client}</p>}
          {year && <p className="footer-year-text"><strong>Year:</strong> {year}</p>}
        </div>
      </div>
    </CSSTransition>
  );
}

export default ProjectFooter;
