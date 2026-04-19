import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventDetail } from "@/lib/queries";

export default async function EventPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEventDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <main style={{ padding: "32px", color: "var(--text)" }}>
      <p>
        <Link href="/">Back to map</Link>
      </p>
      <h1>{detail.headline}</h1>
      <p>{detail.summary}</p>
      <h2>Why It Matters</h2>
      <p>{detail.whyItMatters}</p>
      <h2>Sources</h2>
      <ul>
        {detail.articles.map((article) => (
          <li key={article.title}>
            <a href={article.url}>{article.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
