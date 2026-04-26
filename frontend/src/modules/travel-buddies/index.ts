import type { FrontendModule } from "../../shared/module";
import { TravelBuddiesPage } from "./pages/TravelBuddiesPage";

export const travelBuddiesModule: FrontendModule = {
  id: "travel-buddies",
  number: "Module 3",
  name: "Travel buddies",
  summary: "Groups, members, roles, chat, polls, files, packing lists, and tasks.",
  owner: "unassigned"
};

export { TravelBuddiesPage };
