"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SensorPermissionState } from "@/utils/permissions";
import styles from "@/app/page.module.css";

const FILTER_ALPHA_SLOW = 0.08;
const FILTER_ALPHA_MEDIUM = 0.18;
const FILTER_ALPHA_FAST = 0.33;
const SOURCE_DEADBAND = 0.35;
const ACCURACY_REJECT_THRESHOLD = 35;
const DISPLAY_COMMIT_INTERVAL = 110;

interface CompassPanelProps {
  canReadSensors: boolean;
  permissionState: SensorPermissionState;
}

type OrientationEventWithWebkit = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function readScreenOrientationAngle(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const orientationAngle =
    window.screen.orientation?.angle ??
    (window as Window & { orientation?: number }).orientation ??
    0;

  return typeof orientationAngle === "number" ? orientationAngle : 0;
}

function computeTiltCompensatedHeading(
  event: OrientationEventWithWebkit,
): number | null {
  if (
    typeof event.webkitCompassHeading === "number" &&
    !Number.isNaN(event.webkitCompassHeading)
  ) {
    return normalizeDegrees(event.webkitCompassHeading);
  }

  if (
    typeof event.alpha !== "number" ||
    typeof event.beta !== "number" ||
    typeof event.gamma !== "number"
  ) {
    return null;
  }

  const alpha = (event.alpha * Math.PI) / 180;
  const beta = (event.beta * Math.PI) / 180;
  const gamma = (event.gamma * Math.PI) / 180;

  const cA = Math.cos(alpha);
  const sA = Math.sin(alpha);
  const sB = Math.sin(beta);
  const cG = Math.cos(gamma);
  const sG = Math.sin(gamma);

  const vx = -cA * sG - sA * sB * cG;
  const vy = -sA * sG + cA * sB * cG;

  if (Math.abs(vx) < 1e-6 && Math.abs(vy) < 1e-6) {
    return null;
  }

  let heading = Math.atan2(vx, vy) * (180 / Math.PI);
  heading = normalizeDegrees(heading - readScreenOrientationAngle());

  return heading;
}

