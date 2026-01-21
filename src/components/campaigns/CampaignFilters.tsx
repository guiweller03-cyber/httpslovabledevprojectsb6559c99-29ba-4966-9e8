import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, UserX, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CampaignType = 'primeira_compra' | 'ativo' | 'inativo';

interface CampaignFiltersProps {
  selectedTypes: CampaignType[];
  onFilterChange: (types: CampaignType[]) => void;
  clientCounts: {
    primeira_compra: number;
    ativo: number;
    inativo: number;
  };
}

const filterConfig: { id: CampaignType; label: string; icon: React.ReactNode; colorClass: string }[] = [
  {
    id: 'primeira_compra',
    label: 'Sem Compra',
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
    colorClass: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  },
  {
    id: 'ativo',
    label: 'Ativo',
    icon: <UserCheck className="w-3.5 h-3.5" />,
    colorClass: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  },
  {
    id: 'inativo',
    label: 'Inativo',
    icon: <UserX className="w-3.5 h-3.5" />,
    colorClass: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  },
];

export function CampaignFilters({ selectedTypes, onFilterChange, clientCounts }: CampaignFiltersProps) {
  const toggleFilter = (type: CampaignType) => {
    if (selectedTypes.includes(type)) {
      onFilterChange(selectedTypes.filter(t => t !== type));
    } else {
      onFilterChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {filterConfig.map((filter) => {
        const isSelected = selectedTypes.includes(filter.id);
        const count = clientCounts[filter.id];
        
        return (
          <Badge
            key={filter.id}
            variant="outline"
            className={cn(
              "cursor-pointer transition-all flex items-center gap-1.5 py-1.5 px-3",
              isSelected ? filter.colorClass : "bg-background hover:bg-muted"
            )}
            onClick={() => toggleFilter(filter.id)}
          >
            <Checkbox 
              checked={isSelected} 
              className="w-3.5 h-3.5 pointer-events-none"
            />
            {filter.icon}
            <span>{filter.label}</span>
            <span className="ml-1 font-bold">({count})</span>
          </Badge>
        );
      })}
    </div>
  );
}
