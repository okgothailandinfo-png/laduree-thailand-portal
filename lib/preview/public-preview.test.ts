import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCanonicalHost,
  isPublicPreview,
  isPublicPreviewIndexingClosed,
} from "./public-preview";

describe("Sprint 34 — public preview helpers", () => {
  it("detects APP_ENV=preview only", () => {
    assert.equal(isPublicPreview("preview"), true);
    assert.equal(isPublicPreview("PREVIEW"), true);
    assert.equal(isPublicPreview("production"), false);
    assert.equal(isPublicPreview("staging"), false);
    assert.equal(isPublicPreview("development"), false);
    assert.equal(isPublicPreview(undefined), false);
  });

  it("keeps indexing closed in preview even if live is requested", () => {
    assert.equal(isPublicPreviewIndexingClosed("preview"), true);
    assert.equal(isPublicPreviewIndexingClosed("production"), false);
  });

  it("refuses localhost and Singapore hosts as Thailand canonical", () => {
    assert.equal(classifyCanonicalHost("localhost"), "localhost");
    assert.equal(classifyCanonicalHost("127.0.0.1"), "localhost");
    assert.equal(classifyCanonicalHost("laduree.sg"), "singapore");
    assert.equal(classifyCanonicalHost("www.laduree.sg"), "singapore");
    assert.equal(classifyCanonicalHost("example.com"), "ok");
  });
});
