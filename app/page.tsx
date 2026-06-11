import { getLibraryIndex, type LibraryDoc } from "@/lib/searchIndex";
import { readCollections } from "@/lib/collectionsStore";
import { HomeClient } from "@/components/HomeClient";

export type PageMeta = LibraryDoc;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ docs }, { collections }] = await Promise.all([
    getLibraryIndex(),
    readCollections(),
  ]);
  return <HomeClient pages={docs} collections={collections} />;
}