export default function CompassPanel({
  canReadSensors,
  permissionState,
}: CompassPanelProps) {
  const roseRef = useRef<HTMLDivElement>(null);
  const targetHeadingRef = useRef<number | null>(null);
  const filteredHeadingRef = useRef<number | null>(null);
  const displayedHeadingRef = useRef<number | null>(null);
  const displayCommitRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastAnimationTimeRef = useRef(0);

  const [displayHeading, setDisplayHeading] = useState<number | null>(null);

  const ticks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        degree: index * 10,
        major: index % 3 === 0,
      })),
    [],
  );

  useEffect(() => {
    const roseElement = roseRef.current;

    if (!roseElement) {
      return;
    }

    roseElement.style.transform = "rotate(0deg)";
    targetHeadingRef.current = null;
    filteredHeadingRef.current = null;
    displayedHeadingRef.current = null;

    if (!canReadSensors || permissionState !== "granted" || typeof window === "undefined") {
      return;
    }

    let stopped = false;
    let orientationCleanup: (() => void) | null = null;
    let nativeWatchId: string | null = null;
    let fallbackTimerId: number | null = null;

    const updateTargetHeading = (
      rawHeading: number,
      headingAccuracy?: number,
    ) => {
      if (
        typeof headingAccuracy === "number" &&
        Number.isFinite(headingAccuracy) &&
        headingAccuracy > ACCURACY_REJECT_THRESHOLD
      ) {
        return;
      }

      const normalized = normalizeDegrees(rawHeading);
      const previousFiltered = filteredHeadingRef.current;

      if (previousFiltered === null) {
        filteredHeadingRef.current = normalized;
        targetHeadingRef.current = normalized;
        return;
      }

      const delta = shortestAngleDelta(previousFiltered, normalized);
      const absDelta = Math.abs(delta);

      if (absDelta < SOURCE_DEADBAND) {
        return;
      }

      let alpha =
        absDelta > 20
          ? FILTER_ALPHA_FAST
          : absDelta > 7
            ? FILTER_ALPHA_MEDIUM
            : FILTER_ALPHA_SLOW;

      if (
        typeof headingAccuracy === "number" &&
        Number.isFinite(headingAccuracy) &&
        headingAccuracy > 0
      ) {
        const penalty = Math.min(0.45, headingAccuracy / 100);
        alpha *= 1 - penalty;
      }

      const filtered = normalizeDegrees(previousFiltered + delta * alpha);
      filteredHeadingRef.current = filtered;
      targetHeadingRef.current = filtered;
    };

    const startWebOrientationFallback = () => {
      if (orientationCleanup || stopped) {
        return;
      }

      const onOrientation = (event: DeviceOrientationEvent) => {
        const rawHeading = computeTiltCompensatedHeading(
          event as OrientationEventWithWebkit,
        );

        if (rawHeading === null) {
          return;
        }

        updateTargetHeading(rawHeading);
      };

      window.addEventListener("deviceorientation", onOrientation, true);
      window.addEventListener(
        "deviceorientationabsolute",
        onOrientation as EventListener,
        true,
      );

      orientationCleanup = () => {
        window.removeEventListener("deviceorientation", onOrientation, true);
        window.removeEventListener(
          "deviceorientationabsolute",
          onOrientation as EventListener,
          true,
        );
      };
    };

    const startNativeCompass = (): boolean => {
      if (!navigator.compass?.watchHeading || stopped) {
        return false;
      }

      nativeWatchId = navigator.compass.watchHeading(
        (heading) => {
          const hasTrueHeading =
            typeof heading.trueHeading === "number" &&
            Number.isFinite(heading.trueHeading) &&
            heading.trueHeading >= 0;

          const baseHeading = hasTrueHeading
            ? heading.trueHeading
            : heading.magneticHeading;

          updateTargetHeading(baseHeading, heading.headingAccuracy);
        },
        () => {
          startWebOrientationFallback();
        },
        {
          frequency: 70,
        },
      );

      return true;
    };

    const animate = (time: number) => {
      const previousTime = lastAnimationTimeRef.current || time;
      const dt = Math.max(8, Math.min(40, time - previousTime));
      lastAnimationTimeRef.current = time;

      const target = targetHeadingRef.current;
      const current = displayedHeadingRef.current;

      if (target !== null) {
        let next = current === null ? target : current;
        const delta = shortestAngleDelta(next, target);
        const absDelta = Math.abs(delta);

        const maxSpeedDegPerSec =
          absDelta > 45 ? 220 : absDelta > 20 ? 155 : absDelta > 8 ? 108 : 72;
        const maxStep = Math.max(0.8, (dt / 1000) * maxSpeedDegPerSec);
        const limitedStep = Math.max(-maxStep, Math.min(maxStep, delta));

        if (absDelta > 0.04) {
          next = normalizeDegrees(next + limitedStep);
          displayedHeadingRef.current = next;
          roseElement.style.transform = `rotate(${-next}deg)`;
        } else {
          displayedHeadingRef.current = target;
          roseElement.style.transform = `rotate(${-target}deg)`;
        }

        if (time - displayCommitRef.current >= DISPLAY_COMMIT_INTERVAL) {
          displayCommitRef.current = time;
          const headingForReadout = Math.round(displayedHeadingRef.current ?? next);
          setDisplayHeading((previousValue) =>
            previousValue === headingForReadout ? previousValue : headingForReadout,
          );
        }
      }

      rafIdRef.current = window.requestAnimationFrame(animate);
    };

    const onDeviceReady = () => {
      if (!startNativeCompass()) {
        startWebOrientationFallback();
      }
    };

    if (Capacitor.isNativePlatform()) {
      if (!startNativeCompass()) {
        document.addEventListener("deviceready", onDeviceReady, { once: true });
        fallbackTimerId = window.setTimeout(() => {
          if (!nativeWatchId && !orientationCleanup) {
            startWebOrientationFallback();
          }
        }, 1500);
      }
    } else {
      startWebOrientationFallback();
    }

    rafIdRef.current = window.requestAnimationFrame(animate);

    return () => {
      stopped = true;
      document.removeEventListener("deviceready", onDeviceReady);

      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
      }

      if (nativeWatchId && navigator.compass?.clearWatch) {
        navigator.compass.clearWatch(nativeWatchId);
      }

      orientationCleanup?.();

      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [canReadSensors, permissionState]);

  const readoutHeading =
    canReadSensors && permissionState === "granted" ? displayHeading : null;

  return (
    <section className={styles.compassSection}>
      <div className={styles.compassBody}>
        <div className={styles.forwardMarker} aria-hidden="true" />

        <div ref={roseRef} className={styles.roseLayer} aria-label="La bàn">
          {ticks.map((tick) => (
            <span
              key={tick.id}
              className={`${styles.tick} ${tick.major ? styles.tickMajor : ""}`}
              style={{ transform: `translate(-50%, -100%) rotate(${tick.degree}deg)` }}
            />
          ))}

          <span className={`${styles.cardinal} ${styles.north}`}>B</span>
          <span className={`${styles.cardinal} ${styles.east}`}>Đ</span>
          <span className={`${styles.cardinal} ${styles.south}`}>N</span>
          <span className={`${styles.cardinal} ${styles.west}`}>T</span>
        </div>

        <div className={styles.centerPoint} />
      </div>

      <div className={styles.headingReadout}>
        <strong>{readoutHeading === null ? "--°" : `${readoutHeading}°`}</strong>
        <span>Độ phương vị</span>
      </div>
    </section>
  );
}
