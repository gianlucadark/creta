interface TableProps {
  title?: string;
  headers: string[];
  rows: string[][];
}

export function Table({ title, headers, rows }: TableProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-brown-200 bg-white shadow-sm">
      {title && (
        <div className="border-b border-brown-200 bg-cream-dark px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brown-900">
            {title}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-brown-900 text-cream">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-5 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brown-100">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-cream">
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className="px-5 py-3 text-brown-700">
                    {row[cellIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
