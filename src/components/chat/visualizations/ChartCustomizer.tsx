
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, Check, X, BarChart, LineChart, PieChart, AreaChart } from 'lucide-react';
import { toast } from 'sonner';

interface ChartSettings {
  chartType: 'line' | 'bar' | 'radar' | 'area' | 'composed';
  xKey: string;
  yKeys: string[];
  colorScheme: 'default' | 'purple' | 'blue' | 'green';
  height: number;
  title?: string;
  subTitle?: string;
}

interface ChartCustomizerProps {
  data: Record<string, any>[];
  initialSettings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
  onSave: () => void;
  onReset: () => void;
}

export const ChartCustomizer = ({
  data,
  initialSettings,
  onSettingsChange,
  onSave,
  onReset
}: ChartCustomizerProps) => {
  const [settings, setSettings] = useState<ChartSettings>(initialSettings);
  const [isOpen, setIsOpen] = useState(false);

  const availableFields = data.length > 0 ? Object.keys(data[0]) : [];
  
  const handleChange = (field: keyof ChartSettings, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleYKeyToggle = (key: string) => {
    const newYKeys = settings.yKeys.includes(key)
      ? settings.yKeys.filter(k => k !== key)
      : [...settings.yKeys, key];
      
    // Ensure at least one Y key is selected
    if (newYKeys.length === 0) {
      toast.error("At least one Y-axis field must be selected");
      return;
    }
    
    handleChange('yKeys', newYKeys);
  };

  const chartTypeIcons = {
    'bar': <BarChart className="h-4 w-4" />,
    'line': <LineChart className="h-4 w-4" />,
    'area': <AreaChart className="h-4 w-4" />,
    'radar': <PieChart className="h-4 w-4" />,
    'composed': <div className="flex"><BarChart className="h-4 w-4" /><LineChart className="h-4 w-4" /></div>
  };

  const handleSave = () => {
    onSave();
    setIsOpen(false);
    toast.success("Chart settings saved");
  };

  const handleReset = () => {
    setSettings(initialSettings);
    onReset();
    setIsOpen(false);
    toast.info("Chart reset to original settings");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 self-end mb-2"
        >
          <Settings className="h-4 w-4" />
          Customize Chart
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Chart Customization</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Chart Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['bar', 'line', 'area', 'radar', 'composed'] as const).map(type => (
                <Button
                  key={type}
                  variant={settings.chartType === type ? "default" : "outline"}
                  size="sm"
                  className="flex items-center justify-center gap-1 h-8"
                  onClick={() => handleChange('chartType', type)}
                >
                  {chartTypeIcons[type]}
                  <span className="text-xs capitalize">{type}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chart Title</label>
            <Input
              value={settings.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter chart title"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chart Subtitle</label>
            <Input
              value={settings.subTitle || ''}
              onChange={(e) => handleChange('subTitle', e.target.value)}
              placeholder="Enter chart subtitle"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">X-Axis Field</label>
            <Select 
              value={settings.xKey} 
              onValueChange={(value) => handleChange('xKey', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select X-axis field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Y-Axis Fields</label>
            <div className="grid grid-cols-2 gap-2">
              {availableFields
                .filter(field => field !== settings.xKey)
                .map(field => (
                  <Button
                    key={field}
                    variant={settings.yKeys.includes(field) ? "default" : "outline"}
                    size="sm"
                    className="flex items-center justify-start gap-1 h-8 text-xs"
                    onClick={() => handleYKeyToggle(field)}
                  >
                    {settings.yKeys.includes(field) && <Check className="h-3 w-3" />}
                    {field}
                  </Button>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color Scheme</label>
            <div className="grid grid-cols-4 gap-2">
              {(['default', 'purple', 'blue', 'green'] as const).map(scheme => (
                <Button
                  key={scheme}
                  variant={settings.colorScheme === scheme ? "default" : "outline"}
                  size="sm"
                  className={`h-8 text-xs ${
                    settings.colorScheme === scheme 
                      ? scheme === 'default' ? 'bg-[#8884d8]'
                      : scheme === 'purple' ? 'bg-purple-600'
                      : scheme === 'blue' ? 'bg-blue-600'
                      : 'bg-green-600'
                      : ''
                  }`}
                  onClick={() => handleChange('colorScheme', scheme)}
                >
                  {scheme}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Height (px)</label>
            <Input
              type="number"
              value={settings.height}
              onChange={(e) => handleChange('height', Number(e.target.value))}
              min={200}
              max={800}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
