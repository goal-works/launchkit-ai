import { TestWebhookButton, WebhookForm } from "@/components/actions";
import { PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const data = await requireSnapshot();
  const canWrite = data.actor.permissions.includes("webhooks:write");

  return <main className="page">
    <PageHeader eyebrow="Signed asynchronous delivery" title="Webhooks" description="Endpoints are tenant scoped; signing secrets are revealed once, and every delivery records attempts, response, duration, and job state." />
    <div className="two-column">
      <Panel title="Registered endpoints" meta={`${data.webhooks.length} endpoints`}>
        <ul className="endpoint-list">{data.webhooks.map((endpoint) => <li key={endpoint.id}><div><span className="status success">{endpoint.status}</span><strong>{endpoint.url}</strong><p>{endpoint.events.join(" · ")}</p></div>{canWrite && <TestWebhookButton id={endpoint.id} />}</li>)}</ul>
      </Panel>
      <Panel title="Register endpoint" meta={canWrite ? "One-time secret reveal" : "Permission required"}>
        {canWrite ? <WebhookForm /> : <p className="empty">Your role cannot manage webhooks.</p>}
      </Panel>
    </div>
    <Panel title="Delivery history" meta="Latest first">
      <div className="table-wrap" role="region" tabIndex={0} aria-label="Webhook delivery history">
        <table>
          <thead><tr><th>Event</th><th>Status</th><th>Attempts</th><th>Response</th><th>Duration</th><th>Signature</th></tr></thead>
          <tbody>{data.deliveries.map((delivery) => <tr key={delivery.id}><td><strong>{delivery.event}</strong><span>{delivery.createdAt.slice(0, 16).replace("T", " ")}</span></td><td><span className={`status ${delivery.status === "delivered" ? "success" : "warning"}`}>{delivery.status}</span></td><td>{delivery.attempts}</td><td>{delivery.responseCode ?? "—"}</td><td>{delivery.durationMs ? `${delivery.durationMs} ms` : "—"}</td><td><code>{delivery.signaturePreview ?? "pending"}</code></td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  </main>;
}
