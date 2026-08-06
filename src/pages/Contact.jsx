export default function Contact() {
  return (
    <section className="static-page">
      <header className="static-header">
        <h1 className="static-title">Contact</h1>
      </header>

      <p>
        The fastest way to reach us is by email. We read everything and aim to
        reply within 1–2 business days.
      </p>

      <p className="static-contact-email">
        <a href="mailto:essora308@gmail.com">essora308@gmail.com</a>
      </p>

      <h2>Before you write</h2>
      <ul>
        <li>
          <strong>Payment issues</strong> — include the email address you used
          to pay and roughly when the payment happened, so we can find it
          quickly.
        </li>
        <li>
          <strong>Problems with a review</strong> — tell us the reviewer&apos;s
          name and what went wrong. If a review never arrived or clearly
          doesn&apos;t meet our standards, we&apos;ll make it right.
        </li>
        <li>
          <strong>Reviewer payouts</strong> — check that your Stripe account is
          fully connected in Profile Settings first; that resolves most payout
          questions.
        </li>
        <li>
          <strong>Anything else</strong> — bug reports, feature ideas, and
          partnership inquiries are all welcome.
        </li>
      </ul>
    </section>
  );
}
