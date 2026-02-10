import PageShell from "@/components/PageShell";

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of Service"
      subtitle="Basic terms for using Event Clocks."
    >
      <p>
        By using Event Clocks, you agree to the following terms.
      </p>

      <h2>Use of the site</h2>
      <p>
        Event Clocks is provided for informational purposes only. While accuracy
        is a priority, we do not guarantee results and are not responsible for
        scheduling or time-related errors.
      </p>

      <h2>Availability</h2>
      <p>
        The site and its features may change, be updated, or become unavailable
        at any time without notice.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Event Clocks is provided “as is”, without warranties of any kind.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        These terms may be updated from time to time. Continued use of the site
        indicates acceptance of any changes.
      </p>
    </PageShell>
  );
}
