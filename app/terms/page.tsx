import Link from "next/link";
import LegalPage, { Bullets, LegalSection } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: `Terms of Service | ${COMPANY.brand}` };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms apply when you use ${COMPANY.marketplaceName}. Please read them. By creating an account, buying or selling on Spurax, you agree to them.`}
    >
      <LegalSection title="1. Who we are">
        <p>
          {COMPANY.marketplaceName} (“Spurax”, “we”, “us”) is an online
          marketplace operated by {COMPANY.legalName}
          {COMPANY.parentCompany
            ? `, a subsidiary of ${COMPANY.parentCompany}`
            : ""}
          . These terms work together with our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          and, if you sell, our{" "}
          <Link href="/seller-agreement" className="underline">
            Seller Agreement
          </Link>
          .
        </p>

        <p>
          You must be at least {COMPANY.minimumAge} years old to use Spurax. If
          you do not agree with these terms, please do not use the marketplace.
        </p>
      </LegalSection>

      <LegalSection title="2. What Spurax does, and what it does not do">
        <Bullets
          items={[
            "Spurax is a marketplace. It lets independent sellers list products and lets buyers purchase them.",
            "When you buy a product, the sale is between you and the seller. Spurax is not the seller. We do not own, inspect, store or ship the products.",
            "Delivery is arranged by the seller. Spurax is not responsible for delivery unless we clearly say so for a specific order.",
            "Payments are handled by our payment provider, Paystack. We never see or store your full card details.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Your account">
        <Bullets
          items={[
            "Give us accurate information and keep it up to date.",
            "Keep your password private. You are responsible for what happens on your account.",
            "One person should not run several accounts to avoid our rules or a suspension.",
            "A seller account can run up to three stores.",
            "Tell us straight away if you think someone else has accessed your account.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Buying on Spurax">
        <Bullets
          items={[
            "Prices and payments are currently in Nigerian Naira (₦), and delivery is currently within Nigeria only.",
            "The total you see at checkout, including the seller’s delivery fee, is what you pay.",
            "Your order is confirmed once your payment is successful. If a product turns out to be unavailable or was listed with a clear mistake, the seller or Spurax may cancel the order and refund you in full.",
            "Delivery dates are estimates given by the seller. The seller should share courier or rider details so you can track your order.",
            "Returns and refunds are explained on our Returns and Refunds page.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Selling on Spurax">
        <p>
          Sellers must also follow the{" "}
          <Link href="/seller-agreement" className="underline">
            Seller Agreement
          </Link>
          . Sellers are responsible for their products, their listings, their
          prices, their delivery and their own taxes.
        </p>
      </LegalSection>

      <LegalSection title="6. Verified stores">
        <p>
          A store with the “Verified by Spurax” badge has submitted
          identity documents that we reviewed. The badge does not guarantee the
          quality or legality of any product, or the future behaviour of the
          seller. Please still read product descriptions and use the Returns
          and Refunds page if something goes wrong.
        </p>
      </LegalSection>

      <LegalSection title="7. What is not allowed">
        <Bullets
          items={[
            "Illegal goods, stolen goods, counterfeit or fake branded goods.",
            "Weapons, drugs, and anything dangerous or restricted by Nigerian law.",
            "Adult content, or anything that sexualises or exploits children.",
            "Listings that are misleading, such as fake photos, fake prices or fake stock.",
            "Taking a buyer off Spurax to pay outside the platform for an order that started on Spurax.",
            "Harassing, threatening or cheating other users.",
            "Hacking, scraping, or interfering with the marketplace.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Content you post">
        <p>
          You keep ownership of the photos, descriptions and other content you
          post. You give Spurax a non-exclusive licence to display and promote
          that content on the marketplace and in our marketing, for as long as
          it is on Spurax. You promise you have the right to post it and that it
          does not break anyone else’s rights.
        </p>
      </LegalSection>

      <LegalSection title="9. Our content">
        <p>
          The Spurax name, logo, badge and the marketplace software belong to us
          or our licensors. Please do not copy or reuse them without our written
          permission.
        </p>
      </LegalSection>

      <LegalSection title="10. Problems between buyers and sellers">
        <p>
          If something goes wrong, contact the seller first using the details on
          their store page. If it is not solved, contact Spurax Support at{" "}
          {COMPANY.supportEmail} with your order number. We may help both sides
          reach a fair result, and we may remove listings or suspend accounts,
          but we are not required to settle every dispute. Spurax does not hold
          sellers’ money, because payments go to the seller’s account when the
          order is paid. Nothing in this section removes your legal rights as a
          consumer.
        </p>
      </LegalSection>

      <LegalSection title="11. Suspension and ending your account">
        <p>
          We may warn, suspend or close an account, or remove a listing, if
          these terms are broken, if we suspect fraud, or if we must do so by
          law. You can ask us to close your account at any time, but orders in
          progress must be completed first.
        </p>
      </LegalSection>

      <LegalSection title="12. Our responsibility to you">
        <p>
          We work hard to keep Spurax running, but we cannot promise it will
          always be available or error free. As far as the law allows, Spurax is
          not responsible for losses caused by sellers, their products or their
          delivery, or for indirect losses. Where we are responsible to you,
          our total liability for an order is limited to the platform fee we
          received for that order. This does not limit any right that the law
          says cannot be limited.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to these terms">
        <p>
          We may update these terms. When we make important changes, we will
          tell you by email or on the site. If you keep using Spurax after the
          change, you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing law and contact">
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria, and disputes will be handled by the courts of{" "}
          {COMPANY.governingLawPlace}.
        </p>

        <p>
          Questions? Email {COMPANY.supportEmail}
          {COMPANY.registeredAddress ? `, or write to ${COMPANY.registeredAddress}` : ""}
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}