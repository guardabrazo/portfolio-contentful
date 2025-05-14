import React, { useRef } from 'react'; // Import useRef
import { CSSTransition } from 'react-transition-group'; // Import CSSTransition
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';

// Optional: Configure how different rich text elements are rendered
const options = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node, children) => <p className="info-modal-paragraph">{children}</p>,
    [BLOCKS.HEADING_1]: (node, children) => <h1 className="info-modal-h1">{children}</h1>,
    [BLOCKS.HEADING_2]: (node, children) => <h2 className="info-modal-h2">{children}</h2>,
    // Add more for other block types like UL, OL, QUOTE, etc. if needed
    // Example for hyperlinks:
    [INLINES.HYPERLINK]: (node, children) => (
      <a href={node.data.uri} target="_blank" rel="noopener noreferrer" className="info-modal-link">
        {children}
      </a>
    ),
  },
};

function InfoModal({ content, isOpen, onClose }) {
  const modalRef = useRef(null); // Ref for CSSTransition

  // Do not render anything if content is not available yet, even if isOpen is true
  if (!content) {
      return null;
  }

  return (
    <CSSTransition
      in={isOpen}
      timeout={300} // Duration of fade
      classNames="modal-fade" // CSS class prefix
      unmountOnExit
      nodeRef={modalRef}
    >
      <div className="info-modal-overlay" onClick={onClose} ref={modalRef}>
        <div className="info-modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
          {/* Text content area */}
          <div className="info-modal-text-content-area">
            {documentToReactComponents(content, options)}
          </div>
          {/* Close button positioned relative to text-content-area or content-wrapper */}
          <button onClick={onClose} className="info-modal-close-button" aria-label="Close info modal">
            &times;
          </button>
        </div>
      </div>
    </CSSTransition>
  );
}

export default InfoModal;
