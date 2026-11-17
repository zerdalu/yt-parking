import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { RootR2MinusL2 } from "@/components/math-formula";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

const CAR_SCALE = 1.32;
const CAR_CENTER_X = 574;
const CAR_CENTER_Y = 340;

const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * CAR_SCALE; // 110.88
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE; // 40.92
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE; // 68.64

const WHEEL_KERB_X = CAR_CENTER_X + TRACK_HALF_W; // 614.92
const WHEEL_LEFT_X = CAR_CENTER_X - TRACK_HALF_W; // 533.08
const FRONT_AXLE_Y = CAR_CENTER_Y - WHEEL_HALF_L; // 271.36
const REAR_AXLE_Y = CAR_CENTER_Y + WHEEL_HALF_L; // 408.64

const POINT_E: Point2D = { x: WHEEL_KERB_X, y: FRONT_AXLE_Y };
const POINT_F: Point2D = { x: WHEEL_KERB_X, y: REAR_AXLE_Y };
const POINT_X: Point2D = { x: 365, y: REAR_AXLE_Y };

const LENGTH_FX = POINT_F.x - POINT_X.x; // 249.92
const LENGTH_EF = POINT_F.y - POINT_E.y; // 137.28
const LENGTH_EX = Math.hypot(LENGTH_FX, LENGTH_EF); // 285.14

const VIRTUAL_STEER_DEG = -((Math.atan2(LENGTH_EF, CAR_CENTER_X - POINT_X.x) * 180) / Math.PI);
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

const CALIPER_X = 674;
const TRIANGLE_PATH = `M ${POINT_E.x} ${POINT_E.y} L ${POINT_F.x} ${POINT_F.y} L ${POINT_X.x} ${POINT_X.y} Z`;
const TRIANGLE_PERIMETER = LENGTH_EF + LENGTH_FX + LENGTH_EX;

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

function pulseEnvelope(seconds: number, start: number, peakStart: number, peakEnd: number, end: number): number {
  if (seconds <= start || seconds >= end) {
    return 0;
  }
  if (seconds < peakStart) {
    return easeOutCubic(progressBetween(seconds, start, peakStart));
  }
  if (seconds <= peakEnd) {
    return 1;
  }
  return 1 - easeInOutCubic(progressBetween(seconds, peakEnd, end));
}

function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.58): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

function buildArcThroughE(): { readonly path: string; readonly length: number } {
  const angleE = Math.atan2(POINT_E.y - POINT_X.y, POINT_E.x - POINT_X.x);
  const startAngle = angleE - (28 * Math.PI) / 180;
  const endAngle = angleE + (24 * Math.PI) / 180;
  const sx = POINT_X.x + LENGTH_EX * Math.cos(startAngle);
  const sy = POINT_X.y + LENGTH_EX * Math.sin(startAngle);
  const ex = POINT_X.x + LENGTH_EX * Math.cos(endAngle);
  const ey = POINT_X.y + LENGTH_EX * Math.sin(endAngle);
  return {
    path: `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${LENGTH_EX.toFixed(2)} ${LENGTH_EX.toFixed(2)} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`,
    length: LENGTH_EX * (endAngle - startAngle),
  };
}

const ARC_THROUGH_E = buildArcThroughE();

interface VertexNodeProps {
  readonly point: Point2D;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly opacity: number;
  readonly pulse: number;
}

