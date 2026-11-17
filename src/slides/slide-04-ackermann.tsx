import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

const CAR_SCALE = 1.65;
const BASE_CAR_CENTER_X = 635;
const BASE_CAR_CENTER_Y = 315;
const FULL_LEFT_STEER_DEG = -34;

const ACKERMANN = computeAckermannAngles(FULL_LEFT_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);
const INSIDE_LOCK_DEG = ACKERMANN.frontLeftSteerDeg; // ~ -40.25 deg
const OUTSIDE_LOCK_DEG = ACKERMANN.frontRightSteerDeg; // ~ -29.33 deg
const TURNING_RADIUS_PX = Math.abs(ACKERMANN.turningRadiusSigned ?? 154.19) * CAR_SCALE;

const TURNING_CENTER: Point2D = {
  x: BASE_CAR_CENTER_X - TURNING_RADIUS_PX,
  y: BASE_CAR_CENTER_Y + DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function progressBetween(seconds: number, start: number, end: number): number {
  if (end <= start) {
    return seconds >= end ? 1 : 0;
  }
  return clamp01((seconds - start) / (end - start));
}

function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.55): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotateAroundTurningCenter(localX: number, localY: number, headingDeg: number): Point2D {
  const theta = degToRad(headingDeg);
  const baseWorldX = BASE_CAR_CENTER_X + localX * CAR_SCALE;
  const baseWorldY = BASE_CAR_CENTER_Y + localY * CAR_SCALE;
  const vx = baseWorldX - TURNING_CENTER.x;
  const vy = baseWorldY - TURNING_CENTER.y;

  return {
    x: TURNING_CENTER.x + vx * Math.cos(theta) - vy * Math.sin(theta),
    y: TURNING_CENTER.y + vx * Math.sin(theta) + vy * Math.cos(theta),
  };
}

function buildConcentricArcPath(
  baseLocalX: number,
  baseLocalY: number,
  startHeadingDeg: number,
  endHeadingDeg: number,
): { readonly path: string; readonly radius: number; readonly length: number } {
  const p0 = rotateAroundTurningCenter(baseLocalX, baseLocalY, 0);
  const dx = p0.x - TURNING_CENTER.x;
  const dy = p0.y - TURNING_CENTER.y;
  const radius = Math.hypot(dx, dy);

  const startPt = rotateAroundTurningCenter(baseLocalX, baseLocalY, startHeadingDeg);
  const endPt = rotateAroundTurningCenter(baseLocalX, baseLocalY, endHeadingDeg);
  const sweepSpanRad = Math.abs(degToRad(endHeadingDeg - startHeadingDeg));
  const sweepFlag = endHeadingDeg >= startHeadingDeg ? 1 : 0;

  return {
    path: `M ${startPt.x.toFixed(2)} ${startPt.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)}`,
    radius,
    length: radius * sweepSpanRad,
  };
}

interface SteerAngleCalloutProps {
  readonly hub: Point2D;
  readonly steerDeg: number;
  readonly label: string;
  readonly opacity: number;
  readonly emphasized?: boolean;
}

function SteerAngleCallout({
  hub,
  steerDeg,
  label,
  opacity,
  emphasized = false,
}: SteerAngleCalloutProps): ReactElement | null {
  if (opacity <= 0.01) {
    return null;
  }

  const rayLen = 68;
  const arcRadius = 56;
  const labelRadius = 70;
  const steerRad = degToRad(steerDeg);
  const halfSteerRad = steerRad * 0.5;

  const straightEndX = hub.x;
  const straightEndY = hub.y - rayLen;
  const steeredEndX = hub.x + rayLen * Math.sin(steerRad);
  const steeredEndY = hub.y - rayLen * Math.cos(steerRad);

  const arcStartX = hub.x;
  const arcStartY = hub.y - arcRadius;
  const arcEndX = hub.x + arcRadius * Math.sin(steerRad);
  const arcEndY = hub.y - arcRadius * Math.cos(steerRad);

  const labelX = hub.x + labelRadius * Math.sin(halfSteerRad);
  const labelY = hub.y - labelRadius * Math.cos(halfSteerRad);

  return (
    <g opacity={opacity}>
      <line
        x1={hub.x}
        y1={hub.y}
        x2={straightEndX}
        y2={straightEndY}
        stroke="oklch(0.75 0 0 / 0.5)"
        strokeWidth={1.1}
        strokeDasharray="3 3"
      />
      <line
        x1={hub.x}
        y1={hub.y}
        x2={steeredEndX}
        y2={steeredEndY}
        stroke={emphasized ? "oklch(0.98 0 0 / 0.9)" : "oklch(0.84 0 0 / 0.72)"}
        strokeWidth={1.3}
        strokeDasharray="3 3"
      />
      <path
        d={`M ${arcStartX.toFixed(1)} ${arcStartY.toFixed(1)} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)}`}
        fill="none"
        stroke={emphasized ? "oklch(0.98 0 0)" : "oklch(0.86 0 0 / 0.85)"}
        strokeWidth={emphasized ? 1.8 : 1.35}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        stroke="oklch(0.15 0 0 / 0.94)"
        strokeWidth={4}
        strokeLinejoin="round"
        className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tabular-nums"
      >
        {label}
      </text>
    </g>
  );
}

