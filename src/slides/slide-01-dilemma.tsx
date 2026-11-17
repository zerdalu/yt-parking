import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { RoadStage } from "@/components/road-stage";
import {
  CarSectionVariants,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  sampleSimulatedTimeline,
  simulateDriverTimeline,
} from "@/simulation/car-simulator";
import { SLIDE_01_DRIVER_SEGMENTS, SLIDE_01_INITIAL_POSE } from "@/simulation/slide-timelines";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

const HAZARD_START_SECONDS = 4.8;
const HAZARD_CYCLE_SECONDS = 0.72;

export function Slide01Dilemma(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  const timeline = useMemo(
    () => simulateDriverTimeline(SLIDE_01_INITIAL_POSE, SLIDE_01_DRIVER_SEGMENTS, 40, DEFAULT_VEHICLE_DIMENSIONS),
    [],
  );

  const pose = sampleSimulatedTimeline(timeline, elapsedSeconds);
  const prevPose = sampleSimulatedTimeline(timeline, Math.max(0, elapsedSeconds - 0.05));

  const isReversing = pose.velocity < -1;
  const isDecelerating = Math.abs(pose.velocity) < Math.abs(prevPose.velocity) - 0.35;
  const isStoppedInManeuver = elapsedSeconds >= 4.7 && Math.abs(pose.velocity) < 1;
  const isBraking = isStoppedInManeuver || isDecelerating;

  const isHazardActive = elapsedSeconds >= HAZARD_START_SECONDS;
  const isHazardLit =
    isHazardActive && (elapsedSeconds - HAZARD_START_SECONDS) % HAZARD_CYCLE_SECONDS < HAZARD_CYCLE_SECONDS * 0.54;

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
