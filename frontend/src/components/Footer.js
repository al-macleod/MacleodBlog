import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>BuzzForge</h3>
          <p className="footer-tagline">The viral thought engine for random ideas and ranked articles.</p>
          <p className="footer-note">Publish fast. Rank by quality. Build reputation.</p>
        </div>
        
        <div className="footer-links">
          <h4>Explore</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/random">Random Thoughts</Link></li>
            <li><Link to="/tweets">Recent Thoughts</Link></li>
            <li><Link to="/library">Library</Link></li>
            <li><Link to="/search">Search</Link></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Create</h4>
          <ul>
            <li><Link to="/studio">Writing Studio</Link></li>
            <li><Link to="/random">Thought Composer</Link></li>
            <li><Link to="/library">Top Ranked Posts</Link></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Account</h4>
          <ul>
            <li><Link to="/account">Join / Login</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Community</h4>
          <ul>
            <li><a href="https://x.com" target="_blank" rel="noopener noreferrer">X / Twitter</a></li>
            <li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            <li><a href="mailto:hello@buzzforge.local">Contact</a></li>
          </ul>
        </div>
        
        <div className="footer-info">
          <p>&copy; {currentYear} BuzzForge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
