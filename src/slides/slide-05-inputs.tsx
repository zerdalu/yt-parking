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

const CAR_SCALE = 1.48;
const HERO_CENTER_X = 630;
const HERO_CENTER_Y = 425;

// Exact canonical Blackburn geometry scaled to 1.48x (r = |EX|, l = |EF|, k = |AE|, w = |GH|)
const HALF_WIDTH = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * CAR_SCALE; // 56.24
const HALF_LENGTH = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * CAR_SCALE; // 124.32
const WHEEL_OFFSET_X = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE; // 45.88
const WHEEL_OFFSET_Y = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE; // 76.96

const KERB_X = HERO_CENTER_X + HALF_WIDTH; // 686.24
const ROAD_X = HERO_CENTER_X - HALF_WIDTH; // 573.76
const WHEEL_KERB_X = HERO_CENTER_X + WHEEL_OFFSET_X; // 675.88

const HERO_TOP_Y = HERO_CENTER_Y - HALF_LENGTH; // 300.68
const FRONT_AXLE_Y = HERO_CENTER_Y - WHEEL_OFFSET_Y; // 348.04
const REAR_AXLE_Y = HERO_CENTER_Y + WHEEL_OFFSET_Y; // 501.96

const TURNING_CENTER: Point2D = {
  x: 360,
  y: REAR_AXLE_Y,
};

