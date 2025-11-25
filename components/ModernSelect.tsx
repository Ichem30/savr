import React from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: any; // Lucide Icon component
}

interface ModernSelectProps {
  value: string | undefined;
  onChange?: (value: string) => void; // Support onChange alias
  onValueChange?: (value: string) => void; // Original Radix prop name
  options: Option[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  icon?: any; // Leading icon for the trigger
}

export const ModernSelect: React.FC<ModernSelectProps> = ({ 
  value, 
  onChange,
  onValueChange,
  options, 
  placeholder = "Select...",
  className = "",
  contentClassName = "",
  icon: Icon
}) => {
  // Handle both prop names
  const handleChange = (val: string) => {
      if (onChange) onChange(val);
      if (onValueChange) onValueChange(val);
  };

  // Ensure value is string (Radix doesn't like undefined controlled values)
  const safeValue = value || "";

  const selectedOption = options.find(o => o.value === safeValue);

  return (
    <Select.Root value={safeValue} onValueChange={handleChange}>
      <Select.Trigger 
        className={`flex items-center justify-between gap-2 px-3 py-3 rounded-xl text-sm font-bold bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
            {/* Only show generic Icon if NO option is selected OR if selected option has no icon */}
            {Icon && (!selectedOption || !selectedOption.icon) && <Icon size={16} className="text-gray-400 shrink-0" />}
            
            {/* If selected, show label with icon, else placeholder */}
            {selectedOption ? (
                <span className="flex items-center gap-2 text-gray-800">
                    {selectedOption.icon && <selectedOption.icon size={14} className="text-primary" />}
                    {selectedOption.label}
                </span>
            ) : (
                <span className="text-gray-400 font-medium">{placeholder}</span>
            )}
        </div>
        
        <Select.Icon className="text-gray-300">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content 
            className={`overflow-hidden bg-white rounded-xl shadow-xl border border-gray-100 z-[70] min-w-[140px] animate-in fade-in zoom-in-95 duration-100 ${contentClassName}`}
            position="popper"
            sideOffset={5}
        >
          <Select.ScrollUpButton className="flex items-center justify-center h-[25px] bg-white text-gray-500 cursor-default">
            <ChevronUp size={12} />
          </Select.ScrollUpButton>
          
          <Select.Viewport className="p-1.5">
            {options.map((option) => (
              <Select.Item 
                key={option.value} 
                value={option.value}
                className="relative flex items-center gap-2 h-[40px] px-2 pl-8 select-none rounded-lg text-sm text-gray-700 font-bold data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary outline-none cursor-pointer transition-colors"
              >
                <Select.ItemIndicator className="absolute left-2 w-[25px] inline-flex items-center justify-center">
                  <Check size={14} className="text-primary" />
                </Select.ItemIndicator>
                
                {option.icon && <option.icon size={16} className={option.value === safeValue ? "text-primary" : "text-gray-400"} />}
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>

          <Select.ScrollDownButton className="flex items-center justify-center h-[25px] bg-white text-gray-500 cursor-default">
            <ChevronDown size={12} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
