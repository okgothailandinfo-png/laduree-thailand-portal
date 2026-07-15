"use client";

import Link from "next/link";
import { useState } from "react";
import { SAMPLE_PRODUCT } from "../sample-product";
import "../product-detail.css";

function clampQty(value: number) {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 999) return 999;
  return value;
}

export default function ProductDetailClient({ slug }: { slug: string }) {
  const product = SAMPLE_PRODUCT;
  const [activeImage, setActiveImage] = useState(0);
  const [productQty, setProductQty] = useState(1);
  const [modifierQty, setModifierQty] = useState<Record<string, number>>({});
  const [radioSelection, setRadioSelection] = useState<Record<string, string>>(
    {},
  );
  const [remark, setRemark] = useState("");

  const title = product.title;

  function changeModifierQty(key: string, delta: number) {
    setModifierQty((current) => {
      const next = clampQty((current[key] ?? 0) + delta);
      return { ...current, [key]: next };
    });
  }

  return (
    <div className="product-detail-page modal-product-detail">
      <div className="modal-header header-title">
        <div className="header-title__product-contaner">
          <Link
            href="/"
            className="close-left"
            aria-label="Close"
            title="Close"
          >
            <i className="fa fa-arrow-left" aria-hidden="true" />
          </Link>

          <div className="header-title__product">
            <h4 className="header-title__product-title">{title}</h4>
          </div>

          <Link
            href="/"
            className="close padding-right-10 desktop-close"
            aria-label="Close"
            title="Close"
          >
            <span aria-hidden="true" className="close-icon" />
          </Link>
        </div>
      </div>

      <div className="modal-body">
        <div className="row bodyproductdetail product-body-detail">
          <div className="col-md-12 box-product-detail">
            <div className="row product-detail-panels">
              <div className="col-md-6 col-sm-12 col-xs-12 smoov-product-detail-left-panel">
                <div className="slider product-detail-img_slider">
                  <div className="slick-list">
                    <div
                      className="slick-track"
                      style={{
                        transform: `translate3d(-${activeImage * 100}%, 0, 0)`,
                      }}
                    >
                      {Array.from({ length: product.imageCount }).map(
                        (_, index) => (
                          <div
                            key={`pdp-img-${index}`}
                            className={`slide${index === activeImage ? " slick-current slick-active" : ""}`}
                          >
                            <button
                              type="button"
                              className="product-detail-image-button"
                              onClick={() => setActiveImage(index)}
                              aria-label={`Product image ${index + 1}`}
                            >
                              <img
                                className="img-product-detail img-responsive"
                                src="/product-placeholder.svg"
                                alt=""
                              />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                  <ul className="slick-dots" role="tablist">
                    {Array.from({ length: product.imageCount }).map(
                      (_, index) => (
                        <li
                          key={`pdp-dot-${index}`}
                          className={
                            index === activeImage ? "slick-active" : ""
                          }
                          role="presentation"
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={index === activeImage}
                            aria-label={`Product image ${index + 1}`}
                            onClick={() => setActiveImage(index)}
                          >
                            {index + 1}
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>

              <div className="col-md-6 col-sm-12 col-xs-12 smoov-product-detail-right-panel">
                <div className="product-detail-text-right">
                  <span className="cls_from">from</span>
                  <span>฿ —</span>
                </div>

                <div className="product-detail-content">
                  <div className="form-group">
                    <div className="item-pricing">
                      <div className="inner">
                        <div className="item-row">
                          <div className="alert alert-info" role="alert">
                            Price displayed are inclusive of taxes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div id="description-render">
                    <p>{product.description[0]}</p>
                    <hr />
                    <p>{product.description[1]}</p>
                    <p>
                      <strong>{product.storageLabel}</strong>
                      <br />
                      {product.storageText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div id="box-variant-and-modifier" className="row">
              <div className="col-md-12">
                <div
                  className="product-variant-and-modifiers"
                  id="product-variant-and-modifiers"
                >
                  <div className="row product-modifier-list-remark">
                    {product.modifierGroups.map((group) => (
                      <div
                        key={group.id}
                        className="col-xs-12 full-mobile fd-modifiergroup-body fd-productdetailpopup"
                      >
                        <div className="form-group">
                          <div className="row lg-modifiergroup-header lg-productdetailpopup">
                            <div className="col-xs-10 remove-padding-right">
                              <strong>{group.title}</strong>
                            </div>
                          </div>

                          {group.requiredText ? (
                            <div className="margin-top-5">
                              <small className="danger_message danger_red_message text-muted danger-message-custom required-modi">
                                {group.requiredText}
                              </small>
                            </div>
                          ) : null}

                          <table className="table-product-detail">
                            <tbody>
                              {group.options.map((option) => {
                                const optionKey = `${group.id}:${option}`;
                                return (
                                  <tr key={optionKey}>
                                    <td className="modifier-title">
                                      <div className="title-line-height">
                                        {option}
                                      </div>
                                    </td>
                                    <td className="modifier-price text-left">
                                      <span className="title-line-height">
                                        ฿ —
                                      </span>
                                    </td>
                                    <td className="modifier-quantity-input-group text-right theme-radio-color">
                                      {group.type === "radio" ? (
                                        <div className="radio">
                                          <input
                                            type="radio"
                                            name={group.id}
                                            checked={
                                              radioSelection[group.id] ===
                                              option
                                            }
                                            onChange={() =>
                                              setRadioSelection((current) => ({
                                                ...current,
                                                [group.id]: option,
                                              }))
                                            }
                                            aria-label={option}
                                          />
                                        </div>
                                      ) : (
                                        <div className="input-group">
                                          <span className="input-group-btn">
                                            <button
                                              className="btn minus button-input-group"
                                              type="button"
                                              aria-label={`Decrease ${option}`}
                                              onClick={() =>
                                                changeModifierQty(optionKey, -1)
                                              }
                                            >
                                              <i
                                                className="fa fa-minus"
                                                aria-hidden="true"
                                              />
                                            </button>
                                          </span>
                                          <input
                                            type="text"
                                            className="text-center quantity-input-text modifier-input"
                                            value={String(
                                              modifierQty[optionKey] ?? 0,
                                            )}
                                            readOnly
                                            aria-label={`${option} quantity`}
                                          />
                                          <span className="input-group-btn">
                                            <button
                                              className="btn plus button-input-group"
                                              type="button"
                                              aria-label={`Increase ${option}`}
                                              onClick={() =>
                                                changeModifierQty(optionKey, 1)
                                              }
                                            >
                                              <i
                                                className="fa fa-plus"
                                                aria-hidden="true"
                                              />
                                            </button>
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    <div className="col-xs-12">
                      <textarea
                        className="form-control"
                        id="VariantRemark"
                        rows={3}
                        maxLength={200}
                        placeholder="Additional Request/ Recipient Information"
                        value={remark}
                        onChange={(event) => setRemark(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer product-detail-footer v2">
        <div className="footer-actions">
          <div className="product-total-quantity">
            <div className="product-quantity-box">
              <div className="input-group product-quantity-input-group">
                <span className="input-group-btn">
                  <button
                    className="btn minus quantity-input-group"
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() =>
                      setProductQty((current) =>
                        Math.max(1, clampQty(current - 1)),
                      )
                    }
                  >
                    <i className="fa fa-minus" aria-hidden="true" />
                  </button>
                </span>
                <input
                  type="text"
                  size={9}
                  maxLength={3}
                  min={0}
                  value={String(productQty)}
                  className="form-control text-center quantity-input-text quantity-input-group"
                  id="product-quantity"
                  readOnly
                  aria-label="Product quantity"
                />
                <span className="input-group-btn">
                  <button
                    className="btn plus quantity-input-group"
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() =>
                      setProductQty((current) => clampQty(current + 1))
                    }
                  >
                    <i className="fa fa-plus" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="product-total-price">
            <div className="input-group">
              <div className="input-group-btn text-right">
                <button id="btn-AddToCart" className="btn" type="button">
                  ADD
                  <span>
                    -<span id="totalPriceOfProduct"> ฿ —</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keep slug referenced for future catalog wiring without homepage changes */}
      <span className="sr-only" data-product-slug={slug}>
        {slug}
      </span>
    </div>
  );
}