const ARC_FRONT_INSIDE = buildConcentricArcPath(-31, -52, -32, 34);
const ARC_FRONT_OUTSIDE = buildConcentricArcPath(31, -52, -30, 30);
const ARC_REAR_INSIDE = buildConcentricArcPath(-31, 52, -28, 32);
const ARC_REAR_OUTSIDE = buildConcentricArcPath(31, 52, -26, 28);

export function Slide04Ackermann(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 0 (0.0s - 3.3s): Reverse cleanly into stationary upright pose
  // Beat 4 (35.8s - 39.2s): Rotate smoothly backward around turning center X
  const introProgress = easeInOutCubic(progressBetween(elapsedSeconds, 0.0, 3.1));
  const outroProgress = easeInOutCubic(progressBetween(elapsedSeconds, 35.88, 39.2));

  const headingDeg =
    elapsedSeconds < 3.4 ? -12 * (1 - introProgress) : elapsedSeconds >= 35.88 ? 16 * outroProgress : 0;

  const isReversing =
    (elapsedSeconds > 0.05 && elapsedSeconds < 3.0) || (elapsedSeconds >= 35.88 && elapsedSeconds < 39.1);
  const wheelRollDistance = -TURNING_RADIUS_PX * degToRad(headingDeg);

  // Steering angle choreography:
  // - 0.0s..3.2s: Full Ackermann lock during intro rotation
  // - 3.2s..4.1s: Straighten to 0 deg for rear-wheel segment
  // - 16.2s..18.0s: Both front wheels steer together to outside angle (-29.33 deg)
  // - 23.1s..24.7s: Inside front wheel pivots sharper (-29.33 -> -40.25 deg) to lock onto X
  let frontLeftSteerDeg = 0;
  let frontRightSteerDeg = 0;

  if (elapsedSeconds < 4.2) {
    const straighten = easeInOutCubic(progressBetween(elapsedSeconds, 3.2, 4.1));
    frontLeftSteerDeg = INSIDE_LOCK_DEG * (1 - straighten);
    frontRightSteerDeg = OUTSIDE_LOCK_DEG * (1 - straighten);
  } else if (elapsedSeconds >= 16.2 && elapsedSeconds < 23.1) {
    const pivot = easeInOutCubic(progressBetween(elapsedSeconds, 16.2, 18.0));
    frontLeftSteerDeg = OUTSIDE_LOCK_DEG * pivot;
    frontRightSteerDeg = OUTSIDE_LOCK_DEG * pivot;
  } else if (elapsedSeconds >= 23.1) {
    const insideSharpen = easeInOutCubic(progressBetween(elapsedSeconds, 23.1, 24.7));
    frontLeftSteerDeg = OUTSIDE_LOCK_DEG + (INSIDE_LOCK_DEG - OUTSIDE_LOCK_DEG) * insideSharpen;
    frontRightSteerDeg = OUTSIDE_LOCK_DEG;
  }

  // Exact world positions of car center & all four wheel hubs
  const carCenter = rotateAroundTurningCenter(0, 0, headingDeg);
  const wheelFrontLeft = rotateAroundTurningCenter(-31, -52, headingDeg);
  const wheelFrontRight = rotateAroundTurningCenter(31, -52, headingDeg);
  const wheelRearLeft = rotateAroundTurningCenter(-31, 52, headingDeg);
  const wheelRearRight = rotateAroundTurningCenter(31, 52, headingDeg);

  // Live normal ray intersection for the inside front wheel (demonstrates missing X before sharpening)
  const headingRad = degToRad(headingDeg);
  const insideNormalAngleRad = headingRad + degToRad(frontLeftSteerDeg);
  const insideDirX = -Math.cos(insideNormalAngleRad);
  const insideDirY = -Math.sin(insideNormalAngleRad);
  const insideRaySpan = (TURNING_CENTER.x - wheelFrontLeft.x) / insideDirX;
  const insideRayEnd: Point2D = {
    x: TURNING_CENTER.x,
    y: wheelFrontLeft.y + insideRaySpan * insideDirY,
  };

  // Beat visibility & draw cues aligned to vo-slide-04.json
  // Beat 1: Rear wheels fixed parallel (3.44s - 6.54s) -> Rear axle line extends to X (6.98s - 15.56s)
  const rearParallelOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 3.5, 4.1)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 6.4, 7.2)));

  const rearRayDraw = easeInOutCubic(progressBetween(elapsedSeconds, 7.2, 13.8));
  const rearRayLength = Math.hypot(wheelRearRight.x - TURNING_CENTER.x, wheelRearRight.y - TURNING_CENTER.y);

  const turningCenterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 13.4, 14.3));
  const turningCenterPulse = Math.max(pulseFactor(elapsedSeconds, 15.1, 0.55), pulseFactor(elapsedSeconds, 35.1, 0.6));

  // Beat 2: Tighter inside circle vs wider outside circle (18.0s - 22.5s)
  const innerCircleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 18.4, 20.9));
  const outerCircleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 21.1, 22.4));
  const circleContrastDim = easeInOutCubic(progressBetween(elapsedSeconds, 26.2, 27.6));

  // Inside parallel-steer miss + lateral scrub warning (22.4s - 24.4s)
  const insideRayOpacity = easeOutCubic(progressBetween(elapsedSeconds, 22.4, 23.0));
  const scrubWarningOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 22.5, 23.0)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 23.9, 24.7)));

  // Outside front ray joins in (24.6s - 26.0s) and angle callouts appear
  const outsideRayDraw = easeInOutCubic(progressBetween(elapsedSeconds, 24.4, 25.8));
  const outsideRayLength = Math.hypot(wheelFrontRight.x - TURNING_CENTER.x, wheelFrontRight.y - TURNING_CENTER.y);

  const angleCalloutOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 24.6, 25.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 35.2, 36.0)));

  // Beat 3: All axle lines converge cleanly at X (32.4s - 35.6s) & whole car turns cleanly around X (35.8s+)
  const allAxlesHighlight = easeInOutCubic(progressBetween(elapsedSeconds, 32.4, 34.8));
  const rotationSweepArcsOpacity = easeOutCubic(progressBetween(elapsedSeconds, 35.6, 36.6));
  const rearArcDraw = easeInOutCubic(progressBetween(elapsedSeconds, 35.88, 39.2));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">04</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Ackermann Steering & The Turning Center X
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Ackermann steering geometry showing rear and front wheel axle normals converging at turning center X
        </title>
        <defs>
          <radialGradient id="slide04-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide04-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Stage Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide04-ambient-glow)" />

        {/* ================================================================
            CONCENTRIC TURNING ARCS CENTERED AT X
           ================================================================ */}
        {/* Inside Front Wheel Tighter Circle Arc */}
        {innerCircleDraw > 0.01 ? (
          <path
            d={ARC_FRONT_INSIDE.path}
            fill="none"
            stroke={`oklch(0.95 0 0 / ${(0.82 - 0.32 * circleContrastDim + 0.3 * rotationSweepArcsOpacity).toFixed(2)})`}
            strokeWidth={1.8 - 0.3 * circleContrastDim + 0.4 * rotationSweepArcsOpacity}
            strokeDasharray={ARC_FRONT_INSIDE.length}
            strokeDashoffset={ARC_FRONT_INSIDE.length * (1 - innerCircleDraw)}
            filter={circleContrastDim < 0.3 ? "url(#slide04-luminous-glow)" : undefined}
          />
        ) : null}

        {/* Outside Front Wheel Wider Circle Arc */}
        {outerCircleDraw > 0.01 ? (
          <path
            d={ARC_FRONT_OUTSIDE.path}
            fill="none"
            stroke={`oklch(0.84 0 0 / ${(0.72 - 0.28 * circleContrastDim + 0.28 * rotationSweepArcsOpacity).toFixed(2)})`}
            strokeWidth={1.5 + 0.35 * rotationSweepArcsOpacity}
            strokeDasharray={ARC_FRONT_OUTSIDE.length}
            strokeDashoffset={ARC_FRONT_OUTSIDE.length * (1 - outerCircleDraw)}
          />
        ) : null}

        {/* Rear Wheels Concentric Arcs During Final Rotation Around X */}
        {rotationSweepArcsOpacity > 0.01 ? (
          <g opacity={rotationSweepArcsOpacity}>
            <path
              d={ARC_REAR_INSIDE.path}
              fill="none"
              stroke="oklch(0.78 0 0 / 0.55)"
              strokeWidth={1.3}
              strokeDasharray="4 4"
              opacity={0.4 + 0.6 * rearArcDraw}
            />
            <path
              d={ARC_REAR_OUTSIDE.path}
              fill="none"
              stroke="oklch(0.78 0 0 / 0.55)"
              strokeWidth={1.3}
              strokeDasharray="4 4"
              opacity={0.4 + 0.6 * rearArcDraw}
            />
          </g>
        ) : null}

        {/* ================================================================
            AXLE NORMAL CONVERGENCE RAYS TOWARD X
           ================================================================ */}
        {/* Rear Axle Line Passing Through Both Rear Wheel Hubs to X */}
        {rearRayDraw > 0.01 ? (
          <line
            x1={wheelRearRight.x}
            y1={wheelRearRight.y}
            x2={TURNING_CENTER.x}
            y2={TURNING_CENTER.y}
            stroke={`oklch(0.96 0 0 / ${(0.72 + 0.26 * allAxlesHighlight).toFixed(2)})`}
            strokeWidth={1.55 + 0.65 * allAxlesHighlight}
            strokeDasharray={rearRayDraw < 0.99 ? rearRayLength : "6 4"}
            strokeDashoffset={rearRayDraw < 0.99 ? rearRayLength * (1 - rearRayDraw) : 0}
            filter={allAxlesHighlight > 0.4 ? "url(#slide04-luminous-glow)" : undefined}
          />
        ) : null}

        {/* Inside Front Wheel Normal Ray (Starts Missing X High, Then Sweeps Down onto X) */}
        {insideRayOpacity > 0.01 ? (
          <g opacity={insideRayOpacity}>
            <line
              x1={wheelFrontLeft.x}
              y1={wheelFrontLeft.y}
              x2={insideRayEnd.x}
              y2={insideRayEnd.y}
              stroke={`oklch(0.96 0 0 / ${(0.76 + 0.22 * allAxlesHighlight).toFixed(2)})`}
              strokeWidth={1.55 + 0.65 * allAxlesHighlight}
              strokeDasharray="6 4"
              filter={allAxlesHighlight > 0.4 ? "url(#slide04-luminous-glow)" : undefined}
            />

            {/* Miss-Target Marker Before Inside Wheel Sharpens */}
            {scrubWarningOpacity > 0.02 ? (
              <g opacity={scrubWarningOpacity}>
                <circle
                  cx={insideRayEnd.x}
                  cy={insideRayEnd.y}
                  r={4}
                  fill="none"
                  stroke="oklch(0.86 0.12 25)"
                  strokeWidth={1.5}
                />
                <line
                  x1={insideRayEnd.x}
                  y1={insideRayEnd.y + 8}
                  x2={TURNING_CENTER.x}
                  y2={TURNING_CENTER.y - 24}
                  stroke="oklch(0.86 0.12 25 / 0.75)"
                  strokeWidth={1.2}
                  strokeDasharray="2 3"
                />
              </g>
            ) : null}
          </g>
        ) : null}

        {/* Outside Front Wheel Normal Ray Converging at X */}
        {outsideRayDraw > 0.01 ? (
          <line
            x1={wheelFrontRight.x}
            y1={wheelFrontRight.y}
            x2={TURNING_CENTER.x}
            y2={TURNING_CENTER.y}
            stroke={`oklch(0.94 0 0 / ${(0.68 + 0.28 * allAxlesHighlight).toFixed(2)})`}
            strokeWidth={1.5 + 0.65 * allAxlesHighlight}
            strokeDasharray={outsideRayDraw < 0.99 ? outsideRayLength : "6 4"}
            strokeDashoffset={outsideRayDraw < 0.99 ? outsideRayLength * (1 - outsideRayDraw) : 0}
            filter={allAxlesHighlight > 0.4 ? "url(#slide04-luminous-glow)" : undefined}
          />
        ) : null}

        {/* ================================================================
            TURNING CENTER X NODE
           ================================================================ */}
        {turningCenterOpacity > 0.01 ? (
          <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={turningCenterOpacity}>
            {turningCenterPulse > 0.04 ? (
              <circle
                cx={0}
                cy={0}
                r={20 + 10 * turningCenterPulse}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.4}
                opacity={turningCenterPulse * 0.85}
              />
            ) : null}
            <polygon
              points="0,-20 17.3,-10 17.3,10 0,20 -17.3,10 -17.3,-10"
              fill="oklch(0.24 0 0 / 0.94)"
              stroke="oklch(0.94 0 0 / 0.9)"
              strokeWidth={1.5 + 0.4 * allAxlesHighlight}
            />
            <circle
              cx={0}
              cy={0}
              r={5.5 + 1.5 * turningCenterPulse}
              fill="oklch(0.98 0 0)"
              filter="url(#slide04-luminous-glow)"
            />
            <text
              x={0}
              y={36}
              textAnchor="middle"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
            >
              X
            </text>
          </g>
        ) : null}

        {/* ================================================================
            2D CUT-PLANE SPORTS COUPE
           ================================================================ */}
        <g transform={`translate(${carCenter.x}, ${carCenter.y}) rotate(${headingDeg}) scale(${CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={frontLeftSteerDeg}
            frontRightSteerDeg={frontRightSteerDeg}
            wheelRollDistance={wheelRollDistance}
            isReversing={isReversing}
          />
        </g>

        {/* Rear Fixed Parallel Alignment Brackets (Beat 1: 3.5s - 7.2s) */}
        {rearParallelOpacity > 0.01 ? (
          <g
            opacity={rearParallelOpacity}
            stroke="oklch(0.98 0 0)"
            strokeWidth={1.8}
            filter="url(#slide04-luminous-glow)"
          >
            <line
              x1={wheelRearLeft.x - 16}
              y1={wheelRearLeft.y - 28}
              x2={wheelRearLeft.x - 16}
              y2={wheelRearLeft.y + 28}
            />
            <line
              x1={wheelRearRight.x + 16}
              y1={wheelRearRight.y - 28}
              x2={wheelRearRight.x + 16}
              y2={wheelRearRight.y + 28}
            />
          </g>
        ) : null}

        {/* Sideways Scrub Indicator on Inside Front Tire Before Sharpening */}
        {scrubWarningOpacity > 0.02 ? (
          <g
            opacity={scrubWarningOpacity}
            stroke="oklch(0.86 0.14 25)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line
              x1={wheelFrontLeft.x - 24}
              y1={wheelFrontLeft.y + 6}
              x2={wheelFrontLeft.x - 6}
              y2={wheelFrontLeft.y - 4}
            />
            <polyline
              points={`${wheelFrontLeft.x - 12},${wheelFrontLeft.y - 6} ${wheelFrontLeft.x - 6},${wheelFrontLeft.y - 4} ${wheelFrontLeft.x - 9},${wheelFrontLeft.y + 2}`}
              fill="none"
            />
          </g>
        ) : null}

        {/* Ackermann Angle Comparison Arcs (Inside ~40 deg vs Outside ~29 deg) */}
        <SteerAngleCallout
          hub={wheelFrontLeft}
          steerDeg={frontLeftSteerDeg}
          label={`${Math.round(Math.abs(frontLeftSteerDeg))}°`}
          opacity={angleCalloutOpacity}
          emphasized={true}
        />
        <SteerAngleCallout
          hub={wheelFrontRight}
          steerDeg={frontRightSteerDeg}
          label={`${Math.round(Math.abs(frontRightSteerDeg))}°`}
          opacity={angleCalloutOpacity}
        />

        {/* Wheel Hub Highlight Nodes */}
        {rearRayDraw > 0.05 ? (
          <g fill="oklch(0.98 0 0)">
            <circle cx={wheelRearLeft.x} cy={wheelRearLeft.y} r={3.5} />
            <circle cx={wheelRearRight.x} cy={wheelRearRight.y} r={3.5} />
          </g>
        ) : null}
        {insideRayOpacity > 0.05 ? (
          <circle cx={wheelFrontLeft.x} cy={wheelFrontLeft.y} r={3.8} fill="oklch(0.98 0 0)" />
        ) : null}
        {outsideRayDraw > 0.05 ? (
          <circle cx={wheelFrontRight.x} cy={wheelFrontRight.y} r={3.5} fill="oklch(0.98 0 0)" />
        ) : null}
      </svg>
    </div>
  );
}
