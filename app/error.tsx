"use client";

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) { return <main className="error-page"><p className="eyebrow">Application boundary</p><h1>LaunchKit could not load this tenant.</h1><p>Check the local data service, then retry.</p><button className="button" onClick={reset} type="button">Try again</button></main>; }
