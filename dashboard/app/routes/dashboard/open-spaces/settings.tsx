import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { OpenSpaceSettingsForm } from "~/components/forms/open-space-settings-form";
import { Button } from "~/components/ui/button"

export const handle = {
    title: "Open Space Settings",
};

export default function OpenSpaceCreate() {
    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Open Space Settings</h1>
            <div className="w-lg self-center pt-8">
                <OpenSpaceSettingsForm />
            </div>
        </div>
    )
}
