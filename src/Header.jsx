import React from 'react';
import './Header.css'; // We'll create this CSS file next for styling

function Header({ onInfoClick }) { // Added onInfoClick prop
  return (
    <header className="app-header">
      <div className="header-name">GUARDABRAZO</div>
      <nav className="header-nav">
        {/* Replaced About/Contact with Info button, removed pill class */}
        <button onClick={onInfoClick} className="header-info-button header-pill-link">Info</button>
      </nav>
    </header>
  );
}

export default Header;
