import { useEffect, useRef, useState } from "react";

// Orkestro logo (mark + wordmark). Two PNGs in /public: the white-wordmark
// version for dark surfaces and a navy-wordmark version for light ones. The
// variant follows the surface the logo actually sits on (theme + workspace
// look), re-checked whenever the theme or workspace attributes change.
function isDarkSurface(el) {
  const bg = getComputedStyle(el).getPropertyValue("--paper-bright").trim();
  const m = bg.match(/^#([0-9a-f]{6})$/i);
  if (!m) return document.documentElement.dataset.theme === "dark";
  const n = parseInt(m[1], 16);
  const lum = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 128;
}

export function OrkestroLogo({ width = 132, style }) {
  const ref = useRef(null);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => { if (ref.current) setDark(isDarkSurface(ref.current)); };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["data-theme", "data-workspace-look", "class"] });
    return () => obs.disconnect();
  }, []);
  return (
    <img
      ref={ref}
      src={dark ? "/orkestro-logo-light.png" : "/orkestro-logo-dark.png"}
      alt="Orkestro"
      width={width}
      height={Math.round(width * 233 / 266)}
      style={{ display: "block", margin: "0 auto 18px", ...style }}
    />
  );
}
