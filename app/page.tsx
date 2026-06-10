import { getLibraryIndex, type LibraryDoc } from "@/lib/searchIndex";
import { HomeClient } from "@/components/HomeClient";

export type PageMeta = LibraryDoc;

export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeClient pages={getLibraryIndex().docs} />;
}
