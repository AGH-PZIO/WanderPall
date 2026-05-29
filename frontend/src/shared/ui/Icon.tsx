import type { IconName, IconSize } from "./icons";
import { ICON_PATHS } from "./icons";

type IconProps = {
  name: IconName;
  size?: IconSize;
  className?: string;
};

export function Icon({ name, size = "icon-sm", className }: IconProps) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;

  return (
    <svg
      className={["icon", size, className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}
