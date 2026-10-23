"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="fatal">
      <h1>Something interrupted your workspace.</h1>
      <p>Your saved records remain in the database.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
