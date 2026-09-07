import "./keyfeatures.css";

export default function KeyFeatures({ setCurrentPage }) {
  return (
    <div className="keyfeatures-page">

      <section className="hero">
        <span className="subheading">
          INTERACTIVE ONBOARDING
        </span>

        <h1>What's Your Aesthetic?</h1>

        <p>
          Select a style architecture that mirrors your identity.
          Your choice personalizes the interface, outfit curation,
          and recommendations.
        </p>
      </section>

      <section className="cards">

        <div className="card">
          <h2>Cutesy</h2>
          <p>Dreamy pastel pinks and whimsical vibes.</p>
        </div>

        <div className="card">
          <h2>Goth</h2>
          <p>Dark contrasts and moody aesthetics.</p>
        </div>

        <div className="card">
          <h2>Chic</h2>
          <p>Luxury tailoring and elegance.</p>
        </div>

        <div className="card">
          <h2>Indie</h2>
          <p>Vintage warmth and artistic expression.</p>
        </div>

        <div className="card">
          <h2>Minimalist</h2>
          <p>Clean lines and monochrome palettes.</p>
        </div>

      </section>

    </div>
  );
}
