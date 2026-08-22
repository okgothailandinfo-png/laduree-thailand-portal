"use client";

import PendingNavControl from "../a11y/PendingNavControl";
import MobileViewCartButton from "../cart/MobileViewCartButton";
import { useConsent } from "../consent/ConsentContext";
import { uiChrome } from "@/lib/i18n/ui-chrome";

const FOOTER_SLIDES = [{ id: "footer-1" }, { id: "footer-2" }] as const;

export default function SiteFooter() {
  const { openSettings } = useConsent();

  return (
    <footer>
      <section className="block slider-block footer-slider-block" aria-hidden="true">
        <div className="container-fluid">
          <div className="slider footer-page-slider slick-initialized slick-slider">
            <div className="slick-list">
              <div className="slick-track">
                {FOOTER_SLIDES.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`slide${index === 0 ? " slick-current slick-active" : ""}`}
                  >
                    <img
                      src={
                        index === 0
                          ? "/footer-placeholder-desktop.svg"
                          : "/footer-placeholder-mobile.svg"
                      }
                      alt=""
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="footer">
        <div className="container-fluid">
          <ul className="list-inline footer-menu">
            <li>
              <PendingNavControl label="Allergen Information" />
            </li>
            <li>
              <button
                type="button"
                className="footer-cookie-settings"
                onClick={openSettings}
              >
                {uiChrome("cookieSettings")}
              </button>
            </li>
          </ul>
          <ul className="list-inline socials" />
          <p className="copy">
            <span className="copyrights-copy">©2026 Laduree Paris.</span>
          </p>
        </div>

        <div id="scroll-top" className="hidden" aria-hidden="true">
          <i className="fa fa-chevron-up" />
        </div>

        <div className="homepage-cart-button-display">
          <MobileViewCartButton />
        </div>
      </div>
    </footer>
  );
}
