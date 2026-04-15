import type { FrontendModule } from "../../shared/module";
import { AccountPage } from "./ui/AccountPage";

export const accountModule: FrontendModule = {
  id: "account",
  number: "Module 1",
  name: "Account and auth",
  summary: "Registration, login, account editing, password reset, deletion, and theme preference.",
  owner: "@JK2Kgit @mKepka16"
};

export { AccountPage };