// Exact virtual steering angle so outside front wheel E aligns cleanly with X(360, 501.96)
const CENTER_STEER_DEG = -((Math.atan2(WHEEL_OFFSET_Y * 2, HERO_CENTER_X - TURNING_CENTER.x) * 180) / Math.PI);
const ACKERMANN = computeAckermannAngles(CENTER_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

// Front parked car positioned at exact Blackburn critical clearance |AH| = 113.24px
const FRONT_CAR_REAR_Y = 187.44;
const FRONT_CAR_CENTER_Y = FRONT_CAR_REAR_Y - HALF_LENGTH; // 63.12

const POINT_A: Point2D = { x: KERB_X, y: HERO_TOP_Y };
const POINT_E: Point2D = { x: WHEEL_KERB_X, y: FRONT_AXLE_Y };
const POINT_F: Point2D = { x: WHEEL_KERB_X, y: REAR_AXLE_Y };
const POINT_G: Point2D = { x: ROAD_X, y: FRONT_CAR_REAR_Y };
const POINT_H: Point2D = { x: KERB_X, y: FRONT_CAR_REAR_Y };

const RADIUS_EX = Math.hypot(POINT_E.x - TURNING_CENTER.x, POINT_E.y - TURNING_CENTER.y); // 351.39
const CALIPER_X = 722;
const KERB_STONE_X = 689;
const PAVING_JOINTS_Y = [90, 178, 266, 354, 442, 530] as const;
const KERB_JOINTS_Y = [70, 150, 230, 310, 390, 470, 550] as const;

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

function buildTurningArcThroughE(): { readonly path: string; readonly length: number } {
  const angleE = Math.atan2(POINT_E.y - TURNING_CENTER.y, POINT_E.x - TURNING_CENTER.x);
  const startAngle = angleE - (34 * Math.PI) / 180;
  const endAngle = angleE + (24 * Math.PI) / 180;
  const sx = TURNING_CENTER.x + RADIUS_EX * Math.cos(startAngle);
  const sy = TURNING_CENTER.y + RADIUS_EX * Math.sin(startAngle);
  const ex = TURNING_CENTER.x + RADIUS_EX * Math.cos(endAngle);
  const ey = TURNING_CENTER.y + RADIUS_EX * Math.sin(endAngle);
  return {
    path: `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${RADIUS_EX.toFixed(2)} ${RADIUS_EX.toFixed(2)} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`,
    length: RADIUS_EX * (endAngle - startAngle),
  };
}

const TURNING_ARC_E = buildTurningArcThroughE();

interface PointNodeProps {
  readonly point: Point2D;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly opacity: number;
  readonly pulse: number;
}

function PointNode({ point, label, labelX, labelY, textAnchor, opacity, pulse }: PointNodeProps): ReactElement | null {
  if (opacity <= 0.01) {
    return null;
  }

  return (
    <g opacity={opacity}>
      {pulse > 0.04 ? (
        <circle
          cx={point.x}
          cy={point.y}
          r={7 + 7 * pulse}
          fill="none"
          stroke="oklch(0.98 0 0)"
          strokeWidth={1.3}
          opacity={pulse * 0.85}
        />
      ) : null}
      <circle
        cx={point.x}
        cy={point.y}
        r={3.5 + 1.8 * pulse}
        fill="oklch(0.98 0 0)"
        filter={pulse > 0.1 ? "url(#slide05-luminous-glow)" : undefined}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        stroke="oklch(0.15 0 0 / 0.94)"
        strokeWidth={4.5}
        strokeLinejoin="round"
        className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
      >
        {label}
      </text>
    </g>
  );
}

export function Slide05Inputs(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Intro (0.0s - 6.6s): Schematic fades in & wheels steer cleanly into Ackermann lock
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 1.2));
  const steerLock = easeInOutCubic(progressBetween(elapsedSeconds, 1.4, 3.6));
  const frontLeftSteerDeg = ACKERMANN.frontLeftSteerDeg * steerLock;
  const frontRightSteerDeg = ACKERMANN.frontRightSteerDeg * steerLock;

  // Beat 1 (7.1s - 15.5s): r = |EX| (kerb-to-kerb turning circle radius from E to X)
  const rDraw = easeInOutCubic(progressBetween(elapsedSeconds, 7.4, 9.6));
  const rCircleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 9.8, 12.2));
  const rFocus = pulseFactor(elapsedSeconds, 11.4, 4.2);

  // Beat 2 (16.2s - 21.1s): l = |EF| (wheelbase between E and F)
  const lDraw = easeInOutCubic(progressBetween(elapsedSeconds, 16.5, 18.2));
  const lFocus = pulseFactor(elapsedSeconds, 18.8, 2.8);

  // Beat 3 (21.7s - 27.3s): k = |AE| (front overhang from E to corner A)
  const kDraw = easeInOutCubic(progressBetween(elapsedSeconds, 22.0, 23.6));
  const kFocus = pulseFactor(elapsedSeconds, 24.6, 2.8);

  // Beat 4 (27.3s - 32.9s): w = |GH| (width of parked car in front)
  const wDraw = easeInOutCubic(progressBetween(elapsedSeconds, 28.4, 30.2));
  const wFocus = pulseFactor(elapsedSeconds, 30.8, 2.6);

  // Goal (33.5s - 38.0s): Extra distance AH
  const ahDraw = easeInOutCubic(progressBetween(elapsedSeconds, 34.1, 35.8));
  const ahFocus = easeOutCubic(progressBetween(elapsedSeconds, 34.4, 35.6));

  // Individual geometric point node opacities & spoken-word pulses
  const alphaX = Math.max(0.28 * stageFadeIn, easeOutCubic(progressBetween(elapsedSeconds, 7.2, 8.0)));
  const alphaE = Math.max(0.28 * stageFadeIn, easeOutCubic(progressBetween(elapsedSeconds, 7.2, 8.0)));
  const alphaF = Math.max(0.24 * stageFadeIn, easeOutCubic(progressBetween(elapsedSeconds, 16.5, 17.4)));
  const alphaA = Math.max(0.24 * stageFadeIn, easeOutCubic(progressBetween(elapsedSeconds, 22.0, 22.9)));
  const alphaG = Math.max(0.22 * stageFadeIn, easeOutCubic(progressBetween(elapsedSeconds, 28.4, 29.3)));
  const alphaH = Math.max(0.22 * stageFadeIn, easeOutCubic(progressBetween(elapsedSeconds, 28.4, 29.3)));

  const pulseX = pulseFactor(elapsedSeconds, 15.16, 0.65);
  const pulseE = Math.max(
    pulseFactor(elapsedSeconds, 13.7, 0.55),
    pulseFactor(elapsedSeconds, 19.6, 0.5),
    pulseFactor(elapsedSeconds, 25.3, 0.5),
  );
  const pulseF = pulseFactor(elapsedSeconds, 20.9, 0.55);
  const pulseA = Math.max(pulseFactor(elapsedSeconds, 27.0, 0.55), pulseFactor(elapsedSeconds, 36.0, 0.65));
  const pulseG = pulseFactor(elapsedSeconds, 30.7, 0.55);
  const pulseH = Math.max(pulseFactor(elapsedSeconds, 30.9, 0.55), pulseFactor(elapsedSeconds, 36.0, 0.65));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">05</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          The Four Measurable Inputs
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>Four measurable inputs r, l, k, w and target extra parking distance AH</title>
        <defs>
          <radialGradient id="slide05-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide05-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide05-vertical-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="11%" stopColor="white" stopOpacity={1} />
            <stop offset="90%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide05-vertical-fade-mask">
            <rect x={0} y={0} width={960} height={620} fill="url(#slide05-vertical-fade-grad)" />
          </mask>

          <linearGradient id="slide05-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.21 0 0 / 0.55)" />
            <stop offset="60%" stopColor="oklch(0.18 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide05-ambient-glow)" />

        <g opacity={stageFadeIn} mask="url(#slide05-vertical-fade-mask)">
          {/* Minimalist Right-Side Kerb & Subtle Sidewalk */}
          <rect x={KERB_STONE_X + 8} y={0} width={140} height={620} fill="url(#slide05-sidewalk-right-grad)" />
          <g stroke="oklch(0.32 0 0 / 0.25)" strokeWidth={1}>
            {PAVING_JOINTS_Y.map((y) => (
              <line key={`pave-${y}`} x1={KERB_STONE_X + 8} y1={y} x2={KERB_STONE_X + 128} y2={y} />
            ))}
          </g>
          <rect x={KERB_STONE_X} y={0} width={8} height={620} fill="oklch(0.28 0 0 / 0.85)" />
          <line x1={KERB_STONE_X} y1={0} x2={KERB_STONE_X} y2={620} stroke="oklch(0.68 0 0 / 0.58)" strokeWidth={1.4} />
          <g stroke="oklch(0.42 0 0 / 0.5)" strokeWidth={1}>
            {KERB_JOINTS_Y.map((y) => (
              <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 8} y2={y} />
            ))}
          </g>

          {/* Kerb Tangent Alignment Line Through A & H */}
          <line
            x1={KERB_X}
            y1={20}
            x2={KERB_X}
            y2={590}
            stroke="oklch(0.75 0 0 / 0.24)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />

          {/* Horizontal Rear-Axle Line Reference Through F and X */}
          <line
            x1={TURNING_CENTER.x}
            y1={REAR_AXLE_Y}
            x2={POINT_F.x}
            y2={REAR_AXLE_Y}
            stroke="oklch(0.78 0 0 / 0.3)"
            strokeWidth={1.1}
            strokeDasharray="4 5"
          />

          {/* Parked Car in Front (Rear Bumper GH at y = 187.44) */}
          <g transform={`translate(${HERO_CENTER_X}, ${FRONT_CAR_CENTER_Y}) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>

          {/* Hero Sports Coupe */}
          <g transform={`translate(${HERO_CENTER_X}, ${HERO_CENTER_Y}) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Hero}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={true}
              frontLeftSteerDeg={frontLeftSteerDeg}
              frontRightSteerDeg={frontRightSteerDeg}
            />
          </g>
        </g>

        {/* ================================================================
            INPUT 1: r = |EX| (Kerb-to-Kerb Turning Circle Radius)
           ================================================================ */}
        {rCircleDraw > 0.01 ? (
          <path
            d={TURNING_ARC_E.path}
            fill="none"
            stroke={`oklch(0.86 0 0 / ${(0.28 + 0.36 * rFocus).toFixed(2)})`}
            strokeWidth={1.35 + 0.35 * rFocus}
            strokeDasharray={rCircleDraw < 0.99 ? TURNING_ARC_E.length : "5 5"}
            strokeDashoffset={rCircleDraw < 0.99 ? TURNING_ARC_E.length * (1 - rCircleDraw) : 0}
          />
        ) : null}

        {rDraw > 0.01 ? (
          <g>
            <line
              x1={POINT_E.x}
              y1={POINT_E.y}
              x2={TURNING_CENTER.x}
              y2={TURNING_CENTER.y}
              stroke={`oklch(0.96 0 0 / ${(0.76 + 0.24 * rFocus).toFixed(2)})`}
              strokeWidth={1.8 + 0.6 * rFocus}
              strokeDasharray={RADIUS_EX}
              strokeDashoffset={RADIUS_EX * (1 - rDraw)}
              filter={rFocus > 0.3 ? "url(#slide05-luminous-glow)" : undefined}
            />
            {rDraw > 0.55 ? (
              <text
                x={506}
                y={408}
                textAnchor="middle"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4.5}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                r
              </text>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            INPUT 2: l = |EF| (Wheelbase)
           ================================================================ */}
        {lDraw > 0.01 ? (
          <g>
            <g stroke="oklch(0.84 0 0 / 0.62)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={POINT_E.x} y1={FRONT_AXLE_Y} x2={CALIPER_X + 6} y2={FRONT_AXLE_Y} />
              <line x1={POINT_F.x} y1={REAR_AXLE_Y} x2={CALIPER_X + 6} y2={REAR_AXLE_Y} />
            </g>
            <line
              x1={CALIPER_X}
              y1={FRONT_AXLE_Y}
              x2={CALIPER_X}
              y2={REAR_AXLE_Y}
              stroke={`oklch(0.96 0 0 / ${(0.76 + 0.24 * lFocus).toFixed(2)})`}
              strokeWidth={1.8 + 0.6 * lFocus}
              strokeDasharray={WHEEL_OFFSET_Y * 2}
              strokeDashoffset={WHEEL_OFFSET_Y * 2 * (1 - lDraw)}
              filter={lFocus > 0.3 ? "url(#slide05-luminous-glow)" : undefined}
            />
            <g stroke="oklch(0.94 0 0 / 0.85)" strokeWidth={1.4}>
              <line x1={CALIPER_X - 4} y1={FRONT_AXLE_Y} x2={CALIPER_X + 4} y2={FRONT_AXLE_Y} />
              <line x1={CALIPER_X - 4} y1={REAR_AXLE_Y} x2={CALIPER_X + 4} y2={REAR_AXLE_Y} />
            </g>
            {lDraw > 0.45 ? (
              <text
                x={CALIPER_X + 16}
                y={(FRONT_AXLE_Y + REAR_AXLE_Y) * 0.5 + 5}
                textAnchor="start"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                l
              </text>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            INPUT 3: k = |AE| (Front Overhang)
           ================================================================ */}
        {kDraw > 0.01 ? (
          <g>
            <line
              x1={POINT_A.x}
              y1={HERO_TOP_Y}
              x2={CALIPER_X + 6}
              y2={HERO_TOP_Y}
              stroke="oklch(0.84 0 0 / 0.62)"
              strokeWidth={1.1}
              strokeDasharray="3 3"
            />
            <line
              x1={CALIPER_X}
              y1={FRONT_AXLE_Y}
              x2={CALIPER_X}
              y2={HERO_TOP_Y}
              stroke={`oklch(0.96 0 0 / ${(0.76 + 0.24 * kFocus).toFixed(2)})`}
              strokeWidth={1.8 + 0.6 * kFocus}
              strokeDasharray={FRONT_AXLE_Y - HERO_TOP_Y}
              strokeDashoffset={(FRONT_AXLE_Y - HERO_TOP_Y) * (1 - kDraw)}
              filter={kFocus > 0.3 ? "url(#slide05-luminous-glow)" : undefined}
            />
            <line
              x1={CALIPER_X - 4}
              y1={HERO_TOP_Y}
              x2={CALIPER_X + 4}
              y2={HERO_TOP_Y}
              stroke="oklch(0.94 0 0 / 0.85)"
              strokeWidth={1.4}
            />
            {kDraw > 0.45 ? (
              <text
                x={CALIPER_X + 16}
                y={(HERO_TOP_Y + FRONT_AXLE_Y) * 0.5 + 5}
                textAnchor="start"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                k
              </text>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            INPUT 4: w = |GH| (Width of Parked Car in Front)
           ================================================================ */}
        {wDraw > 0.01 ? (
          <g>
            <g stroke="oklch(0.84 0 0 / 0.62)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={POINT_G.x} y1={FRONT_CAR_REAR_Y} x2={POINT_G.x} y2={218} />
              <line x1={POINT_H.x} y1={FRONT_CAR_REAR_Y} x2={POINT_H.x} y2={218} />
            </g>
            <line
              x1={POINT_G.x}
              y1={212}
              x2={POINT_H.x}
              y2={212}
              stroke={`oklch(0.96 0 0 / ${(0.76 + 0.24 * wFocus).toFixed(2)})`}
              strokeWidth={1.8 + 0.6 * wFocus}
              strokeDasharray={HALF_WIDTH * 2}
              strokeDashoffset={HALF_WIDTH * 2 * (1 - wDraw)}
              filter={wFocus > 0.3 ? "url(#slide05-luminous-glow)" : undefined}
            />
            <g stroke="oklch(0.94 0 0 / 0.85)" strokeWidth={1.4}>
              <line x1={POINT_G.x} y1={208} x2={POINT_G.x} y2={216} />
              <line x1={POINT_H.x} y1={208} x2={POINT_H.x} y2={216} />
            </g>
            {wDraw > 0.45 ? (
              <text
                x={HERO_CENTER_X}
                y={232}
                textAnchor="middle"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                w
              </text>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            GOAL: Extra Parking Distance AH = ?
           ================================================================ */}
        {ahDraw > 0.01 ? (
          <g opacity={ahFocus}>
            <rect
              x={ROAD_X}
              y={FRONT_CAR_REAR_Y}
              width={HALF_WIDTH * 2}
              height={HERO_TOP_Y - FRONT_CAR_REAR_Y}
              rx={3}
              fill="oklch(0.96 0 0 / 0.07)"
              stroke="oklch(0.94 0 0 / 0.35)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <line
              x1={POINT_H.x}
              y1={FRONT_CAR_REAR_Y}
              x2={CALIPER_X + 6}
              y2={FRONT_CAR_REAR_Y}
              stroke="oklch(0.9 0 0 / 0.72)"
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
            <line
              x1={CALIPER_X}
              y1={FRONT_CAR_REAR_Y}
              x2={CALIPER_X}
              y2={HERO_TOP_Y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={2.4}
              strokeDasharray={HERO_TOP_Y - FRONT_CAR_REAR_Y}
              strokeDashoffset={(HERO_TOP_Y - FRONT_CAR_REAR_Y) * (1 - ahDraw)}
              filter="url(#slide05-luminous-glow)"
            />
            <line
              x1={CALIPER_X - 4}
              y1={FRONT_CAR_REAR_Y}
              x2={CALIPER_X + 4}
              y2={FRONT_CAR_REAR_Y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.6}
            />

            {ahDraw > 0.45 ? (
              <g>
                <line
                  x1={CALIPER_X}
                  y1={(FRONT_CAR_REAR_Y + HERO_TOP_Y) * 0.5}
                  x2={738}
                  y2={(FRONT_CAR_REAR_Y + HERO_TOP_Y) * 0.5}
                  stroke="oklch(0.92 0 0 / 0.8)"
                  strokeWidth={1.3}
                />
                <rect
                  x={738}
                  y={(FRONT_CAR_REAR_Y + HERO_TOP_Y) * 0.5 - 15}
                  width={68}
                  height={30}
                  rx={6}
                  fill="oklch(0.22 0 0 / 0.94)"
                  stroke="oklch(0.98 0 0 / 0.9)"
                  strokeWidth={1.5}
                />
                <text
                  x={772}
                  y={(FRONT_CAR_REAR_Y + HERO_TOP_Y) * 0.5 + 5}
                  textAnchor="middle"
                  className="fill-text-primary font-mono text-sm font-semibold tracking-mono"
                >
                  AH = ?
                </text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            TURNING CENTER X HEXAGONAL NODE
           ================================================================ */}
        <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={alphaX}>
          {pulseX > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={20 + 10 * pulseX}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.4}
              opacity={pulseX * 0.85}
            />
          ) : null}
          <polygon
            points="0,-18 15.6,-9 15.6,9 0,18 -15.6,9 -15.6,-9"
            fill="oklch(0.24 0 0 / 0.94)"
            stroke="oklch(0.94 0 0 / 0.9)"
            strokeWidth={1.5}
          />
          <circle
            cx={0}
            cy={0}
            r={5 + 1.5 * pulseX}
            fill="oklch(0.98 0 0)"
            filter={pulseX > 0.1 ? "url(#slide05-luminous-glow)" : undefined}
          />
          <text
            x={0}
            y={34}
            textAnchor="middle"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
          >
            X
          </text>
        </g>

        {/* ================================================================
            GEOMETRIC VERTICES: A, E, F, G, H
           ================================================================ */}
        <PointNode
          point={POINT_E}
          label="E"
          labelX={POINT_E.x - 14}
          labelY={POINT_E.y - 4}
          textAnchor="end"
          opacity={alphaE}
          pulse={pulseE}
        />
        <PointNode
          point={POINT_F}
          label="F"
          labelX={POINT_F.x - 14}
          labelY={POINT_F.y - 8}
          textAnchor="end"
          opacity={alphaF}
          pulse={pulseF}
        />
        <PointNode
          point={POINT_A}
          label="A"
          labelX={POINT_A.x - 10}
          labelY={POINT_A.y - 10}
          textAnchor="end"
          opacity={alphaA}
          pulse={pulseA}
        />
        <PointNode
          point={POINT_G}
          label="G"
          labelX={POINT_G.x - 12}
          labelY={POINT_G.y - 4}
          textAnchor="end"
          opacity={alphaG}
          pulse={pulseG}
        />
        <PointNode
          point={POINT_H}
          label="H"
          labelX={POINT_H.x - 10}
          labelY={POINT_H.y - 10}
          textAnchor="end"
          opacity={alphaH}
          pulse={pulseH}
        />
      </svg>
    </div>
  );
}
