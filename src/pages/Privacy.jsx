export default function Privacy() {
  return (
    <section className="static-page">
      <header className="static-header">
        <h1 className="static-title">Privacy Policy</h1>
        <p className="static-updated">Last updated: August 2026</p>
      </header>

      <p>
        This policy explains what information ESSORA collects, how we use it,
        and the choices you have. We collect only what we need to run the
        Service.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — your name, email address,
          password (stored in hashed form), and the profile details you choose
          to add (school, major, bio, photo, price).
        </li>
        <li>
          <strong>Essays and reviews</strong> — the essays Applicants submit
          and the feedback Reviewers write.
        </li>
        <li>
          <strong>Payment information</strong> — handled entirely by Stripe, a
          PCI-DSS Level 1 certified payment processor. Card numbers, bank
          account details, and Social Security numbers (for Reviewer identity
          verification) are collected directly by Stripe and never pass
          through or get stored on ESSORA&apos;s servers. We keep only
          non-sensitive references such as payment status and transaction IDs.
        </li>
        <li>
          <strong>Basic usage data</strong> — standard technical logs (such as
          page performance metrics) used to keep the site fast and reliable.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>to operate the marketplace — matching, submissions, and reviews;</li>
        <li>to process payments and reviewer payouts through Stripe;</li>
        <li>
          to send transactional emails, such as notifying a Reviewer when a new
          essay arrives;
        </li>
        <li>to prevent fraud and enforce our Terms of Service.</li>
      </ul>
      <p>We do not sell your personal information to anyone.</p>

      <h2>3. Who can see your essays</h2>
      <p>
        An Applicant&apos;s essay is visible only to the Reviewer they submit
        it to. Reviewers are required to keep essays confidential. ESSORA staff
        access essay content only when needed to resolve a support issue or
        investigate abuse.
      </p>

      <h2>4. Services we rely on</h2>
      <p>
        We use a small number of trusted providers to run ESSORA, and each
        receives only the data needed to do its job:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and file
          storage;
        </li>
        <li><strong>Stripe</strong> — payments and reviewer payouts;</li>
        <li><strong>Vercel</strong> — website hosting;</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
      </ul>

      <h2>5. How we protect your information</h2>
      <ul>
        <li>
          All traffic to and from ESSORA is encrypted in transit (HTTPS/TLS),
          and data is stored with providers that encrypt it at rest.
        </li>
        <li>
          Passwords are stored only in hashed form — no one, including us, can
          read them.
        </li>
        <li>
          Database access rules restrict every record to the users it belongs
          to; an Applicant&apos;s essay is readable only by that Applicant and
          their chosen Reviewer.
        </li>
        <li>
          Financial data is protected by Stripe&apos;s banking-grade security
          — the most sensitive information (cards, bank accounts, SSNs) never
          touches our systems at all.
        </li>
        <li>
          No system is perfectly secure. If a data breach affecting your
          personal information ever occurs, we will notify affected users
          promptly and as required by applicable law.
        </li>
      </ul>

      <h2>6. Data retention</h2>
      <p>
        We keep your data while your account is active. If you delete your
        account, your profile is removed; transaction records may be retained
        where required for financial and legal record-keeping.
      </p>

      <h2>7. Your choices and privacy rights</h2>
      <ul>
        <li>You can edit your profile information at any time in settings.</li>
        <li>You can delete your account from account settings.</li>
        <li>
          You can email us to request a copy of your data, ask what we hold
          about you, or ask that it be corrected or deleted.
        </li>
        <li>
          Depending on where you live (for example, under the California
          Consumer Privacy Act), you may have additional legal rights to
          access, correct, or delete your personal information and to be free
          from discrimination for exercising those rights. We honor such
          requests regardless of your state. We do not sell personal
          information, so there is nothing to opt out of selling.
        </li>
      </ul>

      <h2>8. Children&apos;s privacy</h2>
      <p>
        The Service is intended for high school students and older. Users
        under 18 should use ESSORA with the knowledge and consent of a parent
        or legal guardian, and a parent or guardian may contact us at any time
        to review or request deletion of their minor child&apos;s information.
        We do not knowingly collect information from children under 13; if you
        believe a child under 13 has created an account, contact us and we
        will remove it and delete the associated data.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        If we make material changes to this policy, we will update the date at
        the top of this page.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions or requests:{" "}
        <a href="mailto:essora308@gmail.com">essora308@gmail.com</a>.
      </p>
    </section>
  );
}
