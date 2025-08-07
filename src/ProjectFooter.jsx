import React, { useState, useEffect, useRef } from 'react'; // Import useState, useEffect
import { CSSTransition } from 'react-transition-group'; // Import CSSTransition

// Added isVisible prop
function ProjectFooter({ projectDetails, isVisible }) { // Removed onResumeCarousel prop
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
        {/* Column 1: Title, Pill & Description */}
        <div className="footer-col1 footer-title-description-block">
          <div className="footer-title-pill-wrapper">
            {title && <h2 className="footer-title-text">{title}</h2>}
            {detailsForRender?.link && (
              <a 
                href={detailsForRender.link}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-project-pill transparent-pill"
              >
                FULL PROJECT
              </a>
            )}
          </div>
          {description && <p className="footer-description-text">{typeof description === 'string' ? description : 'Description not available.'}</p>}
        </div>
        {/* Column 2: Client & Year */}
        <div className="footer-col2 footer-client-year-block">
          {client && <p className="footer-client-text"><strong>Client:</strong> {client}</p>}
          {year && <p className="footer-year-text"><strong>Year:</strong> {year}</p>}
        </div>
        {/* Column 3 (View Full Project Link) removed */}
       
      </div>
    </CSSTransition>
  );
}

export default ProjectFooter;
