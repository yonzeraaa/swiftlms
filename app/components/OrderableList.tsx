'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, X, AlertCircle } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface OrderableItem {
  id: string;
  name: string;
  description?: string;
  metadata?: any;
}

interface OrderableListProps {
  items: OrderableItem[];
  onReorder: (items: OrderableItem[]) => Promise<void>;
  title?: string;
  renderItem?: (item: OrderableItem) => React.ReactNode;
  canEdit?: boolean;
}

function SortableItem({ 
  item, 
  renderItem,
  canEdit = true
}: { 
  item: OrderableItem; 
  renderItem?: (item: OrderableItem) => React.ReactNode;
  canEdit?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-navy-800/50 rounded-lg border ${
        isDragging ? 'border-gold-500 shadow-lg' : 'border-navy-600'
      } ${canEdit ? 'hover:border-gold-500/50' : ''} transition-all`}
    >
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing text-gold-400/50 hover:text-gold-400"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      
      <div className="flex-1">
        {renderItem ? renderItem(item) : (
          <div>
            <div className="font-medium text-gold-200">{item.name}</div>
            {item.description && (
              <div className="text-sm text-gold-400/70 mt-1">{item.description}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderableList({
  items: initialItems,
  onReorder,
  title,
  renderItem,
  canEdit = true
}: OrderableListProps) {
  const [items, setItems] = useState<OrderableItem[]>(initialItems);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setItems(initialItems);
    setHasChanges(false);
  }, [initialItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        setError(null);
        return newItems;
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await onReorder(items);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Erro ao salvar ordem:', err);
      setError(err.message || 'Erro ao salvar a nova ordem');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setItems(initialItems);
    setHasChanges(false);
    setError(null);
  };

  if (!canEdit) {
    return (
      <div className="space-y-3">
        {title && <h3 className="text-lg font-semibold text-gold mb-2">{title}</h3>}
        {items.map((item) => (
          <SortableItem 
            key={item.id} 
            item={item} 
            renderItem={renderItem}
            canEdit={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gold">{title}</h3>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
                icon={<X className="w-4 h-4" />}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                icon={<Save className="w-4 h-4" />}
              >
                {saving ? 'Salvando...' : 'Salvar Ordem'}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem 
                key={item.id} 
                item={item} 
                renderItem={renderItem}
                canEdit={canEdit}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-gold-300/70">Nenhum item para ordenar</p>
        </Card>
      )}
    </div>
  );
}