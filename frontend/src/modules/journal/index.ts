import type { FrontendModule } from "../../shared/module";
import { JournalPage } from "./JournalPage";

export const journalModule: FrontendModule = {
  id: "journal",
  number: "Module 5",
  name: "Travel journals",
  summary: "Journal creation, entries, visibility, public browsing, saved journals, comments, and reactions.",
  owner: "@sggorski @Gawronek-8 @pavlvs-91"
};

export { JournalPage };
