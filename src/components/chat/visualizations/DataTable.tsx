
interface DataTableProps {
  data: Record<string, any>[];
  headers?: string[];
}

export const DataTable = ({ data, headers }: DataTableProps) => {
  if (!data || data.length === 0) return null;
  
  // If headers aren't provided, use object keys from first data item
  const tableHeaders = headers || Object.keys(data[0]);

  return (
    <div className="overflow-x-auto my-4 mx-auto max-w-4xl">
      <table className="w-full border-collapse table-auto">
        <thead>
          <tr className="bg-gray-100">
            {tableHeaders.map((header, i) => (
              <th 
                key={i}
                className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {tableHeaders.map((header, j) => (
                <td 
                  key={j}
                  className="border border-gray-200 px-4 py-2 text-sm text-gray-600"
                >
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
