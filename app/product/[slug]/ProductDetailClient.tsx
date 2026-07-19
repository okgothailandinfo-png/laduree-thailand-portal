"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CatalogStatus from "../../catalog/CatalogStatus";
import { useAsyncResource } from "../../catalog/useAsyncResource";
import { useCart } from "../../cart/CartContext";
import {
  fetchProductBySlug,
  formatPriceThb,
} from "@/lib/api/catalog";
import type { ProductModifierGroup } from "@/lib/api/types";
import {
  formatExactSelectionIncompleteMessage,
  formatExactSelectionMaximumMessage,
  formatExactSelectionProgress,
  getExactSelectionGroups,
  isExactSelectionGroup,
  sumExactSelectionFromQtyMap,
} from "@/lib/product/exact-selection";
import {
  computeConfiguredUnitPriceMinor,
  formatOptionPriceLabel,
  getOptionPriceMinor,
} from "@/lib/product/modifier-pricing";
import {
  areRequiredModifierGroupsComplete,
  formatOptionalHint,
  getMaxSelection,
  isRequiredModifierGroup,
  validateRequiredModifierGroups,
} from "@/lib/product/modifier-requirements";
import "../product-detail.css";

function clampQty(value: number) {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 999) return 999;
  return value;
}

function buildModifiersFromSelection(
  groups: ProductModifierGroup[],
  radioSelection: Record<string, string>,
  modifierQty: Record<string, number>,
): { label: string; quantity?: number }[] {
  const modifiers: { label: string; quantity?: number }[] = [];
  for (const group of groups) {
    if (group.isActive === false) continue;
    if (group.type === "radio") {
      const selected = radioSelection[group.id];
      if (selected) modifiers.push({ label: selected });
      continue;
    }
    for (const option of group.options) {
      const quantity = modifierQty[`${group.id}:${option}`] ?? 0;
      if (quantity > 0) modifiers.push({ label: option, quantity });
    }
  }
  return modifiers;
}

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [productQty, setProductQty] = useState(1);
  const [modifierQty, setModifierQty] = useState<Record<string, number>>({});
  const [radioSelection, setRadioSelection] = useState<Record<string, string>>(
    {},
  );
  const [remark, setRemark] = useState("");
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [requirementMessage, setRequirementMessage] = useState<{
    groupId: string;
    message: string;
  } | null>(null);

  const productQuery = useAsyncResource(
    (signal) => fetchProductBySlug(slug, { signal }),
    { deps: [slug] },
  );

  const product = productQuery.data;
  const imageCount = 4;

  const exactGroups = useMemo(
    () => (product ? getExactSelectionGroups(product.modifierGroups) : []),
    [product],
  );
  const hasExactSelection = exactGroups.length > 0;

  const exactTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const group of exactGroups) {
      totals[group.id] = sumExactSelectionFromQtyMap(group, modifierQty);
    }
    return totals;
  }, [exactGroups, modifierQty]);

  const allExactSelectionsComplete =
    exactGroups.length === 0 ||
    exactGroups.every(
      (group) =>
        (exactTotals[group.id] ?? 0) === group.exactSelectionQuantity,
    );

  const draftModifiers = useMemo(
    () =>
      product
        ? buildModifiersFromSelection(
            product.modifierGroups,
            radioSelection,
            modifierQty,
          )
        : [],
    [product, radioSelection, modifierQty],
  );

  const requiredComplete =
    !product ||
    areRequiredModifierGroupsComplete(product.modifierGroups, draftModifiers);

  const configuredUnitPriceMinor = useMemo(() => {
    if (!product) return null;
    const baseMinor =
      product.priceThb === null ? null : Math.round(product.priceThb * 100);
    return computeConfiguredUnitPriceMinor(
      baseMinor,
      product.modifierGroups,
      draftModifiers,
    );
  }, [product, draftModifiers]);

  const addTotalLabel =
    configuredUnitPriceMinor === null
      ? formatPriceThb(product?.priceThb ?? null)
      : formatPriceThb((configuredUnitPriceMinor * productQty) / 100);

  function changeModifierQty(
    group: ProductModifierGroup,
    optionKey: string,
    delta: number,
  ) {
    setModifierQty((current) => {
      const currentQty = current[optionKey] ?? 0;
      if (delta < 0 && currentQty <= 0) return current;

      if (isExactSelectionGroup(group) && delta > 0) {
        const groupTotal = sumExactSelectionFromQtyMap(group, current);
        if (groupTotal >= group.exactSelectionQuantity) {
          setSelectionMessage(
            formatExactSelectionMaximumMessage(group.exactSelectionQuantity),
          );
          return current;
        }
      }

      const max = getMaxSelection(group);
      if (
        !isExactSelectionGroup(group) &&
        max !== null &&
        delta > 0
      ) {
        const groupTotal = sumExactSelectionFromQtyMap(
          { ...group, exactSelectionQuantity: max },
          current,
        );
        if (groupTotal >= max) return current;
      }

      const nextQty = clampQty(currentQty + delta);
      const next = { ...current, [optionKey]: nextQty };

      if (isExactSelectionGroup(group)) {
        setSelectionMessage(null);
      }
      setRequirementMessage(null);

      return next;
    });
  }

  function handleAddToCart() {
    if (!product) return;

    if (!allExactSelectionsComplete) {
      const incomplete = exactGroups.find(
        (group) =>
          (exactTotals[group.id] ?? 0) !== group.exactSelectionQuantity,
      );
      if (incomplete) {
        setSelectionMessage(
          formatExactSelectionIncompleteMessage(
            incomplete.exactSelectionQuantity,
          ),
        );
      }
      return;
    }

    const modifiers = buildModifiersFromSelection(
      product.modifierGroups,
      radioSelection,
      modifierQty,
    );

    const required = validateRequiredModifierGroups(
      product.modifierGroups,
      modifiers,
    );
    if (!required.ok) {
      setRequirementMessage({
        groupId: required.groupId,
        message: required.message,
      });
      return;
    }

    setSelectionMessage(null);
    setRequirementMessage(null);
    void addItem({
      productId: product.id,
      name: product.title,
      imageSrc: product.imagePlaceholder || "/product-placeholder.svg",
      quantity: productQty,
      modifiers,
      note: remark.trim() || undefined,
    });
  }

  if (
    productQuery.status === "loading" ||
    productQuery.status === "error" ||
    productQuery.status === "empty" ||
    !product
  ) {
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
              <h4 className="header-title__product-title">Product</h4>
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
          <CatalogStatus
            status={
              productQuery.status === "success" ? "empty" : productQuery.status
            }
            errorMessage={productQuery.errorMessage}
            emptyMessage="Product not found."
            onRetry={productQuery.reload}
          />
        </div>
      </div>
    );
  }

  const priceLabel = formatPriceThb(product.priceThb);
  const addDisabled = !allExactSelectionsComplete || !requiredComplete;

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
            <h4 className="header-title__product-title">{product.title}</h4>
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
                      {Array.from({ length: imageCount }).map((_, index) => (
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
                              src={product.imagePlaceholder}
                              alt=""
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ul className="slick-dots" role="tablist">
                    {Array.from({ length: imageCount }).map((_, index) => (
                      <li
                        key={`pdp-dot-${index}`}
                        className={index === activeImage ? "slick-active" : ""}
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
                    ))}
                  </ul>
                </div>
              </div>

              <div className="col-md-6 col-sm-12 col-xs-12 smoov-product-detail-right-panel">
                <div className="product-detail-text-right">
                  <span className="cls_from">from</span>
                  <span>{priceLabel}</span>
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
                    {product.description.map((paragraph, index) => (
                      <p key={`desc-${index}`}>{paragraph}</p>
                    ))}
                    {product.description.length > 0 ? <hr /> : null}
                    {product.allergenLabel || product.allergenText ? (
                      <p>
                        {product.allergenLabel ? (
                          <strong>{product.allergenLabel}</strong>
                        ) : null}
                        {product.allergenLabel && product.allergenText ? (
                          <br />
                        ) : null}
                        {product.allergenText}
                      </p>
                    ) : null}
                    {product.storageLabel || product.storageText ? (
                      <p>
                        {product.storageLabel ? (
                          <strong>{product.storageLabel}</strong>
                        ) : null}
                        {product.storageLabel && product.storageText ? (
                          <br />
                        ) : null}
                        {product.storageText}
                      </p>
                    ) : null}
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
                    {product.modifierGroups.map((group) => {
                      if (group.isActive === false) return null;

                      const exact = isExactSelectionGroup(group)
                        ? group.exactSelectionQuantity
                        : null;
                      const selectedTotal =
                        exact !== null ? (exactTotals[group.id] ?? 0) : 0;
                      const atExactMax =
                        exact !== null && selectedTotal >= exact;
                      const maxSelection = getMaxSelection(group);
                      const required = isRequiredModifierGroup(group);
                      const optionalHint = !required
                        ? formatOptionalHint(maxSelection)
                        : null;

                      return (
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

                            {exact !== null ? (
                              <div className="margin-top-5">
                                <small
                                  className="exact-selection-counter text-muted danger_message danger_red_message required-modi"
                                  aria-live="polite"
                                >
                                  {formatExactSelectionProgress(
                                    selectedTotal,
                                    exact,
                                  )}
                                </small>
                              </div>
                            ) : group.requiredText ? (
                              <div className="margin-top-5">
                                <small className="danger_message danger_red_message text-muted danger-message-custom required-modi">
                                  {group.requiredText}
                                </small>
                              </div>
                            ) : optionalHint ? (
                              <div className="margin-top-5">
                                <small className="text-muted optional-modi">
                                  {optionalHint}
                                </small>
                              </div>
                            ) : null}

                            {exact !== null &&
                            selectionMessage &&
                            group.id === exactGroups[0]?.id ? (
                              <div className="margin-top-5">
                                <small
                                  className="danger_message danger_red_message text-muted danger-message-custom exact-selection-message"
                                  role="alert"
                                >
                                  {selectionMessage}
                                </small>
                              </div>
                            ) : null}

                            {requirementMessage?.groupId === group.id ? (
                              <div className="margin-top-5">
                                <small
                                  className="danger_message danger_red_message text-muted danger-message-custom required-group-message"
                                  role="alert"
                                >
                                  {requirementMessage.message}
                                </small>
                              </div>
                            ) : null}

                            <table className="table-product-detail">
                              <tbody>
                                {group.options.map((option) => {
                                  const optionKey = `${group.id}:${option}`;
                                  const optionQty = modifierQty[optionKey] ?? 0;
                                  const optionPrice = getOptionPriceMinor(
                                    group,
                                    option,
                                  );
                                  const nonExactAtMax =
                                    exact === null &&
                                    maxSelection !== null &&
                                    sumExactSelectionFromQtyMap(
                                      {
                                        ...group,
                                        exactSelectionQuantity: maxSelection,
                                      },
                                      modifierQty,
                                    ) >= maxSelection;
                                  return (
                                    <tr key={optionKey}>
                                      <td className="modifier-title">
                                        <div className="title-line-height">
                                          {option}
                                        </div>
                                      </td>
                                      <td className="modifier-price text-left">
                                        <span className="title-line-height">
                                          {formatOptionPriceLabel(optionPrice)}
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
                                              onChange={() => {
                                                setRadioSelection((current) => ({
                                                  ...current,
                                                  [group.id]: option,
                                                }));
                                                setRequirementMessage(null);
                                              }}
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
                                                disabled={optionQty <= 0}
                                                onClick={() =>
                                                  changeModifierQty(
                                                    group,
                                                    optionKey,
                                                    -1,
                                                  )
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
                                              value={String(optionQty)}
                                              readOnly
                                              aria-label={`${option} quantity`}
                                            />
                                            <span className="input-group-btn">
                                              <button
                                                className="btn plus button-input-group"
                                                type="button"
                                                aria-label={`Increase ${option}`}
                                                disabled={
                                                  atExactMax || nonExactAtMax
                                                }
                                                onClick={() =>
                                                  changeModifierQty(
                                                    group,
                                                    optionKey,
                                                    1,
                                                  )
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
                      );
                    })}

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
                    disabled={productQty <= 1}
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
                    disabled={productQty >= 999}
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
                <button
                  id="btn-AddToCart"
                  className={`btn${addDisabled ? " is-disabled" : ""}`}
                  type="button"
                  aria-disabled={addDisabled}
                  onClick={handleAddToCart}
                >
                  ADD
                  <span>
                    -<span id="totalPriceOfProduct"> {addTotalLabel}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
