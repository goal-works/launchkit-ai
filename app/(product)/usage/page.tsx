import { money, number, PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "AI usage" };

export default async function UsagePage() {
  const data = await requireSnapshot();
  const maxTokens = Math.max(...data.usage.map((item) => item.inputTokens + item.outputTokens), 1);

  return <main className="page">
    <PageHeader eyebrow="Organization-level metering" title="AI usage" description="Provider, model, tokens, modeled cost, latency, actor, and timestamp remain attributable to the active tenant." />
    <section className="metric-grid three">
      <article><span>Input tokens</span><strong>{number(data.usageTotals.inputTokens)}</strong><small>across {data.usage.length} records</small></article>
      <article><span>Output tokens</span><strong>{number(data.usageTotals.outputTokens)}</strong><small>structured demo usage</small></article>
      <article><span>Estimated cost</span><strong>{money(data.usageTotals.costCents)}</strong><small>not a provider invoice</small></article>
    </section>
    <Panel title="Daily token volume" meta="Synthetic August records">
      <div className="usage-chart" aria-label="Daily token volume bar chart">
        {data.usage.map((item) => {
          const total = item.inputTokens + item.outputTokens;
          return <div key={item.id}><span style={{ height: `${Math.max(8, total / maxTokens * 100)}%` }} /><small>{item.createdAt.slice(8, 10)}</small></div>;
        })}
      </div>
    </Panel>
    <Panel title="Metered records" meta="Known application values">
      <div className="table-wrap" role="region" tabIndex={0} aria-label="Metered usage records">
        <table>
          <thead><tr><th>Date</th><th>Provider / model</th><th>Tokens</th><th>Latency</th><th>Estimated cost</th></tr></thead>
          <tbody>{data.usage.toReversed().map((item) => <tr key={item.id}><td>{item.createdAt.slice(0, 10)}</td><td><strong>{item.provider}</strong><span>{item.model}</span></td><td>{number(item.inputTokens + item.outputTokens)}</td><td>{item.latencyMs} ms</td><td>{money(item.estimatedCostCents)}</td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  </main>;
}
