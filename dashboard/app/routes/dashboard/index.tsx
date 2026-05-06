import { Link } from "react-router";
import { Button } from "~/components/ui/button"

export const handle = {
    title: "Dashboard",
};

export default function Home() {
    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-4">Welcome to Smart Open Space Dashboard</h1>
            <p className="mb-4">See latest routes added below:</p>
            <ul className="list-disc pl-5 underline text-blue-600">
                <li><Link to="/open-spaces/create">Create new Open Space (for SUPER_ADMIN only)</Link></li>
                <li><Link to="/desks/editor">Interactive desks editor</Link></li>
                <li><Link to="/users/invite">Invite user form</Link></li>
            </ul>
        </div>
    )
}
