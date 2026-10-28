"use client";

import { useEffect } from "react";

export default function DisableNumberScroll() {
  useEffect(() => {
    const handleWheel = () => {
      if (document.activeElement && document.activeElement.tagName === "INPUT" && (document.activeElement as HTMLInputElement).type === "number") {
        (document.activeElement as HTMLElement).blur();
      }
    };
    // Use passive: false to allow preventDefault if needed, but here we just blur
    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);
  return null;
}