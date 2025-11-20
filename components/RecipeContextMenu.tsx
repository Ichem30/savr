import React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Icons } from './Icons';

interface RecipeContextMenuProps {
  children: React.ReactNode;
  onViewDetails: () => void;
  recipeTitle: string;
}

export const RecipeContextMenu: React.FC<RecipeContextMenuProps> = ({ 
  children, 
  onViewDetails,
  recipeTitle 
}) => {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-xl overflow-hidden shadow-xl border border-gray-100 p-1 z-50 animate-fade-in">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1 truncate max-w-[220px]">
                {recipeTitle}
            </div>
            
            <ContextMenu.Item 
                className="group flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg outline-none cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors select-none"
                onSelect={onViewDetails}
            >
                <Icons.Eye size={16} /> 
                <span>View Details</span>
            </ContextMenu.Item>
            
            {/* Future options can go here: Save, Share, etc. */}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

