import { useState } from "react";
import "./fe.css";
import heroBg from "./assets/muse-landing.png";
import About from "./about";
import KeyFeatures from "./keyfeatures";

export default function App() {
  
  // ---> THIS IS THE 2ND PART! <---
  // It goes right here, inside the function, but before the "return"
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <>
      {currentPage === "home" && (
        <div className="muse-home">
          <img
            src={heroBg}
            alt="MUSE fashion illustration"
            className="muse-background"
          />

          <nav className="muse-nav">
            {/* The links from Part 1 are here */}
            <a href="#home" onClick={(e) => { e.preventDefault(); setCurrentPage("home"); }}>HOME</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); setCurrentPage("about"); }}>ABOUT</a>
            <a
  href="#keyfeatures"
  onClick={(e) => {
    e.preventDefault();
    setCurrentPage("keyfeatures");
  }}
>
  KEY FEATURES
</a>
            <a href="#">FAQ</a>
          </nav>

          <div className="muse-auth">
            <a href="#">LOG IN</a>
            <a href="#">SIGN UP</a>
          </div>

          <p className="muse-tagline">
            FIND YOUR VIBE. OWN YOUR LOOK.
          </p>
        </div>
      )}

      {currentPage === "about" && (
        <About setCurrentPage={setCurrentPage} /> 
      )}
      {currentPage === "keyfeatures" && (
  <KeyFeatures setCurrentPage={setCurrentPage} />
)}
    </>
  );
}
