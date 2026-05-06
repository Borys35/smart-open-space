import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type Desk = {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    data: string;
};

type DesksEditorCanvasProps = {
    desks: Desk[];
    setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
    overlappingDesks: Set<number>;
};

export function DesksEditorCanvas({ desks, setDesks, overlappingDesks }: DesksEditorCanvasProps) {
    const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);

    // Dragging state
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const addDesk = () => {
        const newDesk: Desk = {
            id: Math.random() * 1000000,
            x: 50,
            y: 50,
            width: 100,
            height: 60,
            data: "New Desk",
        };
        setDesks((prev) => [...prev, newDesk]);
        setSelectedDeskId(newDesk.id);
    };

    const deleteDesk = (id: number) => {
        setDesks((prev) => prev.filter((d) => d.id !== id));
        if (selectedDeskId === id) setSelectedDeskId(null);
    };

    const updateDeskData = (id: number, newData: string) => {
        setDesks((prev) =>
            prev.map((d) => (d.id === id ? { ...d, data: newData } : d))
        );
    };

    const handlePointerDown = (e: React.PointerEvent, id: number) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const rect = target.getBoundingClientRect();
        if (containerRef.current) {
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
            setDraggingId(id);
            setSelectedDeskId(id);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingId || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;

        setDesks((prev) =>
            prev.map((d) => (d.id === draggingId ? { ...d, x: newX, y: newY } : d))
        );
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggingId) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDraggingId(null);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[70vh] min-h-[500px] w-full border rounded-lg overflow-hidden bg-background shadow-sm">
            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 relative bg-slate-100/50 dark:bg-slate-900 overflow-hidden touch-none"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {desks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                        Click "Add Desk" to start placing items.
                    </div>
                )}

                {desks.map((desk) => {
                    const isOverlapping = overlappingDesks.has(desk.id);
                    const isSelected = selectedDeskId === desk.id;

                    return (
                        <div
                            key={desk.id}
                            className={cn(
                                "absolute rounded-lg flex items-center justify-center text-sm font-medium cursor-move transition-colors shadow-sm select-none",
                                isOverlapping
                                    ? "bg-red-100 border-2 border-dashed border-red-500 text-red-700 dark:bg-red-900/50 dark:border-red-500/80 dark:text-red-200"
                                    : isSelected
                                        ? "bg-primary text-primary-foreground border-2 border-primary"
                                        : "bg-white border-2 border-slate-200 text-slate-700 hover:border-primary/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                            )}
                            style={{
                                left: desk.x,
                                top: desk.y,
                                width: desk.width,
                                height: desk.height,
                                touchAction: "none",
                            }}
                            onPointerDown={(e) => handlePointerDown(e, desk.id)}
                        >
                            {desk.data}
                        </div>
                    );
                })}
            </div>

            {/* Sidebar Panel */}
            <div className="w-full md:w-80 border-l flex flex-col bg-card">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Desks</h2>
                    <Button size="sm" onClick={addDesk}>
                        Add Desk
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {desks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No desks placed yet.
                        </p>
                    ) : (
                        desks.map((desk) => (
                            <div
                                key={desk.id}
                                className={cn(
                                    "p-3 rounded-md border text-sm space-y-2",
                                    selectedDeskId === desk.id ? "border-primary bg-primary/5" : "bg-muted/50"
                                )}
                                onClick={() => setSelectedDeskId(desk.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium truncate max-w-[120px]">{desk.data || "Untitled"}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteDesk(desk.id);
                                        }}
                                    >
                                        ×
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div>X: {Math.round(desk.x)}</div>
                                    <div>Y: {Math.round(desk.y)}</div>
                                </div>

                                {selectedDeskId === desk.id && (
                                    <div className="pt-2">
                                        <Label htmlFor={`desk-data-${desk.id}`} className="text-xs">Data / Label</Label>
                                        <Input
                                            id={`desk-data-${desk.id}`}
                                            size={1}
                                            className="h-7 text-xs mt-1"
                                            value={desk.data}
                                            onChange={(e) => updateDeskData(desk.id, e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}