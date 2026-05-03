"use client";

import {
  Ban,
  GripVertical,
  Link2,
  MapPin,
  MinusCircle,
  Plus,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type MapObjectType = "zone" | "no-go" | "channel";

export interface MapObject {
  id: string;
  type: MapObjectType;
  label: string;
  areaSqft?: number;
}

interface MapSidebarProps {
  objects: MapObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (type: MapObjectType) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, label: string) => void;
  totalArea?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TYPE_CONFIG: Record<MapObjectType, { label: string; icon: React.ReactNode; color: string }> = {
  zone: {
    label: "Mowable zone",
    icon: <MapPin className="h-3.5 w-3.5" />,
    color: "text-leaf-600 bg-leaf-50 border-leaf-200",
  },
  "no-go": {
    label: "No-go zone",
    icon: <Ban className="h-3.5 w-3.5" />,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  channel: {
    label: "Channel",
    icon: <Link2 className="h-3.5 w-3.5" />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
};

export function MapSidebar({
  objects,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
  totalArea,
  collapsed = false,
  onToggleCollapse,
}: MapSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const zones = useMemo(() => objects.filter((o) => o.type === "zone"), [objects]);
  const noGos = useMemo(() => objects.filter((o) => o.type === "no-go"), [objects]);
  const channels = useMemo(() => objects.filter((o) => o.type === "channel"), [objects]);
  const selected = useMemo(() => objects.find((o) => o.id === selectedId), [objects, selectedId]);

  const startRename = useCallback(
    (obj: MapObject) => {
      setEditingId(obj.id);
      setEditValue(obj.label);
    },
    [],
  );

  const commitRename = useCallback(
    (id: string) => {
      if (editValue.trim()) {
        onRename(id, editValue.trim());
      }
      setEditingId(null);
    },
    [editValue, onRename],
  );

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex h-full w-10 flex-col items-center justify-center border-r border-stone-200 bg-white text-stone-400 hover:bg-stone-50"
        aria-label="Expand sidebar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-stone-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Lawn objects</h3>
          <p className="text-[11px] text-stone-400">
            {objects.length} object{objects.length !== 1 ? "s" : ""}
            {totalArea ? ` · ${totalArea.toLocaleString()} sq ft` : ""}
          </p>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Collapse sidebar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto">
        {/* Zones */}
        <SectionHeader
          title={`Mowable zones (${zones.length})`}
          type="zone"
          onAdd={() => onAdd("zone")}
        />
        {zones.length === 0 && (
          <p className="px-4 py-2 text-[11px] text-stone-400 italic">
            No zones yet. Tap + to add one.
          </p>
        )}
        {zones.map((obj) => (
          <ObjectRow
            key={obj.id}
            obj={obj}
            selected={selectedId === obj.id}
            editing={editingId === obj.id}
            editValue={editValue}
            onEditChange={setEditValue}
            onSelect={() => onSelect(obj.id)}
            onStartRename={() => startRename(obj)}
            onCommitRename={() => commitRename(obj.id)}
            onDelete={() => onDelete(obj.id)}
          />
        ))}

        {/* No-go zones */}
        <SectionHeader
          title={`No-go zones (${noGos.length})`}
          type="no-go"
          onAdd={() => onAdd("no-go")}
        />
        {noGos.length === 0 && (
          <p className="px-4 py-2 text-[11px] text-stone-400 italic">
            Flower beds, pools, patios. Tap + to mark.
          </p>
        )}
        {noGos.map((obj) => (
          <ObjectRow
            key={obj.id}
            obj={obj}
            selected={selectedId === obj.id}
            editing={editingId === obj.id}
            editValue={editValue}
            onEditChange={setEditValue}
            onSelect={() => onSelect(obj.id)}
            onStartRename={() => startRename(obj)}
            onCommitRename={() => commitRename(obj.id)}
            onDelete={() => onDelete(obj.id)}
          />
        ))}

        {/* Channels */}
        <SectionHeader
          title={`Channels (${channels.length})`}
          type="channel"
          onAdd={() => onAdd("channel")}
        />
        {channels.length === 0 && (
          <p className="px-4 py-2 text-[11px] text-stone-400 italic">
            Narrow passages between zones. Tap + to add.
          </p>
        )}
        {channels.map((obj) => (
          <ObjectRow
            key={obj.id}
            obj={obj}
            selected={selectedId === obj.id}
            editing={editingId === obj.id}
            editValue={editValue}
            onEditChange={setEditValue}
            onSelect={() => onSelect(obj.id)}
            onStartRename={() => startRename(obj)}
            onCommitRename={() => commitRename(obj.id)}
            onDelete={() => onDelete(obj.id)}
          />
        ))}
      </div>

      {/* Selected object info */}
      {selected && (
        <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-xs font-medium text-stone-700">
            Editing: {selected.label}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">
            {selected.type === "zone"
              ? "Drag vertices to reshape."
              : selected.type === "no-go"
                ? "Drag to move, resize to adjust."
                : "Adjust width in the inspector."}
          </p>
          <button
            onClick={() => onSelect(null)}
            className="mt-2 text-[11px] font-medium text-stone-500 underline underline-offset-2 hover:text-stone-700"
          >
            Deselect
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  type,
  onAdd,
}: {
  title: string;
  type: MapObjectType;
  onAdd: () => void;
}) {
  const cfg = TYPE_CONFIG[type];
  return (
    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {title}
      </span>
      <button
        onClick={onAdd}
        className={cn("rounded p-0.5 transition hover:opacity-80", cfg.color)}
        aria-label={`Add ${cfg.label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ObjectRow({
  obj,
  selected,
  editing,
  editValue,
  onEditChange,
  onSelect,
  onStartRename,
  onCommitRename,
  onDelete,
}: {
  obj: MapObject;
  selected: boolean;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[obj.type];

  return (
    <div
      className={cn(
        "group flex items-center gap-2 border-b border-stone-50 px-4 py-2.5 transition cursor-pointer",
        selected && "bg-stone-100",
        !selected && "hover:bg-stone-50",
      )}
      onClick={onSelect}
    >
      <span className={cn("flex-shrink-0 rounded p-0.5", cfg.color)}>
        {cfg.icon}
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename();
              if (e.key === "Escape") onCommitRename();
            }}
            className="w-full rounded border border-leaf-300 bg-white px-1.5 py-0.5 text-xs font-medium text-stone-900 outline-none focus:ring-1 focus:ring-leaf-400"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <p className="truncate text-xs font-medium text-stone-800">
              {obj.label}
            </p>
            {obj.areaSqft != null && (
              <p className="text-[10px] text-stone-400">
                {obj.areaSqft.toLocaleString()} sq ft
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        {!editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="rounded p-0.5 text-stone-300 hover:bg-stone-200 hover:text-stone-600"
            aria-label="Rename"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-0.5 text-stone-300 hover:bg-rose-100 hover:text-rose-500"
          aria-label="Delete"
        >
          <MinusCircle className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
