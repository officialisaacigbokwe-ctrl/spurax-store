import { createElement as h } from "react";
import Link from "next/link";
import LegalPage, { Bullets, LegalSection } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: `Support | ${COMPANY.brand}` };

export default function SupportPage() {
  return h(
    LegalPage,
    {
      children: null,
      eyebrow: "Help",
      title: "Support",
      intro: `We are here to help. We aim to reply within ${COMPANY.supportResponseDays} working days.`,
    },
    h(
      LegalSection,
      { title: "Contact us", children: null },
      h(
        "div",
        { className: "rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm leading-7 text-gray-700" },
        h(
          "p",
          null,
          h("span", { className: "font-semibold" }, "Email:"),
          " ",
          h("a", { href: `mailto:${COMPANY.supportEmail}`, className: "underline" }, COMPANY.supportEmail),
        ),
        COMPANY.supportPhone
          ? h(
              "p",
              null,
              h("span", { className: "font-semibold" }, "Phone:"),
              " ",
              COMPANY.supportPhone,
            )
          : null,
        h(
          "p",
          null,
          h("span", { className: "font-semibold" }, "Hours:"),
          " ",
          COMPANY.supportHours,
        ),
      ),
      h(
        "p",
        null,
        "To help us help you quickly, include your order number (shown on your order page), your account email, and photos if something arrived damaged or wrong.",
      ),
    ),
    h(
      LegalSection,
      { title: "Common questions", children: null },
      h("p", { className: "font-semibold text-black" }, "Where is my order?"),
      h(
        "p",
        null,
        "Open ",
        h(Link, { href: "/orders", className: "underline" }, "My orders"),
        ". Once the seller ships your order, you will see a “Track your order” button with the courier details and updates. If it has been paid but not shipped within ",
        COMPANY.sellerShipDays,
        " working days, contact the seller, then us.",
      ),
      h("p", { className: "mt-2 font-semibold text-black" }, "I paid but my order says unpaid."),
      h("p", null, "Wait a few minutes and refresh the page. If it still shows unpaid, email us with your payment receipt before you pay again."),
      h("p", { className: "mt-2 font-semibold text-black" }, "Can I change my delivery address?"),
      h("p", null, "Contact the seller as soon as possible, before they ship. Their contact details are on their store page."),
      h("p", { className: "mt-2 font-semibold text-black" }, "How do I return something or get a refund?"),
      h("p", null, "See our ", h(Link, { href: "/returns", className: "underline" }, "Returns and Refunds"), " page."),
      h("p", { className: "mt-2 font-semibold text-black" }, "How do I report a product or a seller?"),
      h("p", null, "Email us with the link to the product or store and tell us what is wrong. We take reports about fake items, scams and unsafe products seriously."),
      h("p", { className: "mt-2 font-semibold text-black" }, "I am a seller and need help."),
      h("p", null, "Email us from the address you use for your store, with your store name. For payouts, include the order number."),
    ),
    h(
      LegalSection,
      { title: "Useful links", children: null },
      h(Bullets, {
        items: [
          h(Link, { key: "terms", href: "/terms", className: "underline" }, "Terms of Service"),
          h(Link, { key: "privacy", href: "/privacy", className: "underline" }, "Privacy Policy"),
          h(Link, { key: "seller", href: "/seller-agreement", className: "underline" }, "Seller Agreement"),
        ],
      }),
    ),
  );
}