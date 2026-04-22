import type { FrontendModule } from "../../shared/module";
import { TravelBuddiesPage } from "./ui/TravelBuddiesPage";

export const travelBuddiesModule: FrontendModule = {
  id: "travel-buddies",
  number: "Module 3",
  name: "Travel buddies",
  summary: "Groups, members, roles, chat, polls, tasks, and packing lists.",
  owner: "unassigned"
};

export { TravelBuddiesPage };
export { ChatPage } from "./pages/ChatPage";
export { GroupsPage } from "./pages/GroupsPage";
export { GroupDetailPage } from "./pages/GroupDetailPage";
export { useTravelBuddies } from "./hooks/useTravelBuddies";
export { TravelBuddiesProvider } from "./hooks/useTravelBuddies";