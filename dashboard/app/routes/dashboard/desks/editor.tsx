import { DesksEditorCanvas } from "~/components/desks-editor-canvas";

export const handle = {
    title: "Desks Editor",
};

export default function DesksEditor() {
    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-10">
            <h1 className="text-2xl font-bold mb-6">Edit Desks Configuration</h1>
            <div className="w-full h-full">
                <DesksEditorCanvas />
            </div>
        </div>
    )
}
