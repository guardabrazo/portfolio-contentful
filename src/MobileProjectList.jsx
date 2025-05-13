import React from 'react';

// Simple styling for the list, can be expanded in App.css
const MobileProjectList = ({ projects }) => {
  if (!projects || projects.length === 0) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>No projects to display.</div>;
  }

  return (
    <div className="mobile-project-list">
      {projects.map(project => (
        <div key={project.sys.id} className="mobile-project-item">
          {project.fields.poster?.fields?.file?.url && (
            <img 
              src={project.fields.poster.fields.file.url} 
              alt={project.fields.title || 'Project image'} 
              className="mobile-project-image"
            />
          )}
          {project.fields.link ? (
            <a 
              href={project.fields.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mobile-project-title-link" // New class for styling if needed
            >
              <h3 className="mobile-project-title">{project.fields.title?.toUpperCase()}</h3>
            </a>
          ) : (
            <h3 className="mobile-project-title">{project.fields.title?.toUpperCase()}</h3>
          )}
          {project.fields.description && <p className="mobile-project-description">{project.fields.description}</p>}
          <div className="mobile-project-details">
            {project.fields.client && <p><strong>Client:</strong> {project.fields.client}</p>}
            {project.fields.year && <p><strong>Year:</strong> {project.fields.year}</p>}
          </div>
          {/* Removed separate View Project link */}
        </div>
      ))}
    </div>
  );
};

export default MobileProjectList;
