import "./keyfeatures.css";
import cutesyImg from "./assets/cutesy.png";
import mlnImg from "./assets/mln.png";
import gothImg from "./assets/goth.png";
import chicImg from "./assets/chic.png";
import indieImg from "./assets/indie.png";

export default function KeyFeatures({ setCurrentPage }) {
  return (
    <div className="keyfeatures-page">
      <section className="hero">
        <h1>What's Your Aesthetic?</h1>
        <p>
          Select a style architecture that mirrors your identity.
          Your choice personalizes the interface, outfit curation,
          and recommendations.
        </p>
      </section>

      <section className="cards">
        <div
          className="card card-cutesy"
          style={{ backgroundImage: `url(${cutesyImg})` }}
        >
          <div className="card-overlay">
            <h2>Cutesy</h2>
            <p>Dreamy pastel pinks and whimsical vibes.</p>
          </div>
        </div>

        <div
          className="card card-goth"
          style={{ backgroundImage: `url(${gothImg})` }}
        >
          <div className="card-overlay">
            <h2>Goth</h2>
            <p>Dark contrasts and moody aesthetics.</p>
          </div>
        </div>

        <div
          className="card card-chic"
          style={{ backgroundImage: `url(${chicImg})` }}
        >
          <div className="card-overlay">
            <h2>Chic</h2>
            <p>Luxury tailoring and elegance.</p>
          </div>
        </div>

        <div
          className="card card-indie"
          style={{ backgroundImage: `url(${indieImg})` }}
        >
          <div className="card-overlay">
            <h2>Indie</h2>
            <p>Vintage warmth and artistic expression.</p>
          </div>
        </div>

        <div
          className="card card-minimalist"
          style={{ backgroundImage: `url(${mlnImg})` }}
        >
          <div className="card-overlay">
            <h2>Minimalist</h2>
            <p>Clean lines and monochrome palettes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}