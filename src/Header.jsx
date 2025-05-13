import React from 'react';
import './Header.css'; // We'll create this CSS file next for styling

function Header() {
  return (
    <header className="app-header">
      <div className="header-name">GUARDABRAZO</div>
      <nav className="header-nav">
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}

export default Header;
