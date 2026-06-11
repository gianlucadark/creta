import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPageDesign } from "@/lib/pagesStore";
import { isValidSlug } from "@/lib/slug";
import { PresentationClient } from "@/components/PresentationClient";

export const dynamic = "force-dynamic";

async function loadDesign(slug: string) {
  if (!isValidSlug(slug)) return null;
  const source = await readPageDesign(slug);
  return source.status === "ok" ? source.design : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const design = await loadDesign(slug);
  if (!design) return {};
  return {
    title: `${design.page.title} · Presentazione`,
    description: design.page.summary.slice(0, 300),
  };
}

export default async function PresentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ slide?: string }>;
}) {
  const { slug } = await params;
  const design = await loadDesign(slug);
  if (!design) notFound();

  /* ?slide=n is 1-based in the URL so shared links read naturally. */
  const { slide } = await searchParams;
  const parsed = Number.parseInt(slide ?? "", 10);
  const initialSlide = Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;

  return (
    <PresentationClient design={design} slug={slug} initialSlide={initialSlide} />
  );
}
