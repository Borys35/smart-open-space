import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { Button } from "~/components/ui/button"

export const handle = {
    title: "Open Space",
};

export default function OpenSpaceCreate() {
    return (
        <div className="flex h-full w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <CreateOpenSpaceForm />
            </div>
        </div>
    )
}
