import { CodeCard } from "../CodeCard";

interface CodeBlockProps {
  title?: string;
  code: string;
}

export function CodeBlock({ title, code }: CodeBlockProps) {
  return (
    <div className="mb-7">
      <CodeCard title={title} code={code} />
    </div>
  );
}
