import { useState } from "react";
import "./main.css";

import heroBg from "./assets/muse-landing.png";
import About from "./pages/about.jsx";
import KeyFeatures from "./keyfeatures.jsx";
import FAQ from "./pages/faq.jsx";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const go = (page) => (e) => {
    e.preventDefault();
    setCurrentPage(page);
  };

  return (
    <div className="app-shell">
      <nav className="site-nav">
        <div className="site-logo">MUSE</div>

        <ul className="site-nav-links">
          <li>
            <a href="#home" className={currentPage === "home" ? "active" : ""} onClick={go("home")}>
              HOME
            </a>
          </li>
          <li>
            <a href="#about" className={currentPage === "about" ? "active" : ""} onClick={go("about")}>
              ABOUT
            </a>
          </li>
          <li>
            <a href="#keyfeatures" className={currentPage === "keyfeatures" ? "active" : ""} onClick={go("keyfeatures")}>
              KEY FEATURES
            </a>
          </li>
          <li>
            <a href="#faq" className={currentPage === "faq" ? "active" : ""} onClick={go("faq")}>
              FAQ
            </a>
          </li>
        </ul>

        <div className="site-auth">
          <a href="#login">LOG IN</a>
          <a href="#signup" className="btn-outline-small">SIGN UP</a>
        </div>
      </nav>

      <main className="page-container">
        {currentPage === "home" && (
          <section className="muse-hero">
            <img src={heroBg} alt="MUSE fashion illustration" className="muse-background" />
            <div className="muse-hero-content">
              <p className="muse-tagline">FIND YOUR VIBE. OWN YOUR LOOK.</p>
            </div>
          </section>
        )}

        {currentPage === "about" && <About setCurrentPage={setCurrentPage} />}

        {currentPage === "keyfeatures" && <KeyFeatures setCurrentPage={setCurrentPage} />}

        {currentPage === "faq" && <FAQ setCurrentPage={setCurrentPage} />}
      </main>
    </div>
  );
}