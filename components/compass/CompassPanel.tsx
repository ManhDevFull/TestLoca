"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SensorPermissionState } from "@/utils/permissions";
import styles from "@/app/page.module.css";

const DIRECTION_LABELS = [
  "Bắc",
  "Đông Bắc",
  "Đông",
  "Đông Nam",
  "Nam",
  "Tây Nam",
  "Tây",
  "Tây Bắc",
];

const FILTER_ALPHA_SLOW = 0.1;
const FILTER_ALPHA_MEDIUM = 0.22;
const FILTER_ALPHA_FAST = 0.36;
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

function toCardinalDirection(heading: number | null): string {
  if (heading === null) {
    return "Không xác định";
  }

  const normalizedHeading = normalizeDegrees(heading);
  const index = Math.round(normalizedHeading / 45) % 8;

  return DIRECTION_LABELS[index];
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

    const onOrientation = (event: DeviceOrientationEvent) => {
      const rawHeading = computeTiltCompensatedHeading(
        event as OrientationEventWithWebkit,
      );

      if (rawHeading === null) {
        return;
      }

      const previousFiltered = filteredHeadingRef.current;

      if (previousFiltered === null) {
        filteredHeadingRef.current = rawHeading;
        targetHeadingRef.current = rawHeading;
        return;
      }

      const delta = shortestAngleDelta(previousFiltered, rawHeading);
      const absDelta = Math.abs(delta);

      const alpha =
        absDelta > 20
          ? FILTER_ALPHA_FAST
          : absDelta > 7
            ? FILTER_ALPHA_MEDIUM
            : FILTER_ALPHA_SLOW;

      const filtered = normalizeDegrees(previousFiltered + delta * alpha);
      filteredHeadingRef.current = filtered;
      targetHeadingRef.current = filtered;
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

        const maxStep = Math.max(0.9, (dt / 1000) * 58);
        const limitedStep = Math.max(-maxStep, Math.min(maxStep, delta));

        if (absDelta > 0.04) {
          next = normalizeDegrees(next + limitedStep);
          displayedHeadingRef.current = next;
          roseElement.style.transform = `rotate(${-next}deg)`;
        }

        if (time - displayCommitRef.current >= DISPLAY_COMMIT_INTERVAL) {
          displayCommitRef.current = time;
          setDisplayHeading(roundHeading(next));
        }
      }

      rafIdRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener(
      "deviceorientationabsolute",
      onOrientation as EventListener,
      true,
    );

    rafIdRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener(
        "deviceorientationabsolute",
        onOrientation as EventListener,
        true,
      );

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
        <strong>{readoutHeading === null ? "--.-°" : `${readoutHeading.toFixed(1)}°`}</strong>
        <span>{toCardinalDirection(readoutHeading)}</span>
      </div>
    </section>
  );
}

function roundHeading(value: number): number {
  return Number(value.toFixed(1));
}
