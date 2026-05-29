(function () {
  "use strict";

  /** Lucide-style outline icons — stroke only, currentColor */
  var ICONS = {
    "log-in": "<path d=\"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4\"/><polyline points=\"10 17 15 12 10 7\"/><line x1=\"15\" y1=\"12\" x2=\"3\" y2=\"12\"/>",
    "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" y1=\"12\" x2=\"9\" y2=\"12\"/>",
    user: "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>",
    sun: "<circle cx=\"12\" cy=\"12\" r=\"5\"/><path d=\"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42\"/>",
    moon: "<path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/>",
    menu: "<path d=\"M3 12h18M3 6h18M3 18h18\"/>",
    "arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>",
    "map-pin": "<path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
    "list-checks": "<path d=\"M10 6h11\"/><path d=\"M10 12h11\"/><path d=\"M10 18h11\"/><path d=\"m3 6 1 1 2-2\"/><path d=\"m3 12 1 1 2-2\"/><path d=\"m3 18 1 1 2-2\"/>",
    activity: "<path d=\"M22 12h-4l-3 9L9 3l-3 9H2\"/>",
    calculator: "<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\"/><line x1=\"8\" x2=\"16\" y1=\"6\" y2=\"6\"/><line x1=\"8\" x2=\"16\" y1=\"10\" y2=\"10\"/><line x1=\"8\" x2=\"16\" y1=\"14\" y2=\"14\"/><line x1=\"8\" x2=\"16\" y1=\"18\" y2=\"18\"/>",
    languages: "<path d=\"m5 8 6 6\"/><path d=\"m4 14 6-6 2-3\"/><path d=\"M2 5h12\"/><path d=\"M7 2h1\"/><path d=\"m22 22-5-10-5 10\"/><path d=\"M14 18h6\"/>",
    calendar: "<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/>",
    wrench: "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/>",
    home: "<path d=\"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/>",
    compass: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polygon points=\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\"/>",
  };

  function createIcon(name, sizeClass) {
    var paths = ICONS[name];
    if (!paths) return null;

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon " + (sizeClass || "icon-sm"));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths;
    return svg;
  }

  function initDataIcons() {
    document.querySelectorAll("[data-icon]").forEach(function (el) {
      if (el.querySelector(".icon")) return;

      var name = el.getAttribute("data-icon");
      var size = el.getAttribute("data-icon-size") || "icon-sm";
      var pos = el.getAttribute("data-icon-pos") || "before";
      var icon = createIcon(name, size);

      if (!icon) return;

      if (pos === "after") {
        el.appendChild(icon);
      } else {
        el.insertBefore(icon, el.firstChild);
      }
    });
  }

  window.WPIcon = createIcon;
  document.addEventListener("DOMContentLoaded", initDataIcons);
})();
