import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("product detail sticky CTA layout", () => {
  it("keeps the sticky ADD bar clear of content and respects safe-area", () => {
    const css = readFileSync(
      path.join(process.cwd(), "app/product/product-detail.css"),
      "utf8",
    );
    assert.match(
      css,
      /\.product-detail-page \.modal-body\s*\{[^}]*safe-area-inset-bottom/s,
    );
    assert.match(
      css,
      /\.modal-footer\.product-detail-footer\.v2\s*\{[^}]*position:\s*fixed/s,
    );
    assert.match(
      css,
      /\.modal-footer\.product-detail-footer\.v2\s*\{[^}]*safe-area-inset-bottom/s,
    );
  });
});

describe("cart footer remains visible with multiple lines", () => {
  it("keeps drawer footer pinned outside the scroll body", () => {
    const css = readFileSync(path.join(process.cwd(), "app/cart/cart.css"), "utf8");
    assert.match(css, /\.cart-drawer-footer\s*\{[^}]*flex:\s*0 0 auto/s);
    assert.match(css, /\.cart-drawer-body\s*\{[^}]*overflow-y:\s*auto/s);
  });
});
