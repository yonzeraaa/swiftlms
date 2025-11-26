import { LayoutGrid, List } from 'lucide-react'
import Tooltip from './Tooltip'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-navy-800/50 rounded-lg p-1 border border-gold-500/20">
      <Tooltip content="Visualização em Grade">
        <button
          onClick={() => onViewChange('grid')}
          className={`
            p-2 rounded transition-all duration-200
            ${view === 'grid' 
              ? 'bg-gold-500/20 text-gold-300' 
              : 'text-gold-500 hover:text-gold-300 hover:bg-gold-500/10'
            }
          `}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </Tooltip>
      
      <Tooltip content="Visualização em Lista">
        <button
          onClick={() => onViewChange('list')}
          className={`
            p-2 rounded transition-all duration-200
            ${view === 'list' 
              ? 'bg-gold-500/20 text-gold-300' 
              : 'text-gold-500 hover:text-gold-300 hover:bg-gold-500/10'
            }
          `}
        >
          <List className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  )
}