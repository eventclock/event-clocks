import PageShell from "@/components/PageShell";

export default function ContactPage() {
  return (
    <PageShell
      title="Contact"
      subtitle="Feedback and questions are welcome."
    >
      <p>
        For questions, feedback, or issues related to Event Clocks, you can
        reach us at:
      </p>

      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:admin@event-clocks.com">
          admin@event-clocks.com
        </a>
      </p>

      <p>
        While responses may not be immediate, all messages are reviewed.
      </p>
    </PageShell>
  );
}
