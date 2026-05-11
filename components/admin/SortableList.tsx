"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

type Item = { id: string };

type Props<T extends Item> = {
  /** The Supabase table the reorder API will update. */
  table: "categories" | "banners";
  initial: T[];
  /** Render the inner contents of each row. The drag handle is rendered for you. */
  renderItem: (item: T) => React.ReactNode;
  /** Optional className applied to each row wrapper. */
  rowClassName?: string;
};

export function SortableList<T extends Item>({
  table,
  initial,
  renderItem,
  rowClassName,
}: Props<T>) {
  const router = useRouter();
  const [items, setItems] = useState<T[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // If the server resends a different order (e.g. after an external edit),
  // reflect it locally. We intentionally don't deep-merge so any in-flight
  // reorder still wins until the user finishes dragging.
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    persist(next);
  };

  const persist = (ordered: T[]) => {
    setError(null);
    const payload = ordered.map((item, idx) => ({ id: item.id, sort_order: idx }));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, items: payload }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? body.error ?? "Could not save order");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save order");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink/50">
          Drag the <span className="inline-block align-middle">⋮⋮</span> handle to change the order.
        </p>
        {pending && (
          <span className="text-[0.65rem] text-ink/55 inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 border border-ink/40 border-t-transparent rounded-full animate-spin" />
            Saving order
          </span>
        )}
        {error && <span className="text-[0.65rem] text-vermilion">{error}</span>}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <SortableRow key={item.id} id={item.id} className={rowClassName}>
                {renderItem(item)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-ivory border border-ink/10 flex items-stretch",
        isDragging && "z-10 shadow-lg",
        className
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="px-3 grid place-items-center text-ink/40 hover:text-ink cursor-grab active:cursor-grabbing border-r border-ink/5 touch-none"
      >
        <DragHandleIcon />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </li>
  );
}

function DragHandleIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="1.4" />
      <circle cx="10" cy="4" r="1.4" />
      <circle cx="4" cy="10" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="4" cy="16" r="1.4" />
      <circle cx="10" cy="16" r="1.4" />
    </svg>
  );
}
