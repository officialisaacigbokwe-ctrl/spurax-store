import Link from "next/link";
import LegalPage, { Bullets, LegalSection } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";
import { PLATFORM_FEE_MIN_NGN, PLATFORM_FEE_PERCENT } from "@/lib/platform-fee";

export const metadata = { title: `Seller Agreement | ${COMPANY.brand}` };

export default function SellerAgreementPage() {
  return (
    <LegalPage
      title="Seller Agreement"
      intro="This agreement is between you and Spurax. It applies when you open a store or sell on Spurax Marketplace, and it works together with our Terms of Service."
    >
      <LegalSection title="1. Who can sell">
        <Bullets
          items={[
            `You must be at least ${COMPANY.minimumAge} years old and able to enter a legal contract.`,
            "You must connect a bank account in your own name, or your business’s name, for payouts. A store cannot sell until this is done.",
            "One seller account can run up to three stores.",
            "Verification is optional for now, but we may require it for some stores or categories.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Your responsibilities as a seller">
        <Bullets
          items={[
            "List only products you are allowed to sell, using real photos, accurate descriptions, correct prices in Naira and honest stock levels.",
            "Do not sell anything listed as not allowed in our Terms of Service.",
            `Ship paid orders within ${COMPANY.sellerShipDays} working days, or tell the customer why not.`,
            "Mark orders as shipped, add the courier or rider details, and keep the tracking updates honest and current.",
            `Reply to customer messages within ${COMPANY.sellerReplyDays} working days.`,
            "Follow our Returns and Refunds rules and handle valid claims fairly.",
            "Pack products safely and deliver them as described.",
            "Keep your contact details and payout details accurate.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Payments and fees">
        <Bullets
          items={[
            "Buyers pay through Paystack, our payment provider.",
            `When an order is paid, the money is split: you receive the order amount (the products plus the delivery fee you set), minus the Spurax platform fee and the payment provider’s processing fee.`,
            `The Spurax platform fee is ${PLATFORM_FEE_PERCENT}% of the order total, with a minimum of ₦${PLATFORM_FEE_MIN_NGN.toLocaleString("en-NG")} per order.`,
            "The payment provider’s processing fee is paid by the seller and is taken from the order amount.",
            "Your share is paid to your connected bank account on the payment provider’s settlement schedule. Spurax does not hold your money.",
            "We may change our fee. We will give you at least 14 days’ notice, and the change only applies to orders placed after that.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Delivery">
        <p>
          Delivery is your responsibility. You choose the delivery fee for your
          store, and you decide how and when to deliver. Spurax is not a
          courier and does not deliver orders for sellers at this time. Delivery
          is currently within Nigeria only.
        </p>
      </LegalSection>

      <LegalSection title="5. Refunds, returns and chargebacks">
        <p>
          If a buyer has a valid claim under our Returns and Refunds rules, you
          agree to refund them. If Spurax refunds a buyer because of a valid
          claim against your order, you agree to repay us that amount when we ask
          and, if you do not, we may suspend your store. If a payment is
          reversed by a bank or card company, you are responsible for the
          reversed amount.
        </p>
      </LegalSection>

      <LegalSection title="6. Taxes">
        <p>
          You are responsible for your own taxes, licences and permits, such as
          income tax, VAT where it applies, and any business registration.
          Spurax does not give tax advice.
        </p>
      </LegalSection>

      <LegalSection title="7. Verified badge">
        <p>
          If you apply, we review the documents you submit. We may approve or
          reject your application, and we may remove the badge if the
          information turns out to be false, if documents expire, or if you
          break our rules. See our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          for how we protect your documents.
        </p>
      </LegalSection>

      <LegalSection title="8. Your content">
        <p>
          You keep ownership of your photos and descriptions. You allow Spurax
          to display and promote them on the marketplace and in our marketing
          while your store is active.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension and ending">
        <p>
          We may remove listings, suspend a store or close a seller account if
          this agreement or our Terms are broken, if customers are repeatedly
          harmed, or if we suspect fraud. You can close your store at any time
          once your open orders are completed. Rules about fees, refunds,
          taxes and liability continue to apply after that for orders already
          made.
        </p>
      </LegalSection>

      <LegalSection title="10. Responsibility">
        <p>
          You are responsible for your products and your dealings with your
          customers. As far as the law allows, Spurax is not responsible for
          your lost sales, or for indirect losses, and our total liability to
          you is limited to the platform fees you paid us in the previous three
          months.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes and contact">
        <p>
          We may update this agreement. We will tell you about important changes
          by email or in your seller center, and if you keep selling after that,
          you accept them. This agreement is governed by the laws of Nigeria,
          and the courts of {COMPANY.governingLawPlace} will handle disputes.
          Questions: {COMPANY.supportEmail}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}