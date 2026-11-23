import type { Metadata } from "next";
import { CONTACT_PHONE, H3, LegalPage, Mail, Section, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What TaskVault stores about your household's workstreams, tasks and reminders, who processes it, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
};

const TOC = [
  { id: "summary", title: "The short version" },
  { id: "collect", title: "What we collect" },
  { id: "not-collect", title: "What we never collect" },
  { id: "use", title: "How we use it" },
  { id: "processors", title: "Who processes it for us" },
  { id: "security", title: "How it's protected" },
  { id: "retention", title: "How long we keep it" },
  { id: "rights", title: "Your rights" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      toc={TOC}
      intro={
        <p>
          TaskVault is a service of 3PandaLabs LLC, a New Jersey limited liability company (&ldquo;3PandaLabs&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;). It is a private, invite-only tracker where a household keeps its life-admin workstreams, tasks, deadlines, notes
          and document links, and gets email reminders about them. This policy explains exactly what it stores and why.
        </p>
      }
    >
      <Section id="summary" title="1. The short version">
        <UL>
          <li>We store only what you and the other members of your household type or import into TaskVault.</li>
          <li>Only members of your household can see your household&apos;s workstreams and tasks.</li>
          <li>Document links are stored as links. We never open, download or copy the documents they point to.</li>
          <li>No ads, no analytics or tracking scripts, and no cookies. We don&apos;t sell your data.</li>
          <li>Email us and we&apos;ll export or delete your data.</li>
        </UL>
      </Section>

      <Section id="collect" title="2. What we collect">
        <H3>Account details</H3>
        <p>
          There is no public sign-up: we create accounts for the members of a household. For each member we store their name, email address,
          a hashed password (we can&apos;t read it), time zone, and whether the daily digest email is on.
        </p>
        <H3>What you put in TaskVault</H3>
        <UL>
          <li>
            <strong>Workstreams:</strong> title, description, status, priority, owner, next step and notes.
          </li>
          <li>
            <strong>Tasks:</strong> title, notes, due date, priority, assignee, and whether and when it was done.
          </li>
          <li>
            <strong>Links:</strong> the web address and an optional title of documents you link (for example a Google Drive file). Only the
            link itself is stored.
          </li>
          <li>
            <strong>Spreadsheet imports:</strong> if you import a CSV file, we read it once to create the workstreams, tasks and links above.
            The file itself isn&apos;t kept.
          </li>
        </UL>
        <p>
          Notes and titles are free text, so they may contain whatever you choose to write, including personal details about your family.
          Please only add what you need.
        </p>
        <H3>Sign-in and reminder records</H3>
        <p>
          Hashed sign-in session tokens, hashed one-time password-reset tokens, the date your last digest was sent, and a record of which task
          reminders have already been sent (so you don&apos;t get the same one twice).
        </p>
        <H3>On your device</H3>
        <p>
          The web app keeps your sign-in tokens and the last workstream you added a task to in your browser&apos;s local storage. We
          don&apos;t use cookies. The app&apos;s service worker is installed so TaskVault can be added to your home screen, and it caches no
          pages or data.
        </p>
        <H3>Technical data</H3>
        <p>
          Standard server logs (IP address, timestamps, request method and path) used for security, rate limiting and debugging. Query strings
          are removed from logs, and our logs record ids and counts only: never task titles, notes, links or email addresses.
        </p>
      </Section>

      <Section id="not-collect" title="3. What we never collect">
        <UL>
          <li>The contents of the documents you link to, or access to your Google Drive or any other storage account.</li>
          <li>Your inbox, contacts, calendar, location or device data.</li>
          <li>Payment details. TaskVault is free and takes no payments.</li>
        </UL>
      </Section>

      <Section id="use" title="4. How we use it">
        <UL>
          <li>To show your household its workstreams, tasks, links and Today view.</li>
          <li>
            To send the emails TaskVault is for: task reminders (7 days and 1 day before a due date, on the day, and the day after if it&apos;s
            overdue), the daily digest (you can turn it off in Settings), and password resets.
          </li>
          <li>To keep the service secure, prevent abuse and fix problems.</li>
        </UL>
        <p>We don&apos;t sell or rent your data, and we don&apos;t use it for advertising, profiling or training AI models.</p>
      </Section>

      <Section id="processors" title="5. Who processes it for us">
        <p>We use a small number of service providers, each only for the job listed:</p>
        <UL>
          <li>
            <strong>Hetzner Online GmbH</strong> (Germany): hosts our server and database, where your account and everything you put in
            TaskVault are stored.
          </li>
          <li>
            <strong>Cloudflare, Inc.</strong> (USA): serves the website and passes requests to our server, protecting it from attacks.
          </li>
          <li>
            <strong>Google LLC</strong> (USA): our reminder, digest and password-reset emails are sent through Gmail, so Google handles each
            email&apos;s recipient address and content.
          </li>
          <li>
            <strong>Resend, Inc.</strong> (USA): a backup email delivery service, used only if we switch email sending to our shared
            3PandaLabs mail gateway.
          </li>
        </UL>
        <p>
          These providers may process data outside the country you live in, including in the USA and the European Union. We may also disclose
          data if the law requires it, or to protect the rights and safety of our users or of 3PandaLabs.
        </p>
      </Section>

      <Section id="security" title="6. How it's protected">
        <UL>
          <li>All traffic uses HTTPS.</li>
          <li>Passwords and sign-in tokens are stored only as one-way hashes. Sign-in attempts are rate-limited.</li>
          <li>Every request is checked against your account and household. Nobody outside your household can reach your data.</li>
          <li>Access to production systems is limited to the 3PandaLabs team.</li>
        </UL>
        <p>No system is perfectly secure. If a breach affects your data, we&apos;ll notify you as the law requires.</p>
      </Section>

      <Section id="retention" title="7. How long we keep it">
        <UL>
          <li>
            <strong>Workstreams, tasks and links:</strong> kept while your household&apos;s account is open. When you delete a workstream or
            task in the app, it&apos;s deleted right away (deleting a workstream also deletes its tasks and links).
          </li>
          <li>
            <strong>Sign-in sessions:</strong> expire after 30 days without use. Password-reset links expire after 1 hour.
          </li>
          <li>
            <strong>Everything:</strong> deleted within 30 days of you asking us to delete your account. Any backup copies roll off within a
            further 30 days.
          </li>
          <li>Server logs are kept for up to 30 days.</li>
        </UL>
      </Section>

      <Section id="rights" title="8. Your rights">
        <p>Depending on where you live, you may have the right to access, correct, export or delete your personal data. In TaskVault you can:</p>
        <UL>
          <li>
            <strong>Correct</strong> your name, time zone and password in Settings, and edit or delete any workstream, task or link.
          </li>
          <li>
            <strong>Stop</strong> the daily digest in Settings.
          </li>
          <li>
            <strong>Export or delete</strong> your account and your household&apos;s data by emailing <Mail />. We answer within 30 days.
          </li>
        </UL>
        <p>If you&apos;re not satisfied with our answer, you can complain to your local data protection authority.</p>
      </Section>

      <Section id="children" title="9. Children">
        <p>
          TaskVault accounts are for adults 18 and older. Tasks may mention children (for example a passport renewal), but we don&apos;t create
          accounts for children or knowingly collect data from them.
        </p>
      </Section>

      <Section id="changes" title="10. Changes">
        <p>
          If we change this policy in a way that matters, we&apos;ll email you before it takes effect. The date at the top shows the latest
          version.
        </p>
      </Section>

      <Section id="contact" title="11. Contact">
        <p>
          3PandaLabs LLC, New Jersey, USA. Email <Mail /> or call {CONTACT_PHONE} for privacy questions and data requests. This policy is
          governed by the laws of the State of New Jersey, USA, without affecting any rights you have under the laws of the place where you
          live.
        </p>
      </Section>
    </LegalPage>
  );
}
