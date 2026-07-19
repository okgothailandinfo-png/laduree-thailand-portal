import { escapeHtml, escapeText } from "@/src/server/notifications/escape";
import type {
  NotificationTemplateKey,
  NotificationTemplatePayload,
  RenderedNotification,
} from "@/src/server/notifications/types";

type TemplateFn = (p: SafePayload) => RenderedNotification;

type SafePayload = {
  customerName: string;
  orderNumber: string;
  boutiqueName: string;
  pickupDate: string;
  pickupTime: string;
  total: string;
  completionUrl: string;
  customerNameHtml: string;
  orderNumberHtml: string;
  boutiqueNameHtml: string;
  pickupDateHtml: string;
  pickupTimeHtml: string;
  totalHtml: string;
  completionUrlHtml: string;
};

function toSafe(payload: NotificationTemplatePayload): SafePayload {
  const customerName = escapeText(payload.customerName);
  const orderNumber = escapeText(payload.orderNumber);
  const boutiqueName = escapeText(payload.boutiqueName);
  const pickupDate = escapeText(payload.pickupDate);
  const pickupTime = escapeText(payload.pickupTime);
  const total = escapeText(payload.total);
  const completionUrl = escapeText(payload.completionUrl ?? "");
  return {
    customerName,
    orderNumber,
    boutiqueName,
    pickupDate,
    pickupTime,
    total,
    completionUrl,
    customerNameHtml: escapeHtml(payload.customerName),
    orderNumberHtml: escapeHtml(payload.orderNumber),
    boutiqueNameHtml: escapeHtml(payload.boutiqueName),
    pickupDateHtml: escapeHtml(payload.pickupDate),
    pickupTimeHtml: escapeHtml(payload.pickupTime),
    totalHtml: escapeHtml(payload.total),
    completionUrlHtml: escapeHtml(payload.completionUrl ?? ""),
  };
}

/**
 * Neutral placeholder copy pending business approval.
 * Do not copy external Ladurée website content.
 */
