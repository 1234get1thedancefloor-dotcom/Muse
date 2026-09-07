import React from 'react';
import './about.css';

const About = ({ setCurrentPage }) => {
  return (
    <div className="about-page">
      <section className="hero">
        <div className="hero-content">
          <p className="overline">☆ THE VISION BEHIND MUSE ☆</p>
          <h1>
            Style, Reimagined.<br />
            Elevated by <span className="gold-text">Intuitive<br />Intelligence.</span>
          </h1>
          <p className="hero-description">
            MUSE is your personal style companion, designed to help you discover your aesthetic, make the most of your wardrobe, and create looks that feel uniquely you — for every occasion.
          </p>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="card-header">
            <span className="card-overline">01 // IDENTITY</span>
            <span className="star">☆</span>
          </div>
          <h2>Your Style</h2>
          <p>Discover your aesthetic, define your vibe, and build a style identity that's uniquely yours.</p>
        </div>

        <div className="feature-card">
          <div className="card-header">
            <span className="card-overline">02 // UTILITY</span>
            <span className="star">☆</span>
          </div>
          <h2>Your Wardrobe</h2>
          <p>Digitize and organize the clothes you already own. Build a smart digital closet that unlocks outfit combinations you never knew you had.</p>
        </div>

        <div className="feature-card">
          <div className="card-header">
            <span className="card-overline">03 // CREATIVITY</span>
            <span className="star">☆</span>
          </div>
          <h2>Your Muse</h2>
          <p>Style together, stay connected. Add your friends and create coordinated looks for every moment you share.</p>
        </div>
      </section>

      <section className="cta">
        <p className="overline">☆ THE OUTRO ☆</p>
        <h2>
          Your closet. Your vibe. Your rules. <span className="gold-text">Let MUSE<br />style the possibilities.</span>
        </h2>
        <button className="btn-solid" onClick={() => setCurrentPage("keyfeatures")}>
          GET STARTED WITH MUSE
        </button>
      </section>
    </div>
  );
};

export default About;