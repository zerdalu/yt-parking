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
import { SLIDE_02_DRIVER_SEGMENTS, SLIDE_02_INITIAL_POSE, SLIDE_02_TURNING_CENTER } from "@/simulation/slide-timelines";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

const HAZARD_START_SECONDS = 3.7;
const HAZARD_END_SECONDS = 26.8;
const HAZARD_CYCLE_SECONDS = 0.72;

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

export function Slide02PerfectParking(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  const timeline = useMemo(
    () => simulateDriverTimeline(SLIDE_02_INITIAL_POSE, SLIDE_02_DRIVER_SEGMENTS, 35, DEFAULT_VEHICLE_DIMENSIONS),
    [],
  );

  const pose = sampleSimulatedTimeline(timeline, elapsedSeconds);
  const prevPose = sampleSimulatedTimeline(timeline, Math.max(0, elapsedSeconds - 0.05));

  const isReversing = pose.velocity < -1;
  const isDecelerating = Math.abs(pose.velocity) < Math.abs(prevPose.velocity) - 0.25;
  const isStoppedInManeuver =
    elapsedSeconds >= 3.6 && elapsedSeconds < HAZARD_END_SECONDS && Math.abs(pose.velocity) < 0.8;
  const isBraking = isStoppedInManeuver || isDecelerating;

  const isHazardActive = elapsedSeconds >= HAZARD_START_SECONDS && elapsedSeconds < HAZARD_END_SECONDS;
  const isHazardLit =
    isHazardActive && (elapsedSeconds - HAZARD_START_SECONDS) % HAZARD_CYCLE_SECONDS < HAZARD_CYCLE_SECONDS * 0.54;

  // Phase 1 geometry illuminates right before "You reverse into the space at full steering lock..." (12.64s)
  const showPhase1Geometry = elapsedSeconds >= 11.4;
  const showPhase1Rays = elapsedSeconds >= 11.8 && elapsedSeconds < 21.6 && pose.steerDeg < -5;
  const showPhase2Vector = elapsedSeconds >= 23.4;
  const isClosingHighlight = elapsedSeconds >= 29.2;

  const showReverseTargetGhost = elapsedSeconds >= 11.4 && elapsedSeconds < 19.9;

  const phase1Trails = useMemo(() => {
    if (!showPhase1Geometry) {
      return { rearKerbTrail: "", cornerKerbTrail: "" };
    }
    const trailEnd = Math.min(elapsedSeconds, 20.0);
    return {
      rearKerbTrail: buildTrailPolyline(timeline, 12.4, trailEnd, (s) => s.wheelRearRight),
      cornerKerbTrail: buildTrailPolyline(timeline, 12.4, trailEnd, (s) => s.cornerB),
    };
  }, [elapsedSeconds, showPhase1Geometry, timeline]);

  // Straight forward pull-up runs 23.4s - 26.4s ("and drive straight forward into the middle of the space.")
  const phase2Progress = Math.max(0, Math.min(1, (elapsedSeconds - 23.4) / 3.0));
  const phase2ArrowEndY = 250 - 28.5 * phase2Progress;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">02</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Defining Perfect Parking
        </h1>
      </div>

      {/* Two-Phase Perfect Parking Stage */}
      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>Two-phase perfect parking trajectory: full-lock reverse sweep and straight forward pull-up</title>
        <defs>
          <radialGradient id="stage-ambient-glow" cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.52)" />
            <stop offset="60%" stopColor="oklch(0.2 0 0 / 0.22)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="luminous-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
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
        <RoadStage showTangentGuide={showPhase1Geometry} />

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

        {/* Front Corner Grazing Node G(589, 179) */}
        {showPhase1Geometry ? (
          <circle cx={589} cy={179} r={4} fill="oklch(0.98 0 0)" filter="url(#luminous-glow)" />
        ) : null}

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

        {/* Ghost Outline Showing Exact Parallel Stop Point at End of Phase 1 (Center 627, 334) */}
        {showReverseTargetGhost ? (
          <g transform="translate(627, 334)" opacity={0.75}>
            <CutPlaneCar
              variant={CarSectionVariants.Ghost}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        ) : null}

        {/* Phase 1 Trajectory Diagram: Turning Center X, Concentric Guides & Single Continuous Arc */}
        {showPhase1Geometry ? (
          <g>
            {/* Concentric Turning Reference Rings Centered at X */}
            <g
              stroke={isClosingHighlight ? "oklch(0.76 0 0 / 0.34)" : "oklch(0.6 0 0 / 0.16)"}
              strokeWidth={1}
              fill="none"
            >
              <circle cx={SLIDE_02_TURNING_CENTER.x} cy={SLIDE_02_TURNING_CENTER.y} r={191.22} strokeDasharray="3 7" />
              <circle cx={SLIDE_02_TURNING_CENTER.x} cy={SLIDE_02_TURNING_CENTER.y} r={240.39} strokeDasharray="2 6" />
            </g>

            {/* Hexagonal Turning Center X(466.78, 386) */}
            <g transform={`translate(${SLIDE_02_TURNING_CENTER.x}, ${SLIDE_02_TURNING_CENTER.y})`}>
              <polygon
                points="0,-20 17.3,-10 17.3,10 0,20 -17.3,10 -17.3,-10"
                fill="oklch(0.25 0 0 / 0.92)"
                stroke="oklch(0.86 0 0 / 0.85)"
                strokeWidth={1.4}
              />
              <circle cx={0} cy={0} r={6} fill="oklch(0.98 0 0)" filter="url(#luminous-glow)" />
              <text x={0} y={36} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                X
              </text>
            </g>

            {/* Live Ackermann Convergence Rays to Turning Center X */}
            {showPhase1Rays ? (
              <g stroke="oklch(0.82 0 0 / 0.5)" strokeWidth={1.15} strokeDasharray="4 4">
                <line
                  x1={pose.wheelRearRight.x}
                  y1={pose.wheelRearRight.y}
                  x2={SLIDE_02_TURNING_CENTER.x}
                  y2={SLIDE_02_TURNING_CENTER.y}
                />
                <line
                  x1={pose.wheelE.x}
                  y1={pose.wheelE.y}
                  x2={SLIDE_02_TURNING_CENTER.x}
                  y2={SLIDE_02_TURNING_CENTER.y}
                />
                <line
                  x1={pose.wheelFrontRight.x}
                  y1={pose.wheelFrontRight.y}
                  x2={SLIDE_02_TURNING_CENTER.x}
                  y2={SLIDE_02_TURNING_CENTER.y}
                />
              </g>
            ) : null}

            {/* Phase 1 Rear-Wheel Dashed Circle Arc */}
            {phase1Trails.rearKerbTrail ? (
              <polyline
                points={phase1Trails.rearKerbTrail}
                fill="none"
                stroke="oklch(0.76 0 0 / 0.68)"
                strokeWidth={1.6}
                strokeDasharray="5 4"
              />
            ) : null}

            {/* Phase 1 Luminous Outer Grazing Arc */}
            {phase1Trails.cornerKerbTrail ? (
              <polyline
                points={phase1Trails.cornerKerbTrail}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={isClosingHighlight ? 2.8 : 2.2}
                filter="url(#luminous-glow)"
              />
            ) : null}

            {/* Minimalist Phase 01 Tag */}
            {elapsedSeconds >= 12.4 ? (
              <text
                x={482}
                y={214}
                textAnchor="end"
                className="fill-text-primary font-mono text-xs font-semibold tracking-mono"
              >
                PHASE 01
              </text>
            ) : null}
          </g>
        ) : null}

        {/* Phase 2 Trajectory Vector: Straight Forward Pull-Up into Bay Center */}
        {showPhase2Vector ? (
          <g opacity={isClosingHighlight ? 0.28 : 1}>
            <line x1={686} y1={250} x2={706} y2={250} stroke="oklch(0.84 0 0 / 0.7)" strokeWidth={1.2} />
            <line
              x1={696}
              y1={250}
              x2={696}
              y2={phase2ArrowEndY}
              stroke="oklch(0.96 0 0)"
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            {phase2Progress > 0.2 ? (
              <polyline
                points={`692,${phase2ArrowEndY + 5} 696,${phase2ArrowEndY} 700,${phase2ArrowEndY + 5}`}
                fill="none"
                stroke="oklch(0.96 0 0)"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            <text
              x={716}
              y={239}
              textAnchor="start"
              className="fill-text-secondary font-mono text-xs font-semibold tracking-mono"
            >
              PHASE 02
            </text>
          </g>
        ) : null}

        {/* Hero Car Driven by the 2D Simulator */}
        <g transform={`translate(${pose.centerX}, ${pose.centerY}) rotate(${pose.headingDeg})`}>
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
