import type { FrontendModule } from "../../shared/module";
import { MapsPage } from "./ui/MapsPage";

export const mapsModule: FrontendModule = {
  id: "maps",
  number: "Module 4",
  name: "Map editing",
  summary: "Trip markers, routes, marker comments, visited places, marker groups, and map layers.",
  owner: "unassigned"
};

export { MapsPage };
export { MAP_LAYERS } from "./ui/MapComponent";
export { useMaps } from "./hooks/useMaps";
export type {
  Marker,
  MarkerGroup,
  Route,
  Waypoint,
  MarkerComment,
  MapSettings,
} from "./hooks/useMaps";