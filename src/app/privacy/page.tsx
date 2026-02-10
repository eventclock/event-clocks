import PageShell from "@/components/PageShell";

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      subtitle="How information is handled on this site."
    >
      <p>
        Event Clocks respects your privacy. We do not require user accounts and
        do not collect personal information such as names or email addresses.
      </p>

      <h2>Analytics</h2>
      <p>
        Anonymous usage data (such as page views or device type) may be collected
        to help understand how the site is used and to improve the tools over time.
      </p>

      <h2>Cookies</h2>
      <p>
        Cookies may be used by analytics or advertising services to measure
        performance or display relevant content.
      </p>

      <h2>Third-party services</h2>
      <p>
        Third-party services (for example, Google Analytics or Google AdSense)
        may process information in accordance with their own privacy policies.
      </p>

      <h2>Your choices</h2>
      <p>
        You can disable cookies through your browser settings at any time.
      </p>

      <h2>Contact</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us via
        the Contact page.
      </p>
    </PageShell>
  );
}
