import "./faq.css";

const faqs = [
  {
    q: "How does MUSE determine my style identity?",
    a: "MUSE uses AI to analyze your preferences, favorite outfits, and aesthetic inspirations. Through a personalized style quiz and ongoing learning from your choices, it builds a unique style profile that evolves with you.",
  },
  {
    q: "Can I digitize my entire wardrobe?",
    a: "Yes! Simply photograph your clothing items and MUSE will categorize, tag, and organize them into your digital closet. Our AI recognizes garment types, colors, patterns, and styles to help you discover outfit combinations you never knew you had.",
  },
  {
    q: "How do I share looks and coordinate with friends?",
    a: "MUSE makes it easy to share outfit ideas with friends, coordinate group looks for events, and get feedback on your style choices. Create shared boards, vote on outfit options, and plan coordinated aesthetics for any occasion.",
  },
  {
    q: "Is my wardrobe data private and secure?",
    a: "Absolutely. Your wardrobe images, personal data, and style preferences are protected with end-to-end encryption. We never share your data with third parties, and you have full control over your privacy settings at all times.",
  },
];

export default function FAQ({ setCurrentPage }) {
  return (
    <div className="faq-page">
      <section className="faq-hero">
        <span className="subheading">☆ FAQ ☆</span>
        <h1>Frequently Asked Questions</h1>
        <p>
          Everything you need to know about tailoring your digital closet
          and defining your style identity with MUSE.
        </p>
      </section>

      <section className="faq-list">
        {faqs.map((item, i) => (
          <div className="faq-item" key={i}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </section>

      <section className="faq-footer">
        <span className="subheading">☆ STILL HAVE QUESTIONS? ☆</span>
        <h2>
          Can't find what you're looking for? <span className="gold-text">Get in touch.</span>
        </h2>
        <button className="btn-solid">CONTACT SUPPORT</button>
      </section>
    </div>
  );
}