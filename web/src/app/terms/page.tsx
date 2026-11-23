import type { Metadata } from "next";
import { A, LegalPage, Mail, Section, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using TaskVault, a private household tracker for life admin.",
  alternates: { canonical: "/terms" },
};

const TOC = [
  { id: "service", title: "The service" },
  { id: "advice", title: "Not professional advice" },
  { id: "account", title: "Your account" },
  { id: "content", title: "What you put in TaskVault" },
  { id: "use", title: "Acceptable use" },
  { id: "reminders", title: "Reminders" },
  { id: "price", title: "Price" },
  { id: "liability", title: "Disclaimers and liability" },
  { id: "ending", title: "Ending the service" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      toc={TOC}
      intro={
        <p>
          These terms are an agreement between you and 3PandaLabs LLC, a New Jersey limited liability company (&ldquo;3PandaLabs&rdquo;,
          &ldquo;we&rdquo;), for using TaskVault. By signing in you agree to them and to our <A href="/privacy">Privacy Policy</A>.
        </p>
      }
    >
      <Section id="service" title="1. The service">
        <p>
          TaskVault lets the members of a household track life-admin workstreams (for example immigration paperwork, passport renewals or
          insurance), with tasks, due dates, owners, notes and links to documents, a Today view, and email reminders and a daily digest. It is
          invite-only: we create the accounts for each household. It stores links to your documents, not the documents themselves.
        </p>
      </Section>

      <Section id="advice" title="2. Not professional advice">
        <p>
          TaskVault is an organiser. It isn&apos;t legal, immigration, tax, financial or insurance advice, and 3PandaLabs isn&apos;t a law firm or
          adviser. Official deadlines are set by the agencies and companies you deal with; check them at the source.
        </p>
      </Section>

      <Section id="account" title="3. Your account">
        <UL>
          <li>You must be 18 or older.</li>
          <li>Keep your password secret. You&apos;re responsible for what happens under your account.</li>
          <li>Everyone in your household can see and change your household&apos;s workstreams, tasks and links.</li>
        </UL>
      </Section>

      <Section id="content" title="4. What you put in TaskVault">
        <p>
          You keep ownership of everything you add. You give us permission to store, process and display it only to provide TaskVault to your
          household, including sending it to the processors listed in the Privacy Policy (for example, a task title in a reminder email).
        </p>
      </Section>

      <Section id="use" title="5. Acceptable use">
        <UL>
          <li>Don&apos;t try to break or overload the service, or reach data that isn&apos;t your household&apos;s.</li>
          <li>Don&apos;t use TaskVault to store anything illegal, or to send spam or harmful links.</li>
          <li>Don&apos;t resell or scrape the service.</li>
        </UL>
      </Section>

      <Section id="reminders" title="6. Reminders">
        <p>
          Reminder and digest emails are a convenience. Email can be delayed, filtered as spam or not arrive at all, and reminders are held back
          overnight in your time zone. Don&apos;t rely on TaskVault as the only way you keep an important deadline.
        </p>
      </Section>

      <Section id="price" title="7. Price">
        <p>TaskVault is free. If we introduce paid plans, we&apos;ll tell you in advance, and you won&apos;t be charged without agreeing.</p>
      </Section>

      <Section id="liability" title="8. Disclaimers and liability">
        <p>
          TaskVault is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, to the fullest extent the law
          allows. To the fullest extent the law allows, 3PandaLabs isn&apos;t liable for indirect, incidental or consequential losses, including
          missed deadlines or reminders, and our total liability for any claim is limited to US$100. Nothing in these terms limits liability that
          can&apos;t be limited by law.
        </p>
      </Section>

      <Section id="ending" title="9. Ending the service">
        <p>
          You can ask us to close your account at any time by emailing <Mail />. We may suspend or close accounts that break these terms. If we
          shut TaskVault down, we&apos;ll give at least 30 days&apos; notice so you can ask for an export of your data.
        </p>
      </Section>

      <Section id="law" title="10. Governing law">
        <p>
          These terms are governed by the laws of the State of New Jersey, USA, without regard to conflict-of-law rules. Courts located in New
          Jersey have jurisdiction, except where the law of the place you live gives you the right to bring a claim locally. We may update these
          terms; if a change matters, we&apos;ll email you first.
        </p>
      </Section>

      <Section id="contact" title="11. Contact">
        <p>
          Questions: <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
