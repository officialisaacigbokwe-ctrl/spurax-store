import LegalPage, { Bullets, LegalSection } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: `Privacy Policy | ${COMPANY.brand}` };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what personal information Spurax collects, why we collect it, who sees it, and the choices you have. We try to collect only what we need."
    >
      <LegalSection title="1. Who is responsible for your data">
        <p>
          {COMPANY.legalName}, which operates {COMPANY.marketplaceName}, is
          responsible for your personal data.
          {COMPANY.registeredAddress
            ? ` Our address is ${COMPANY.registeredAddress}.`
            : ""}{" "}
          You can contact us about your data at {COMPANY.supportEmail}.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <Bullets
          items={[
            "Account details: your name, email address and password. Passwords are stored in a protected form and we cannot read them.",
            "Profile and delivery details: your phone number and the delivery addresses you save or enter at checkout.",
            "Order details: what you bought, from which store, the amount, and the delivery and tracking information.",
            "Seller details: your store information, and the last four digits and bank name of the account you connect for payouts. Your full account number is held by our payment provider, not by us.",
            "Verification documents (sellers who apply for the verified badge): your ID, a selfie holding your ID, and any optional documents such as proof of address or a business registration.",
            "Messages you send us, such as support emails.",
            "Basic technical information, such as device and browser type, and error logs.",
            "Small pieces of data stored in your browser, such as your sign-in session, your shopping cart and the store you last selected.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <Bullets
          items={[
            "To create your account and let you sign in.",
            "To process orders and payments, and to let sellers deliver to you.",
            "To send you order, shipping and account emails.",
            "To verify sellers, and to prevent fraud and abuse.",
            "To provide support and handle disputes.",
            "To improve and secure the marketplace.",
            "To meet our legal duties, such as keeping records.",
          ]}
        />

        <p>
          We rely on one or more of these reasons, depending on the situation:
          to carry out our contract with you, your consent, our legitimate
          interest in running a safe marketplace, and our legal obligations.
        </p>
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        <Bullets
          items={[
            "Sellers: when you place an order, the seller receives your name, phone number, email address and delivery address so they can deliver it.",
            "Paystack: our payment provider, which processes your payment and the seller’s payout.",
            "Service providers that help us run Spurax, such as our database and file storage provider, our hosting provider and our email provider. They may only use your data to provide their service to us.",
            "Authorities, when the law requires it or to protect people from harm.",
          ]}
        />

        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection title="5. Verification documents">
        <p>
          These are the most sensitive documents we handle. They are stored in a
          private area that is not reachable by a public link. Only authorised
          Spurax reviewers can open them, using links that expire after a few
          minutes. We use them only to check identity. If a submission is
          rejected, we delete the documents within 30 days. If it is approved, we
          keep them for as long as the store is active and for any period the
          law requires.
        </p>
      </LegalSection>

      <LegalSection title="6. Where your data is stored">
        <p>
          Our providers may store data on servers outside Nigeria. When that
          happens, we take steps to make sure your data stays protected, as
          required by Nigerian data protection law.
        </p>
      </LegalSection>

      <LegalSection title="7. How long we keep it">
        <p>
          We keep your data for as long as your account is open and for as long
          as needed to complete orders, handle disputes, prevent fraud and meet
          legal and accounting duties. When we no longer need it, we delete it
          or remove what identifies you.
        </p>
      </LegalSection>

      <LegalSection title="8. How we protect it">
        <p>
          We use access controls, encrypted connections and private storage for
          sensitive files. No system is perfectly secure, but we take protecting
          your data seriously and will tell you and the authorities if a breach
          affects you, as the law requires.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          Under the Nigeria Data Protection Act, you can ask us to:
        </p>

        <Bullets
          items={[
            "show you the personal data we hold about you,",
            "correct data that is wrong,",
            "delete your data, where we no longer have a reason to keep it,",
            "stop or limit how we use your data, or object to it,",
            "give you a copy of your data in a usable format, and",
            "withdraw your consent where we rely on it.",
          ]}
        />

        <p>
          Email {COMPANY.supportEmail} and we will reply within a reasonable
          time. If you are unhappy with our answer, you can complain to the
          Nigeria Data Protection Commission.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies and browser storage">
        <p>
          We use your browser’s storage to keep you signed in, remember your
          cart and remember your selected store. These are needed for the
          marketplace to work. You can clear them in your browser, but parts of
          Spurax may stop working.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          Spurax is for people aged {COMPANY.minimumAge} and over. We do not
          knowingly collect data from children. If you think a child has given
          us their data, please tell us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          We may update this policy. We will change the “last updated” date at
          the top, and tell you about important changes by email or on the site.
        </p>
      </LegalSection>
    </LegalPage>
  );
}