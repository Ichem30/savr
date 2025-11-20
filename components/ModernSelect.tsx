import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Icons } from './Icons';

interface Option {
  value: string;
  label: string;
  icon?: any;
}

interface ModernSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  icon?: any;
  className?: string;
}

export const ModernSelect: React.FC<ModernSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  className = ""
}) => {
  const selectedOption = options.find(o => o.value === value);
  
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button 
          className={`flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all whitespace-nowrap ${className}`}
        >
          {Icon && <Icon size={14} className="text-primary" />}
          {selectedOption ? selectedOption.label : placeholder}
          <Icons.ChevronDown size={12} className="text-gray-400 ml-1" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="min-w-[160px] bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 animate-fade-in-up" 
          sideOffset={5}
          align="start"
        >
          <DropdownMenu.Label className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {placeholder}
          </DropdownMenu.Label>
          
          {options.map((option) => (
            <DropdownMenu.Item 
              key={option.value}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg outline-none cursor-pointer transition-colors select-none ${
                value === option.value 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onSelect={() => onChange(option.value)}
            >
              {option.icon && <option.icon size={14} />}
              {option.label}
              {value === option.value && <Icons.Check size={14} className="ml-auto" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

