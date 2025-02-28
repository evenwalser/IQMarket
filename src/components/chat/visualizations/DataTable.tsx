
import React, { useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, Settings, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DataTableProps {
  data: Record<string, any>[];
  headers?: string[];
  title?: string;
  onRowClick?: (row: Record<string, any>) => void;
  sortable?: boolean;
  highlightCondition?: (row: Record<string, any>) => boolean;
  compact?: boolean;
  visualizationId?: string;
  conversationId?: string;
  allowCustomization?: boolean;
}

interface TableSettings {
  visibleHeaders: string[];
  title?: string;
  sortConfig: {
    key: string;
    direction: 'ascending' | 'descending';
  } | null;
  compact: boolean;
}

export const DataTable = ({ 
  data, 
  headers, 
  title,
  onRowClick,
  sortable = true,
  highlightCondition,
  compact = false,
  visualizationId,
  conversationId,
  allowCustomization = false
}: DataTableProps) => {
  // Determine initial headers
  const initialHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);
  
  // Set up state for customization
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    visibleHeaders: initialHeaders,
    title: title,
    sortConfig: null,
    compact: compact
  });
  
  const [isCustomized, setIsCustomized] = useState(false);

  if (!data || data.length === 0) return null;
  
  // Use settings or fall back to props
  const tableHeaders = tableSettings.visibleHeaders;
  const tableSortConfig = tableSettings.sortConfig;
  const tableCompact = tableSettings.compact;
  const tableTitle = tableSettings.title;

  // Filter data to only include visible columns
  const visibleData = data.map(item => {
    const filteredItem: Record<string, any> = {};
    tableHeaders.forEach(header => {
      filteredItem[header] = item[header];
    });
    return filteredItem;
  });

  // Sort the data if sortConfig is not null
  const sortedData = React.useMemo(() => {
    if (!tableSortConfig) return visibleData;
    
    return [...visibleData].sort((a, b) => {
      const aValue = a[tableSortConfig.key];
      const bValue = b[tableSortConfig.key];
      
      // Handle string and number comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (tableSortConfig.direction === 'ascending') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }
      
      // Fallback for numbers and other types
      if (tableSortConfig.direction === 'ascending') {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [visibleData, tableSortConfig]);

  const requestSort = (key: string) => {
    if (!sortable) return;
    
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (tableSortConfig && tableSortConfig.key === key && tableSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    const newSortConfig = { key, direction };
    setTableSettings({...tableSettings, sortConfig: newSortConfig});
  };

  const getSortIcon = (header: string) => {
    if (!sortable) return null;
    
    if (tableSortConfig?.key === header) {
      return tableSortConfig.direction === 'ascending' ? 
        <ChevronUp className="h-4 w-4 inline ml-1" /> : 
        <ChevronDown className="h-4 w-4 inline ml-1" />;
    }
    
    return <ArrowUpDown className="h-4 w-4 inline ml-1 opacity-30" />;
  };

  // Customization handlers
  const handleHeaderToggle = (header: string) => {
    const newVisibleHeaders = tableSettings.visibleHeaders.includes(header)
      ? tableSettings.visibleHeaders.filter(h => h !== header)
      : [...tableSettings.visibleHeaders, header];
    
    // Ensure at least one header is visible
    if (newVisibleHeaders.length === 0) {
      toast.error("At least one column must be visible");
      return;
    }
    
    setTableSettings({...tableSettings, visibleHeaders: newVisibleHeaders});
  };

  const handleCompactToggle = () => {
    setTableSettings({...tableSettings, compact: !tableSettings.compact});
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableSettings({...tableSettings, title: e.target.value});
  };

  const handleSaveSettings = async () => {
    setIsCustomized(true);
    toast.success("Table settings saved");
    
    // If we have conversation ID and visualization ID, save to database
    if (conversationId && visualizationId) {
      try {
        // Get current visualizations
        const { data: conversationData, error: fetchError } = await supabase
          .from('conversations')
          .select('visualizations')
          .eq('id', conversationId)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (conversationData?.visualizations) {
          // Find and update the specific visualization
          const updatedVisualizations = conversationData.visualizations.map((viz: any) => {
            if (viz.id === visualizationId) {
              return {
                ...viz,
                userSettings: {
                  visibleHeaders: tableSettings.visibleHeaders,
                  title: tableSettings.title,
                  sortConfig: tableSettings.sortConfig,
                  compact: tableSettings.compact
                }
              };
            }
            return viz;
          });
          
          // Update in database
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ visualizations: updatedVisualizations })
            .eq('id', conversationId);
          
          if (updateError) throw updateError;
        }
      } catch (error) {
        console.error('Error saving table settings:', error);
        toast.error('Failed to save table settings');
      }
    }
  };

  const handleResetSettings = async () => {
    setTableSettings({
      visibleHeaders: initialHeaders,
      title: title,
      sortConfig: null,
      compact: compact
    });
    setIsCustomized(false);
    toast.info("Table reset to original settings");
    
    // If we have conversation ID and visualization ID, remove user settings from database
    if (conversationId && visualizationId) {
      try {
        // Get current visualizations
        const { data: conversationData, error: fetchError } = await supabase
          .from('conversations')
          .select('visualizations')
          .eq('id', conversationId)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (conversationData?.visualizations) {
          // Find and update the specific visualization
          const updatedVisualizations = conversationData.visualizations.map((viz: any) => {
            if (viz.id === visualizationId) {
              // Remove userSettings
              const { userSettings, ...rest } = viz;
              return rest;
            }
            return viz;
          });
          
          // Update in database
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ visualizations: updatedVisualizations })
            .eq('id', conversationId);
          
          if (updateError) throw updateError;
        }
      } catch (error) {
        console.error('Error resetting table settings:', error);
        toast.error('Failed to reset table settings');
      }
    }
  };

  const availableHeaders = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="overflow-x-auto my-4 mx-auto max-w-4xl">
      <div className="flex justify-between items-center mb-3">
        {tableTitle && (
          <h3 className="text-lg font-semibold text-gray-800 text-center">{tableTitle}</h3>
        )}
        
        {allowCustomization && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Customize Table
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Table Customization</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Table Title</label>
                  <Input
                    value={tableSettings.title || ''}
                    onChange={handleTitleChange}
                    placeholder="Enter table title"
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Options</label>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="compact-mode"
                      checked={tableSettings.compact}
                      onCheckedChange={handleCompactToggle}
                    />
                    <label htmlFor="compact-mode" className="text-sm">
                      Compact Mode
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visible Columns</label>
                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 gap-1">
                    {availableHeaders.map(header => (
                      <div key={header} className="flex items-center gap-2">
                        <Checkbox 
                          id={`header-${header}`}
                          checked={tableSettings.visibleHeaders.includes(header)}
                          onCheckedChange={() => handleHeaderToggle(header)}
                        />
                        <label htmlFor={`header-${header}`} className="text-sm">
                          {header}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleResetSettings}>
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSaveSettings}>
                    <Check className="h-4 w-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <table className={`w-full border-collapse table-auto ${tableCompact ? 'text-sm' : ''}`}>
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
