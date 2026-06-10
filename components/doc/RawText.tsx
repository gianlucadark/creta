interface RawTextProps {
  text: string;
}

export function RawText({ text }: RawTextProps) {
  return (
    <p className="text-brown-700 text-base leading-8 mb-5 whitespace-pre-wrap">{text}</p>
  );
}
