import type { FrontendModule } from "../../shared/module";
import { TravelAssistancePage } from "./ui/TravelAssistancePage";

export const travelAssistanceModule: FrontendModule = {
  id: "travel-assistance",
  number: "Module 2",
  name: "Travel assistance",
  summary:
    "Guides, email documents, translator, Google Calendar, notifications, costs, and private notes.",
  owner: "@sggorski @Gawronek-8 @pavlvs-91"
};

export { TravelAssistancePage };

