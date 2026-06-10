import { PageHero } from "./doc/PageHero";
import { Section } from "./doc/Section";
import { SubSection } from "./doc/SubSection";
import { RuleCallout } from "./doc/RuleCallout";
import { AlertBanner } from "./doc/AlertBanner";
import { ProhibitionList } from "./doc/ProhibitionList";
import { StepFlow } from "./doc/StepFlow";
import { KeyFacts } from "./doc/KeyFacts";
import { DefinitionList } from "./doc/DefinitionList";
import { SummaryBox } from "./doc/SummaryBox";
import { CodeBlock } from "./doc/CodeBlock";
import { Table } from "./doc/Table";
import { RawText } from "./doc/RawText";
import type { Block } from "@/lib/schema";

type ComponentName = Block["component"];

type RegistryEntry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
};

export const registry: Record<ComponentName, RegistryEntry> = {
  PageHero: { component: PageHero },
  Section: { component: Section },
  SubSection: { component: SubSection },
  RuleCallout: { component: RuleCallout },
  AlertBanner: { component: AlertBanner },
  ProhibitionList: { component: ProhibitionList },
  StepFlow: { component: StepFlow },
  KeyFacts: { component: KeyFacts },
  DefinitionList: { component: DefinitionList },
  SummaryBox: { component: SummaryBox },
  CodeBlock: { component: CodeBlock },
  Table: { component: Table },
  RawText: { component: RawText },
};

export function renderBlock(block: Block, index: number): React.ReactNode {
  const entry = registry[block.component];
  if (!entry) {
    console.warn(`[creta] Unknown component: ${block.component}`);
    return (
      <div
        key={index}
        className="border border-dashed border-zinc-300 rounded p-3 text-sm text-zinc-400 mb-4"
      >
        Unknown component: {block.component}
      </div>
    );
  }
  const Component = entry.component;
  return <Component key={index} {...block.props} />;
}
