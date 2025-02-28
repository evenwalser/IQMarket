
import React, { useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

interface DataTableProps {
  data: Record<string, any>[];
  headers?: string[];
  title?: string;
  onRowClick?: (row: Record<string, any>) => void;
  sortable?: boolean;
  highlightCondition?: (row: Record<string, any>) => boolean;
  compact?: boolean;
}

export const DataTable = ({ 
  data, 
  headers, 
  title,
  onRowClick,
  sortable = true,
  highlightCondition,
  compact = false
}: DataTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  if (!data || data.length === 0) return null;
  
  // If headers aren't provided, use object keys from first data item
  const tableHeaders = headers || Object.keys(data[0]);

  // Sort the data if sortConfig is not null
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Handle string and number comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortConfig.direction === 'ascending') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }
      
      // Fallback for numbers and other types
      if (sortConfig.direction === 'ascending') {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    if (!sortable) return;
    
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (header: string) => {
    if (!sortable) return null;
    
    if (sortConfig?.key === header) {
      return sortConfig.direction === 'ascending' ? 
        <ChevronUp className="h-4 w-4 inline ml-1" /> : 
        <ChevronDown className="h-4 w-4 inline ml-1" />;
    }
    
    return <ArrowUpDown className="h-4 w-4 inline ml-1 opacity-30" />;
  };

  return (
    <div className="overflow-x-auto my-4 mx-auto max-w-4xl">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">{title}</h3>
      )}
      <table className={`w-full border-collapse table-auto ${compact ? 'text-sm' : ''}`}>
        <thead>
          <tr className="bg-gray-100">
            {tableHeaders.map((header, i) => (
              <th 
                key={i}
                className={`border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-600 ${
                  sortable ? 'cursor-pointer hover:bg-gray-200' : ''
                }`}
                onClick={() => requestSort(header)}
              >
                <div className="flex items-center">
                  <span>{header}</span>
                  {getSortIcon(header)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr 
              key={i} 
              className={`
                hover:bg-gray-50 
                ${onRowClick ? 'cursor-pointer' : ''}
                ${highlightCondition && highlightCondition(row) ? 'bg-blue-50' : ''}
              `}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {tableHeaders.map((header, j) => {
                // Format value based on type
                let displayValue = row[header];
                
                // Format percentages
                if (typeof displayValue === 'number' && 
                    (header.toLowerCase().includes('percent') || 
                     header.toLowerCase().includes('rate') || 
                     header.toLowerCase().includes('ratio'))) {
                  displayValue = `${displayValue}%`;
                }
                
                // Format currency
                if (typeof displayValue === 'number' && 
                    (header.toLowerCase().includes('cost') || 
                     header.toLowerCase().includes('price') || 
                     header.toLowerCase().includes('revenue') ||
                     header.toLowerCase().includes('arr'))) {
                  displayValue = `$${displayValue.toLocaleString()}`;
                }
                
                return (
                  <td 
                    key={j}
                    className="border border-gray-200 px-4 py-2 text-sm text-gray-600"
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