function VertexNode({
  point,
  label,
  labelX,
  labelY,
  textAnchor,
  opacity,
  pulse,
}: VertexNodeProps): ReactElement | null {
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
        filter={pulse > 0.1 ? "url(#slide08-luminous-glow)" : undefined}
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

export function Slide08TriangleEfx(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0.00s - 4.46s): Cut-plane car fades in; right-angled triangle EFX draws in order E -> F -> X
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));
  const triangleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 1.9, 3.85));
  const carFocusDim = easeInOutCubic(progressBetween(elapsedSeconds, 2.2, 4.2));
  const carOpacity = stageFadeIn * (0.9 - 0.38 * carFocusDim);

  const vertexOpacity = easeOutCubic(progressBetween(elapsedSeconds, 2.4, 3.4));
  const pulseE = Math.max(
    pulseFactor(elapsedSeconds, 3.55, 0.55),
    pulseFactor(elapsedSeconds, 15.45, 0.55),
    pulseFactor(elapsedSeconds, 19.35, 0.55),
  );
  const pulseF = Math.max(
    pulseFactor(elapsedSeconds, 3.85, 0.55),
    pulseFactor(elapsedSeconds, 12.1, 0.6),
    pulseFactor(elapsedSeconds, 19.55, 0.55),
    pulseFactor(elapsedSeconds, 25.4, 0.55),
  );
  const pulseX = Math.max(
    pulseFactor(elapsedSeconds, 4.15, 0.55),
    pulseFactor(elapsedSeconds, 8.4, 0.65),
    pulseFactor(elapsedSeconds, 15.65, 0.55),
    pulseFactor(elapsedSeconds, 25.7, 0.55),
  );

  // Beat 2 (5.06s - 13.32s): Rear axle line straight to X & 90-degree right angle at F
  const rearAxleRayDraw = easeInOutCubic(progressBetween(elapsedSeconds, 5.15, 8.2));
  const rearAxleHighlight = pulseEnvelope(elapsedSeconds, 5.1, 5.9, 8.8, 10.2);
  const carSideHighlight = pulseEnvelope(elapsedSeconds, 8.8, 9.4, 10.6, 11.4);
  const rightAngleAppear = easeOutCubic(progressBetween(elapsedSeconds, 11.1, 12.2));
  const ninetyDegLabelOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 12.2, 12.8)) *
    (1 - 0.45 * easeInOutCubic(progressBetween(elapsedSeconds, 14.2, 15.2)));

  // Beat 3 (14.04s - 17.68s): Hypotenuse EX = turning radius r
  const exFocus = pulseEnvelope(elapsedSeconds, 14.1, 14.9, 17.6, 18.4);
  const rArcPreview =
    easeInOutCubic(progressBetween(elapsedSeconds, 15.6, 17.2)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 18.0, 19.0)));
  const rLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 16.5, 17.4));

  // Beat 4 (17.84s - 21.28s): Vertical leg EF = wheelbase l
  const efFocus = pulseEnvelope(elapsedSeconds, 17.9, 18.6, 21.2, 22.0);
  const lCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 19.6, 21.0));

  // Beat 5 (21.98s - 31.00s): Pythagoras' theorem -> |FX| = sqrt(r^2 - l^2)
  const pythagorasGlow = pulseEnvelope(elapsedSeconds, 21.95, 22.5, 24.0, 24.8);
  const fxFocus = Math.max(pulseEnvelope(elapsedSeconds, 24.1, 24.8, 29.2, 30.8), pythagorasGlow * 0.65);
  const fxBaseLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 24.6, 25.6));
  const fxBaseResolvedOpacity = easeOutCubic(progressBetween(elapsedSeconds, 27.0, 28.0));

  const cardEnterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 22.3, 23.2));
  const setupEqOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 22.4, 23.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 25.8, 26.45)));
  const solvedEqOpacity = easeOutCubic(progressBetween(elapsedSeconds, 26.25, 27.1));
  const solvedRadicalDraw = easeInOutCubic(progressBetween(elapsedSeconds, 26.45, 27.45));
  const rSqHighlight = pulseFactor(elapsedSeconds, 27.78, 0.55);
  const lSqHighlight = pulseFactor(elapsedSeconds, 28.9, 0.58);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">08</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Proof Step 1: The Wheelbase Triangle EFX
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Right-angled triangle EFX formed by front wheel E, rear wheel F, and turning center X solving |FX| = sqrt(r^2
          - l^2)
        </title>
        <defs>
          <radialGradient id="slide08-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide08-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide08-ambient-glow)" />

        {/* Vertical Proof Line Through E and F (Shared with Slides 09-11) */}
        <line
          x1={WHEEL_KERB_X}
          y1={80}
          x2={WHEEL_KERB_X}
          y2={500}
          stroke="oklch(0.75 0 0 / 0.24)"
          strokeWidth={1.1}
          strokeDasharray="4 6"
          opacity={stageFadeIn}
        />

        {/* Cut-Plane Sports Coupe Context */}
        <g transform={`translate(${CAR_CENTER_X}, ${CAR_CENTER_Y}) scale(${CAR_SCALE})`} opacity={carOpacity}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ACKERMANN.frontLeftSteerDeg}
            frontRightSteerDeg={ACKERMANN.frontRightSteerDeg}
          />
        </g>

        {/* Vertical Wheel-Plane Side Highlight on "side of the car" (8.8s - 11.4s) */}
        {carSideHighlight > 0.02 ? (
          <line
            x1={WHEEL_KERB_X}
            y1={CAR_CENTER_Y - HALF_L}
            x2={WHEEL_KERB_X}
            y2={CAR_CENTER_Y + HALF_L}
            stroke="oklch(0.98 0 0)"
            strokeWidth={2.2}
            opacity={carSideHighlight}
            filter="url(#slide08-luminous-glow)"
          />
        ) : null}

        {/* Rear Axle Line Passing Through Both Rear Wheel Centers Straight to X */}
        {rearAxleRayDraw > 0.01 ? (
          <line
            x1={WHEEL_LEFT_X}
            y1={REAR_AXLE_Y}
            x2={POINT_X.x}
            y2={POINT_X.y}
            stroke={`oklch(0.96 0 0 / ${(0.38 + 0.62 * rearAxleHighlight).toFixed(2)})`}
            strokeWidth={1.5 + 0.8 * rearAxleHighlight}
            strokeDasharray={rearAxleHighlight > 0.15 ? undefined : "5 4"}
            opacity={rearAxleRayDraw}
            filter={rearAxleHighlight > 0.2 ? "url(#slide08-luminous-glow)" : undefined}
          />
        ) : null}

        {/* Subtle Turning Circle Arc Preview Through E on "turning radius R" */}
        {rArcPreview > 0.01 ? (
          <path
            d={ARC_THROUGH_E.path}
            fill="none"
            stroke="oklch(0.9 0 0 / 0.55)"
            strokeWidth={1.4}
            strokeDasharray="5 5"
            opacity={rArcPreview}
          />
        ) : null}

        {/* ================================================================
            RIGHT-ANGLED TRIANGLE EFX
           ================================================================ */}
        {triangleDraw > 0.01 ? (
          <g>
            {/* Subtle Interior Fill */}
            <path
              d={TRIANGLE_PATH}
              fill={`oklch(0.96 0 0 / ${(0.045 + 0.035 * pythagorasGlow).toFixed(3)})`}
              opacity={easeOutCubic(progressBetween(triangleDraw, 0.35, 1))}
            />

            {/* Base Perimeter */}
            <path
              d={TRIANGLE_PATH}
              fill="none"
              stroke="oklch(0.94 0 0 / 0.85)"
              strokeWidth={1.7}
              strokeLinejoin="round"
              strokeDasharray={TRIANGLE_PERIMETER}
              strokeDashoffset={TRIANGLE_PERIMETER * (1 - triangleDraw)}
            />

            {/* Right-Angle Corner Marker at F (11.1s+) */}
            {rightAngleAppear > 0.01 ? (
              <g opacity={rightAngleAppear}>
                <path
                  d={`M ${POINT_F.x - 15} ${POINT_F.y} L ${POINT_F.x - 15} ${POINT_F.y - 15} L ${POINT_F.x} ${POINT_F.y - 15}`}
                  fill="none"
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={1.5}
                />
                <text
                  x={POINT_F.x - 22}
                  y={POINT_F.y - 18}
                  textAnchor="end"
                  opacity={ninetyDegLabelOpacity}
                  stroke="oklch(0.15 0 0 / 0.94)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tabular-nums"
                >
                  90°
                </text>
              </g>
            ) : null}

            {/* Active Segment Spotlights */}
            {exFocus > 0.02 || pythagorasGlow > 0.02 ? (
              <line
                x1={POINT_X.x}
                y1={POINT_X.y}
                x2={POINT_E.x}
                y2={POINT_E.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.7}
                opacity={Math.max(exFocus, pythagorasGlow)}
                filter="url(#slide08-luminous-glow)"
              />
            ) : null}

            {efFocus > 0.02 || pythagorasGlow > 0.02 ? (
              <line
                x1={POINT_E.x}
                y1={POINT_E.y}
                x2={POINT_F.x}
                y2={POINT_F.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.7}
                opacity={Math.max(efFocus, pythagorasGlow)}
                filter="url(#slide08-luminous-glow)"
              />
            ) : null}

            {fxFocus > 0.02 ? (
              <line
                x1={POINT_X.x}
                y1={POINT_X.y}
                x2={POINT_F.x}
                y2={POINT_F.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.8}
                opacity={fxFocus}
                filter="url(#slide08-luminous-glow)"
              />
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            DIMENSION LABELS: r = |EX|, l = |EF|, |FX|
           ================================================================ */}
        {/* Hypotenuse r */}
        {rLabelOpacity > 0.01 ? (
          <text
            x={481}
            y={324}
            textAnchor="end"
            opacity={rLabelOpacity}
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4.5}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-math text-lg font-semibold italic"
          >
            r
          </text>
        ) : null}

        {/* Vertical Wheelbase Caliper l */}
        {lCaliperDraw > 0.01 ? (
          <g>
            <g stroke="oklch(0.84 0 0 / 0.58)" strokeWidth={1.1} strokeDasharray="3 3" opacity={lCaliperDraw}>
              <line x1={POINT_E.x} y1={POINT_E.y} x2={CALIPER_X + 6} y2={POINT_E.y} />
              <line x1={POINT_F.x} y1={POINT_F.y} x2={CALIPER_X + 6} y2={POINT_F.y} />
            </g>
            <line
              x1={CALIPER_X}
              y1={POINT_E.y}
              x2={CALIPER_X}
              y2={POINT_F.y}
              stroke="oklch(0.97 0 0)"
              strokeWidth={1.9}
              strokeDasharray={LENGTH_EF}
              strokeDashoffset={LENGTH_EF * (1 - lCaliperDraw)}
              filter={efFocus > 0.3 ? "url(#slide08-luminous-glow)" : undefined}
            />
            <g stroke="oklch(0.95 0 0 / 0.9)" strokeWidth={1.4} opacity={lCaliperDraw}>
              <line x1={CALIPER_X - 4} y1={POINT_E.y} x2={CALIPER_X + 4} y2={POINT_E.y} />
              <line x1={CALIPER_X - 4} y1={POINT_F.y} x2={CALIPER_X + 4} y2={POINT_F.y} />
            </g>
            <text
              x={CALIPER_X + 16}
              y={(POINT_E.y + POINT_F.y) * 0.5 + 5}
              textAnchor="start"
              opacity={easeOutCubic(progressBetween(lCaliperDraw, 0.45, 1))}
              className="fill-text-primary font-math text-lg font-semibold italic"
            >
              l
            </text>
          </g>
        ) : null}

        {/* Base |FX| Label (Transitions to √(r² − l²) once solved, matching Slide 09) */}
        {fxBaseLabelOpacity > 0.01 ? (
          <g transform={`translate(${(POINT_X.x + POINT_F.x) * 0.5}, ${POINT_X.y + 30})`} opacity={fxBaseLabelOpacity}>
            {fxBaseResolvedOpacity < 0.99 ? (
              <text
                x={0}
                y={0}
                textAnchor="middle"
                opacity={1 - fxBaseResolvedOpacity}
                className="fill-text-primary font-math text-sm font-semibold"
              >
                |FX|
              </text>
            ) : null}
            {fxBaseResolvedOpacity > 0.01 ? (
              <g opacity={fxBaseResolvedOpacity} className="text-text-primary">
                <RootR2MinusL2 x={0} y={0} />
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            PYTHAGOREAN DERIVATION RESULT: |FX|² + l² = r²  -->  |FX| = √(r² − l²)
           ================================================================ */}
        {cardEnterOpacity > 0.01 ? (
          <g transform="translate(490, 502)" opacity={cardEnterOpacity}>
            <rect
              x={-130}
              y={-28}
              width={260}
              height={52}
              rx={8}
              fill="oklch(0.21 0 0 / 0.92)"
              stroke="oklch(0.95 0 0 / 0.85)"
              strokeWidth={1.4}
            />

            {/* Step 1A: Pythagorean Identity |FX|² + l² = r² */}
            {setupEqOpacity > 0.01 ? (
              <g opacity={setupEqOpacity}>
                <text x={-46} y={6} textAnchor="middle" className="fill-text-primary font-math text-xl font-semibold">
                  <tspan>|FX|</tspan>
                  <tspan dy={-8} className="text-xs font-semibold">
                    2
                  </tspan>
                </text>
                <text x={-10} y={6} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                  +
                </text>
                <text x={12} y={6} textAnchor="middle" className="fill-text-primary font-math text-xl font-semibold">
                  <tspan className="italic">l</tspan>
                  <tspan dy={-8} className="text-xs font-semibold">
                    2
                  </tspan>
                </text>
                <text x={36} y={6} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                  =
                </text>
                <text x={60} y={6} textAnchor="middle" className="fill-text-primary font-math text-xl font-semibold">
                  <tspan className="italic">r</tspan>
                  <tspan dy={-8} className="text-xs font-semibold">
                    2
                  </tspan>
                </text>
              </g>
            ) : null}

            {/* Step 1B: Solved Base |FX| = √(r² − l²) */}
            {solvedEqOpacity > 0.01 ? (
              <g opacity={solvedEqOpacity}>
                <text x={-68} y={6} textAnchor="middle" className="fill-text-primary font-math text-xl font-semibold">
                  |FX|
                </text>
                <text x={-34} y={6} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                  =
                </text>

                {/* Vector Square Root Radical */}
                <path
                  d="M -15 0 L -11 0 L -6 10 L 6 -19 L 86 -19 L 86 -14"
                  fill="none"
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={1.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={132}
                  strokeDashoffset={132 * (1 - solvedRadicalDraw)}
                  filter="url(#slide08-luminous-glow)"
                />

                {/* r² */}
                <text
                  x={20}
                  y={6}
                  textAnchor="middle"
                  filter={rSqHighlight > 0.25 ? "url(#slide08-luminous-glow)" : undefined}
                  className="fill-text-primary font-math text-xl font-semibold"
                >
                  <tspan className="italic">r</tspan>
                  <tspan dy={-8} className="text-xs font-semibold">
                    2
                  </tspan>
                </text>

                {/* minus */}
                <text x={44} y={6} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                  −
                </text>

                {/* l² */}
                <text
                  x={68}
                  y={6}
                  textAnchor="middle"
                  filter={lSqHighlight > 0.25 ? "url(#slide08-luminous-glow)" : undefined}
                  className="fill-text-primary font-math text-xl font-semibold"
                >
                  <tspan className="italic">l</tspan>
                  <tspan dy={-8} className="text-xs font-semibold">
                    2
                  </tspan>
                </text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            TURNING CENTER X HEXAGONAL NODE & VERTICES E, F
           ================================================================ */}
        <g transform={`translate(${POINT_X.x}, ${POINT_X.y})`} opacity={vertexOpacity}>
          {pulseX > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={19 + 10 * pulseX}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.4}
              opacity={pulseX * 0.85}
            />
          ) : null}
          <polygon
            points="0,-16 13.86,-8 13.86,8 0,16 -13.86,8 -13.86,-8"
            fill="oklch(0.24 0 0 / 0.94)"
            stroke="oklch(0.94 0 0 / 0.9)"
            strokeWidth={1.4}
          />
          <circle cx={0} cy={0} r={4.5 + 1.4 * pulseX} fill="oklch(0.98 0 0)" filter="url(#slide08-luminous-glow)" />
          <text
            x={-22}
            y={5}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
          >
            X
          </text>
        </g>

        <VertexNode
          point={POINT_E}
          label="E"
          labelX={636}
          labelY={POINT_E.y - 4}
          textAnchor="start"
          opacity={vertexOpacity}
          pulse={pulseE}
        />
        <VertexNode
          point={POINT_F}
          label="F"
          labelX={636}
          labelY={POINT_F.y + 6}
          textAnchor="start"
          opacity={vertexOpacity}
          pulse={pulseF}
        />
      </svg>
    </div>
  );
}
