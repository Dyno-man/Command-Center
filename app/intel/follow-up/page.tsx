import { notFound } from "next/navigation";
import { FollowUpWorkspace } from "@/components/FollowUpWorkspace";
import { Topic } from "@/lib/types";

function isTopic(value: unknown): value is Topic {
  return (
    value === "Energy" ||
    value === "Defense" ||
    value === "Trade" ||
    value === "Monetary Policy" ||
    value === "Technology" ||
    value === "Shipping"
  );
}

export default async function FollowUpPage({
  searchParams
}: {
  searchParams: Promise<{ countryCode?: string; topic?: string }>;
}) {
  const params = await searchParams;
  const countryCode = typeof params.countryCode === "string" ? params.countryCode.toUpperCase() : "";
  const topic = params.topic;

  if (!countryCode || !isTopic(topic)) {
    notFound();
  }

  return <FollowUpWorkspace countryCode={countryCode} topic={topic} />;
}
