import React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Icons } from './Icons';

interface IngredientContextMenuProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  itemName: string;
}

export const IngredientContextMenu: React.FC<IngredientContextMenuProps> = ({ 
  children, 
  onEdit, 
  onDelete,
  itemName 
}) => {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-xl overflow-hidden shadow-xl border border-gray-100 p-1 z-50 animate-fade-in">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                {itemName}
            </div>
            
            <ContextMenu.Item 
                className="group flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg outline-none cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors select-none"
                onSelect={onEdit}
            >
                <Icons.Edit size={16} /> 
                <span>Edit Quantity</span>
            </ContextMenu.Item>

            <ContextMenu.Item 
                className="group flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 rounded-lg outline-none cursor-pointer hover:bg-red-50 transition-colors select-none"
                onSelect={onDelete}
            >
                <Icons.Trash size={16} /> 
                <span>Delete</span>
            </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

