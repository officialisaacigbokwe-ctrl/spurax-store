import Link from "next/link";
import LegalPage, { Bullets, LegalSection } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `About | ${COMPANY.brand}` };

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="About"
      title={`About ${BRAND.name}`}
      intro={`${BRAND.name} is where independent sellers meet buyers who love what they make and sell. We are starting in Nigeria and building toward a global marketplace.`}
    >
      <LegalSection title="What we believe">
        <p>
          Anyone with something good to sell should be able to open a store in
          minutes, get paid directly, and be trusted by their customers. And
          anyone who buys should know who they are buying from.
        </p>
      </LegalSection>

      <LegalSection title="How it works">
        <Bullets
          items={[
            "Sellers open their own store, add products and set their own delivery fee.",
            "Customers pay securely through Paystack, and the seller’s share goes straight to the seller’s bank account.",
            "Stores can apply to be verified, and verified stores show the Spurax badge.",
            "Sellers deliver orders and keep customers updated with tracking.",
          ]}
        />
      </LegalSection>

      <LegalSection title={`Part of ${BRAND.parentName}`}>
        <p>
          {BRAND.name} is a branch of {BRAND.parentName}
          {COMPANY.parentCompany
            ? `, a subsidiary of ${COMPANY.parentCompany}`
            : ""}
          . {BRAND.parentName} also runs other branches:
        </p>

        <Bullets items={BRAND.branches.map((branch) => branch.name)} />
      </LegalSection>

      <LegalSection title="Get started">
        <p>
          <Link href="/shop" className="font-semibold underline">
            Shop the marketplace
          </Link>{" "}
          or{" "}
          <Link href="/create-store" className="font-semibold underline">
            open your own store
          </Link>
          . Questions? See our{" "}
          <Link href="/support" className="underline">
            Support page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}