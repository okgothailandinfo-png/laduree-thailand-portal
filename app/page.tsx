const steps = [
  {
    number: "1",
    title: "Select Boutique",
    description: "Choose the boutique where you would like to collect your order.",
  },
  {
    number: "2",
    title: "Choose Date & Time",
    description: "Pick a convenient collection window that suits your schedule.",
  },
  {
    number: "3",
    title: "Select Products",
    description: "Browse the menu and add your preferred items to the order.",
  },
  {
    number: "4",
    title: "Collect Your Order",
    description: "Arrive at your boutique and collect your order when ready.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-full flex-1 bg-page text-text">
      <header className="site-header">
        <div className="container-sg flex items-center justify-between py-4">
          <p className="brand-name text-base sm:text-lg">
            Ladurée Thailand (BKK 01)
          </p>
          <a href="#member" className="btn-login">
            Member?
          </a>
        </div>
      </header>

      <main>
        <section className="hero" aria-label="Ladurée Thailand">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 className="hero-title">Ladurée Thailand</h1>
              <p className="hero-kicker">Luxury French Pâtisserie</p>
              <p className="hero-subtitle">
                Order online and collect at your preferred boutique.
              </p>
              <div className="hero-actions">
                <a href="#how-it-works" className="btn-primary">
                  Order Pickup
                </a>
                <a href="#how-it-works" className="btn-secondary">
                  Browse Collection
                </a>
              </div>
            </div>
            <div
              className="hero-media"
              role="img"
              aria-label="Elegant Ladurée Thailand pâtisserie presentation"
            />
          </div>
        </section>

        <section className="border-b border-border bg-page">
          <div className="container-sg py-14 sm:py-20">
            <h1 className="text-3xl leading-tight tracking-tight text-text sm:text-4xl">
              BKK 01
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Address
              <br />
              #B1-256/9A
              <br />
              <br />
              Open Daily
              <br />
              10:00 – 21:30
              <br />
              <br />
              Last Order
              <br />
              21:00
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#how-it-works" className="btn-primary">
                Start Your Order
              </a>
              <a href="#track-order" className="btn-secondary">
                Track Order
              </a>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-page">
          <div className="container-sg py-12 sm:py-16">
            <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
              How it works
            </p>
            <h2 className="mt-2 text-2xl tracking-tight text-text sm:text-3xl">
              Four simple steps
            </h2>

            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <li key={step.number} className="card-surface p-5">
                  <p className="text-sm uppercase tracking-[0.16em] text-primary">
                    {step.number}
                  </p>
                  <h3 className="mt-3 text-lg text-text">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>

            <div
              id="track-order"
              className="card-surface mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                  Already ordered?
                </p>
                <p className="mt-2 text-base text-text">
                  Check your pickup status and collection details.
                </p>
              </div>
              <a href="#track-order" className="btn-checkout shrink-0">
                View Order Status
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer mt-auto">
        <div className="container-sg flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-bold text-announcement">
            © 2026 Laduree Paris. Powered by Getz
          </p>
          <a href="#allergen" className="text-base font-bold">
            Allergen Information
          </a>
        </div>
      </footer>
    </div>
  );
}
