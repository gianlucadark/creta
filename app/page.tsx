import { getLibraryIndex, type LibraryDoc } from "@/lib/searchIndex";
import { readCollections } from "@/lib/collectionsStore";
import { readFeatured } from "@/lib/featuredStore";
import { HomeClient } from "@/components/HomeClient";

export type PageMeta = LibraryDoc;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ docs }, { collections }, featured] = await Promise.all([
    getLibraryIndex(),
    readCollections(),
    readFeatured(),
  ]);
  return (
    <HomeClient pages={docs} collections={collections} featured={featured} />
  );
}
