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

const HAZARD_START_SECONDS = 4.6;
const HAZARD_END_SECONDS = 26.2;
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

  const isReversing = pose.velocity < -0.15;
  const isDecelerating = Math.abs(pose.velocity) < Math.abs(prevPose.velocity) - 0.2;
  const isStoppedInManeuver =
    elapsedSeconds >= 4.4 && elapsedSeconds < HAZARD_END_SECONDS && Math.abs(pose.velocity) < 0.8;
  const isBraking = isStoppedInManeuver || isDecelerating;

  const isHazardActive = elapsedSeconds >= HAZARD_START_SECONDS && elapsedSeconds < HAZARD_END_SECONDS;
  const isHazardLit =
    isHazardActive && (elapsedSeconds - HAZARD_START_SECONDS) % HAZARD_CYCLE_SECONDS < HAZARD_CYCLE_SECONDS * 0.54;

  // Clean cross-fade across the reset instant at t = 20.08s
  const fadeOutBeforeReset = 1 - clamp01((elapsedSeconds - 19.8) / 0.25);
  const fadeInAfterReset = clamp01((elapsedSeconds - 20.12) / 0.22);
  const heroOpacity = elapsedSeconds < 20.08 ? fadeOutBeforeReset : fadeInAfterReset;

  // Phase 2 multi-point shuffle trail (13.25s - 19.85s) showing the back-and-forth rear-axle path inching toward the kerb
  const shuffleTrail = useMemo(() => {
    if (elapsedSeconds < 13.25 || elapsedSeconds >= 20.08) {
      return "";
    }
    return buildTrailPolyline(timeline, 13.25, Math.min(elapsedSeconds, 19.85), (s) => ({
      x: s.rearAxleX,
      y: s.rearAxleY,
    }));
  }, [elapsedSeconds, timeline]);

  // Single-sweep luminous arc during Phase 3 (20.35s - 24.3s)
  const sweepTrail = useMemo(() => {
    if (elapsedSeconds < 20.35) {
      return "";
    }
    return buildTrailPolyline(timeline, 20.35, Math.min(elapsedSeconds, 24.3), (s) => s.cornerB);
  }, [elapsedSeconds, timeline]);

  const sweepTrailOpacity =
    elapsedSeconds < 20.35 ? 0 : elapsedSeconds > 27.5 ? Math.max(0.24, 1 - (elapsedSeconds - 27.5) / 1.5) : 0.9;

  // Closing question choreography (28.4s - 35.0s):
  // - 28.4s: "How much extra length," -> Front & rear clearance zones and brackets highlight
  // - 30.3s: "beyond the length of your own car," -> Car-length span L highlights in contrast
  // - 32.0s: "does that parking space actually need?" -> Both extra spans converge into "+ ?" total
  const gapCalloutOpacity = easeOutCubic((elapsedSeconds - 28.4) / 0.8);
  const carLengthOpacity = easeOutCubic((elapsedSeconds - 30.3) / 0.7);
  const totalCalloutOpacity = easeOutCubic((elapsedSeconds - 32.0) / 0.8);

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

        {/* Multi-Point Shuffle Zig-Zag Trace (13.25s - 20.08s) */}
        {shuffleTrail ? (
          <polyline
            points={shuffleTrail}
            fill="none"
            stroke="oklch(0.86 0 0 / 0.72)"
            strokeWidth={1.6}
            strokeDasharray="4 4"
            opacity={fadeOutBeforeReset}
          />
        ) : null}

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

        {/* Front & Rear Extra-Length Highlight and Total Summation (28.4s - 35.0s) */}
        {gapCalloutOpacity > 0.01 ? (
          <g opacity={gapCalloutOpacity}>
            {/* Highlighted Front & Rear Clearance Bands Inside Parking Bay */}
            <rect
              x={589}
              y={179}
              width={76}
              height={42.5}
              rx={3}
              fill="oklch(0.96 0 0 / 0.08)"
              stroke="oklch(0.92 0 0 / 0.35)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={627} y={205} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
              +
            </text>

            <rect
              x={589}
              y={389.5}
              width={76}
              height={42.5}
              rx={3}
              fill="oklch(0.96 0 0 / 0.08)"
              stroke="oklch(0.92 0 0 / 0.35)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={627} y={415.5} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
              +
            </text>

            {/* Bumper Extension Lines to Kerbside Caliper */}
            <g stroke="oklch(0.84 0 0 / 0.65)" strokeWidth={1.15}>
              <line x1={676} y1={179} x2={704} y2={179} />
              <line x1={676} y1={432} x2={704} y2={432} />
            </g>
            <g stroke="oklch(0.76 0 0 / 0.55)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={666} y1={221.5} x2={704} y2={221.5} />
              <line x1={666} y1={389.5} x2={704} y2={389.5} />
            </g>

            {/* Car's Own Length Span L (221.5..389.5) */}
            {carLengthOpacity > 0.01 ? (
              <g opacity={carLengthOpacity}>
                <line
                  x1={698}
                  y1={224}
                  x2={698}
                  y2={387}
                  stroke="oklch(0.76 0 0 / 0.72)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <text
                  x={688}
                  y={309.5}
                  textAnchor="end"
                  stroke="oklch(0.15 0 0 / 0.94)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  className="svg-label-halo fill-text-secondary font-mono text-xs font-semibold"
                >
                  L
                </text>
              </g>
            ) : null}

            {/* Luminous Caliper Brackets for BOTH Front (179..221.5) and Rear (389.5..432) Extra Spaces */}
            <g stroke="oklch(0.98 0 0)" strokeWidth={2.4} strokeLinecap="round" filter="url(#slide01-luminous-glow)">
              <line x1={698} y1={179} x2={698} y2={221.5} />
              <line x1={694} y1={179} x2={702} y2={179} strokeWidth={1.6} />
              <line x1={694} y1={221.5} x2={702} y2={221.5} strokeWidth={1.6} />

              <line x1={698} y1={389.5} x2={698} y2={432} />
              <line x1={694} y1={389.5} x2={702} y2={389.5} strokeWidth={1.6} />
              <line x1={694} y1={432} x2={702} y2={432} strokeWidth={1.6} />
            </g>

            {/* Summation Collector Fork Joining Front & Rear Gaps into Total "+ ?" */}
            {totalCalloutOpacity > 0.01 ? (
              <g opacity={totalCalloutOpacity}>
                <circle cx={703} cy={200.25} r={2.8} fill="oklch(0.98 0 0)" />
                <circle cx={703} cy={410.75} r={2.8} fill="oklch(0.98 0 0)" />

                <path
                  d="M 703 200.25 L 728 200.25 L 728 410.75 L 703 410.75 M 728 305.5 L 744 305.5"
                  fill="none"
                  stroke="oklch(0.92 0 0 / 0.85)"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />

                <rect
                  x={744}
                  y={290.5}
                  width={48}
                  height={30}
                  rx={6}
                  fill="oklch(0.22 0 0 / 0.94)"
                  stroke="oklch(0.96 0 0 / 0.88)"
                  strokeWidth={1.4}
                />
                <text
                  x={768}
                  y={310.5}
                  textAnchor="middle"
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
