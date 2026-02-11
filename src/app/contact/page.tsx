import PageShell from "@/components/PageShell";

export default function ContactPage() {
  return (
    <PageShell
      title="Contact"
      subtitle="Questions, feedback, or suggestions? We'd love to hear from you."
    >
      <p>
        If you have questions about Event Clocks, encounter an issue, or have
        ideas for improvement, please reach out via email:
      </p>

      <p>
        <strong>Email:</strong>{" "}
        <a
          href="mailto:contact@event-clocks.com"
          className="underline hover:no-underline"
        >
          contact@event-clocks.com
        </a>
      </p>

      <p>
        To help us assist you faster, consider including:
      </p>

      <ul className="list-disc pl-6 space-y-1">
        <li>The timezone(s) you were converting</li>
        <li>The date and time used</li>
        <li>A brief description of the issue</li>
      </ul>

      <p className="mt-4">
        Messages are reviewed regularly. While responses may not be immediate,
        we do read all feedback.
      </p>
    </PageShell>
  );
}
