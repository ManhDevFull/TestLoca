"use client";

import { useEffect } from "react";

async function unregisterAllServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export default function RegisterPWA() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void unregisterAllServiceWorkers();
      return;
    }

    if (!window.isSecureContext) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
