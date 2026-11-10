import Link from "next/link";
import LegalPage, { Bullets, LegalSection } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: `Returns and Refunds | ${COMPANY.brand}` };

export default function ReturnsPage() {
  return (
    <LegalPage
      eyebrow="Help"
      title="Returns and Refunds"
      intro="Each product on Spurax is sold by an independent seller. These are the minimum rules every seller follows, so you know what to expect."
    >
      <LegalSection title="Quick summary">
        <Bullets
          items={[
            `You have ${COMPANY.returnWindowDays} days after your order is delivered to report a problem.`,
            "Wrong item, damaged, faulty, missing parts, or not as described: you are covered.",
            "Contact the seller first. If they do not solve it, contact Spurax Support.",
            "Approved refunds go back to your original payment method.",
          ]}
        />
      </LegalSection>

      <LegalSection title="When you can return or get a refund">
        <Bullets
          items={[
            "You received the wrong item, a damaged or faulty item, or an item with missing parts.",
            "The item is not as described in the listing.",
            "Your order was not delivered, or not delivered within a reasonable time after the seller’s estimated date.",
            "You cancelled before the seller shipped the order. Sellers should cancel and refund in full.",
          ]}
        />

        <p>
          Some sellers accept returns for a change of mind. Check the product
          description and the store page. Items must be unused and in their
          original packaging.
        </p>
      </LegalSection>

      <LegalSection title="Items that usually cannot be returned">
        <Bullets
          items={[
            "Opened or used personal-care items, such as perfume, lip products, makeup and underwear, unless they are faulty or wrong.",
            "Food and other perishable items.",
            "Custom-made or personalised items, unless faulty or not as described.",
            "Items damaged after delivery through misuse.",
          ]}
        />
      </LegalSection>

      <LegalSection title="How to ask for a return or refund">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Go to your order, then contact the seller using the email or phone on
            their store page. Give your order number and clear photos of the
            problem.
          </li>
          <li>
            The seller should reply within {COMPANY.sellerReplyDays} working
            days and tell you what happens next.
          </li>
          <li>
            If it is not solved within 3 working days, email Spurax Support at{" "}
            {COMPANY.supportEmail} with your order number, and we will help.
          </li>
          <li>
            If a return is needed, the seller will give you return instructions.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Who pays for return delivery">
        <Bullets
          items={[
            "If the problem is the seller’s fault (wrong, faulty or not as described), the seller pays for the return and refunds your delivery fee too.",
            "If you are returning an item for a change of mind that the seller agreed to, you pay for the return delivery.",
          ]}
        />
      </LegalSection>

      <LegalSection title="How refunds are paid">
        <p>
          Approved refunds are sent back to the payment method you used. It
          usually takes {COMPANY.refundProcessingDays} working days after the
          refund is approved, and the exact time depends on your bank. For
          returns, the refund starts once the seller receives and checks the
          item, unless we agree otherwise.
        </p>
      </LegalSection>

      <LegalSection title="Need help?">
        <p>
          Visit our{" "}
          <Link href="/support" className="underline">
            Support page
          </Link>{" "}
          or email {COMPANY.supportEmail}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}