const TEMPLATES: Record<NotificationTemplateKey, TemplateFn> = {
  "order-confirmed": (p) => ({
    subject: `[CONTENT PENDING APPROVAL] Order confirmed ${p.orderNumber}`,
    textBody: [
      `Hello ${p.customerName},`,
      "",
      "[CONTENT PENDING APPROVAL] Your order has been confirmed.",
      `Order: ${p.orderNumber}`,
      `Boutique: ${p.boutiqueName}`,
      `Pickup: ${p.pickupDate} ${p.pickupTime}`,
      `Total: ${p.total}`,
      "",
      "Thank you.",
    ].join("\n"),
    htmlBody: [
      `<p>Hello ${p.customerNameHtml},</p>`,
      `<p>[CONTENT PENDING APPROVAL] Your order has been confirmed.</p>`,
      `<p>Order: ${p.orderNumberHtml}<br/>Boutique: ${p.boutiqueNameHtml}<br/>Pickup: ${p.pickupDateHtml} ${p.pickupTimeHtml}<br/>Total: ${p.totalHtml}</p>`,
    ].join(""),
    lineText: `[CONTENT PENDING APPROVAL] Order ${p.orderNumber} confirmed. Pickup ${p.pickupDate} ${p.pickupTime} at ${p.boutiqueName}. Total ${p.total}.`,
  }),

  "payment-failed": (p) => ({
    subject: `[CONTENT PENDING APPROVAL] Payment failed ${p.orderNumber}`,
    textBody: [
      `Hello ${p.customerName},`,
      "",
      "[CONTENT PENDING APPROVAL] Payment for your order could not be completed.",
      `Order: ${p.orderNumber}`,
      `Boutique: ${p.boutiqueName}`,
      `Total: ${p.total}`,
      "",
      "Please try again or contact the boutique for assistance.",
    ].join("\n"),
    htmlBody: [
      `<p>Hello ${p.customerNameHtml},</p>`,
      `<p>[CONTENT PENDING APPROVAL] Payment for your order could not be completed.</p>`,
      `<p>Order: ${p.orderNumberHtml}<br/>Boutique: ${p.boutiqueNameHtml}<br/>Total: ${p.totalHtml}</p>`,
    ].join(""),
    lineText: `[CONTENT PENDING APPROVAL] Payment failed for order ${p.orderNumber}. Total ${p.total}.`,
  }),

  "ready-for-pickup": (p) => ({
    subject: `[CONTENT PENDING APPROVAL] Ready for pickup ${p.orderNumber}`,
    textBody: [
      `Hello ${p.customerName},`,
      "",
      "[CONTENT PENDING APPROVAL] Your order is ready for pickup.",
      `Order: ${p.orderNumber}`,
      `Boutique: ${p.boutiqueName}`,
      `Pickup: ${p.pickupDate} ${p.pickupTime}`,
      "",
      "Thank you.",
    ].join("\n"),
    htmlBody: [
      `<p>Hello ${p.customerNameHtml},</p>`,
      `<p>[CONTENT PENDING APPROVAL] Your order is ready for pickup.</p>`,
      `<p>Order: ${p.orderNumberHtml}<br/>Boutique: ${p.boutiqueNameHtml}<br/>Pickup: ${p.pickupDateHtml} ${p.pickupTimeHtml}</p>`,
    ].join(""),
    lineText: `[CONTENT PENDING APPROVAL] Order ${p.orderNumber} ready for pickup at ${p.boutiqueName} (${p.pickupDate} ${p.pickupTime}).`,
  }),

  "order-cancelled": (p) => ({
    subject: `[CONTENT PENDING APPROVAL] Order cancelled ${p.orderNumber}`,
    textBody: [
      `Hello ${p.customerName},`,
      "",
      "[CONTENT PENDING APPROVAL] Your order has been cancelled.",
      `Order: ${p.orderNumber}`,
      `Boutique: ${p.boutiqueName}`,
      "",
      "If you have questions, please contact the boutique.",
    ].join("\n"),
    htmlBody: [
      `<p>Hello ${p.customerNameHtml},</p>`,
      `<p>[CONTENT PENDING APPROVAL] Your order has been cancelled.</p>`,
      `<p>Order: ${p.orderNumberHtml}<br/>Boutique: ${p.boutiqueNameHtml}</p>`,
    ].join(""),
    lineText: `[CONTENT PENDING APPROVAL] Order ${p.orderNumber} has been cancelled.`,
  }),

  "pickup-completed": (p) => ({
    subject: `[CONTENT PENDING APPROVAL] Pickup completed ${p.orderNumber}`,
    textBody: [
      `Hello ${p.customerName},`,
      "",
      "[CONTENT PENDING APPROVAL] Thank you. Your pickup is complete.",
      `Order: ${p.orderNumber}`,
      `Boutique: ${p.boutiqueName}`,
      `Total: ${p.total}`,
      p.completionUrl ? `Receipt: ${p.completionUrl}` : "",
      "",
      "Thank you.",
    ]
      .filter(Boolean)
      .join("\n"),
    htmlBody: [
      `<p>Hello ${p.customerNameHtml},</p>`,
      `<p>[CONTENT PENDING APPROVAL] Thank you. Your pickup is complete.</p>`,
      `<p>Order: ${p.orderNumberHtml}<br/>Boutique: ${p.boutiqueNameHtml}<br/>Total: ${p.totalHtml}</p>`,
      p.completionUrl
        ? `<p><a href="${p.completionUrlHtml}">View receipt</a></p>`
        : "",
    ].join(""),
    lineText: p.completionUrl
      ? `[CONTENT PENDING APPROVAL] Pickup complete for ${p.orderNumber}. Receipt: ${p.completionUrl}`
      : `[CONTENT PENDING APPROVAL] Pickup complete for ${p.orderNumber}. Thank you.`,
  }),
};

export function renderTemplate(
  templateKey: NotificationTemplateKey | string,
  payload: NotificationTemplatePayload,
): RenderedNotification {
  const fn = TEMPLATES[templateKey as NotificationTemplateKey];
  if (!fn) {
    throw new Error(`Unknown notification template: ${templateKey}`);
  }
  return fn(toSafe(payload));
}

export function isKnownTemplateKey(
  key: string,
): key is NotificationTemplateKey {
  return key in TEMPLATES;
}
