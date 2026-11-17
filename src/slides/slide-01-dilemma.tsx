import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { RoadStage } from "@/components/road-stage";
import {
  CarSectionVariants,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  sampleSimulatedTimeline,
  simulateDriverTimeline,
  type Point2D,
  type SimulatedTimeline,
  type VehiclePoseSnapshot,
} from "@/simulation/car-simulator";
import { SLIDE_01_DRIVER_SEGMENTS, SLIDE_01_INITIAL_POSE } from "@/simulation/slide-timelines";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

const HAZARD_START_SECONDS = 4.8;
const HAZARD_END_SECONDS = 26.6;
const HAZARD_CYCLE_SECONDS = 0.72;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function buildTrailPolyline(
  timeline: SimulatedTimeline,
  startSeconds: number,
  endSeconds: number,
  selector: (snap: VehiclePoseSnapshot) => Point2D,
): string {
  if (endSeconds <= startSeconds) {
    return "";
  }
  const minStep = Math.max(0, Math.round(startSeconds / timeline.stepSeconds));
  const maxStep = Math.min(timeline.snapshots.length - 1, Math.round(endSeconds / timeline.stepSeconds));
  const points: string[] = [];

  for (let i = minStep; i <= maxStep; i += 3) {
    const snap = timeline.snapshots[i];
    if (snap) {
      const pt = selector(snap);
      points.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    }
  }
  return points.join(" ");
}

export function Slide01Dilemma(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  const timeline = useMemo(
    () => simulateDriverTimeline(SLIDE_01_INITIAL_POSE, SLIDE_01_DRIVER_SEGMENTS, 36, DEFAULT_VEHICLE_DIMENSIONS),
    [],
  );

  const pose = sampleSimulatedTimeline(timeline, elapsedSeconds);
  const prevPose = sampleSimulatedTimeline(timeline, Math.max(0, elapsedSeconds - 0.05));

  const isReversing = pose.velocity < -1;
  const isDecelerating = Math.abs(pose.velocity) < Math.abs(prevPose.velocity) - 0.35;
  const isStoppedInManeuver =
    elapsedSeconds >= 4.7 && elapsedSeconds < HAZARD_END_SECONDS && Math.abs(pose.velocity) < 1;
  const isBraking = isStoppedInManeuver || isDecelerating;

  const isHazardActive = elapsedSeconds >= HAZARD_START_SECONDS && elapsedSeconds < HAZARD_END_SECONDS;
  const isHazardLit =
    isHazardActive && (elapsedSeconds - HAZARD_START_SECONDS) % HAZARD_CYCLE_SECONDS < HAZARD_CYCLE_SECONDS * 0.54;

  // Clean cross-fade across the reset instant at t = 20.08s
  const fadeOutBeforeReset = 1 - clamp01((elapsedSeconds - 19.8) / 0.25);
  const fadeInAfterReset = clamp01((elapsedSeconds - 20.12) / 0.25);
  const heroOpacity = elapsedSeconds < 20.08 ? fadeOutBeforeReset : fadeInAfterReset;

  // Single-sweep luminous arc during 20.45s - 24.4s
  const sweepTrail = useMemo(() => {
    if (elapsedSeconds < 20.45) {
      return "";
    }
    return buildTrailPolyline(timeline, 20.45, Math.min(elapsedSeconds, 24.4), (s) => s.cornerB);
  }, [elapsedSeconds, timeline]);

  const sweepTrailOpacity =
    elapsedSeconds < 20.45 ? 0 : elapsedSeconds > 27.5 ? Math.max(0.24, 1 - (elapsedSeconds - 27.5) / 1.5) : 0.9;

  // Extra-length question callout during 28.4s - 35.0s ("How much extra length, beyond the length of your own car...")
  const gapCalloutOpacity = easeOutCubic((elapsedSeconds - 28.4) / 0.9);
  const extraSpanOpacity = easeOutCubic((elapsedSeconds - 30.2) / 0.9);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">01</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          The Geometry of Perfect Parking
        </h1>
      </div>

      {/* Pure Road & Cars Intro Stage */}
      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>Top-down physical simulation of right-hand traffic parallel parking struggles</title>
        <defs>
          <radialGradient id="stage-ambient-glow" cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.52)" />
            <stop offset="60%" stopColor="oklch(0.2 0 0 / 0.22)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide01-luminous-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Stage Halo */}
        <circle cx={480} cy={310} r={310} fill="url(#stage-ambient-glow)" />

        {/* Architectural Right-Hand Traffic Road Stage */}
        <RoadStage showTangentGuide={false} />

        {/* Parked Car in Front */}
        <g transform="translate(627, 95)">
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Parked Car Behind */}
        <g transform="translate(627, 516)">
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Smooth Single-Sweep Arc Trail */}
        {sweepTrail ? (
          <polyline
            points={sweepTrail}
            fill="none"
            stroke="oklch(0.96 0 0)"
            strokeWidth={2}
            opacity={sweepTrailOpacity}
            filter="url(#slide01-luminous-glow)"
          />
        ) : null}

        {/* Minimalist Extra-Length Bracket Along Kerb Side (28.4s - 35.0s) */}
        {gapCalloutOpacity > 0.01 ? (
          <g opacity={gapCalloutOpacity}>
            {/* Front & Rear Bay Boundary Extensions */}
            <g stroke="oklch(0.86 0 0 / 0.65)" strokeWidth={1.2}>
              <line x1={676} y1={179} x2={710} y2={179} />
              <line x1={676} y1={432} x2={710} y2={432} />
            </g>

            {/* Full Bay Height Hairline */}
            <line x1={700} y1={179} x2={700} y2={432} stroke="oklch(0.62 0 0 / 0.45)" strokeWidth={1.2} />

            {/* Car Length Span Sub-Markers (168px centered at y = 305.5 -> 221.5..389.5) */}
            <g stroke="oklch(0.74 0 0 / 0.65)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={672} y1={221.5} x2={704} y2={221.5} />
              <line x1={672} y1={389.5} x2={704} y2={389.5} />
            </g>

            {/* Luminous Highlight on the Extra Margin Beyond the Car's Own Length */}
            {extraSpanOpacity > 0.01 ? (
              <g opacity={extraSpanOpacity}>
                <line
                  x1={700}
                  y1={179}
                  x2={700}
                  y2={221.5}
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={2.4}
                  filter="url(#slide01-luminous-glow)"
                />
                <line
                  x1={700}
                  y1={389.5}
                  x2={700}
                  y2={432}
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={2.4}
                  filter="url(#slide01-luminous-glow)"
                />
                <text
                  x={716}
                  y={204}
                  textAnchor="start"
                  className="fill-text-primary font-mono text-sm font-semibold tracking-mono"
                >
                  + ?
                </text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* Hero Car Driven by the 2D Simulator */}
        <g transform={`translate(${pose.centerX}, ${pose.centerY}) rotate(${pose.headingDeg})`} opacity={heroOpacity}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
            frontLeftSteerDeg={pose.frontLeftSteerDeg}
            frontRightSteerDeg={pose.frontRightSteerDeg}
            wheelRollDistance={pose.wheelRollDistance}
            isHazardLit={isHazardLit}
            isReversing={isReversing}
            isBraking={isBraking}
          />
        </g>
      </svg>
    </div>
  );
}
