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

const CAR_SCALE = 1.32;
const CAR_CENTER_X = 574;
const CAR_CENTER_Y = 340;

const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * CAR_SCALE; // 110.88
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE; // 40.92
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE; // 68.64

// Shared Figure 2 / Figure 3 vertical kerb proof line at x = 614.92
const PROOF_LINE_X = CAR_CENTER_X + TRACK_HALF_W; // 614.92
const FRONT_BUMPER_Y = CAR_CENTER_Y - HALF_L; // 229.12
const FRONT_AXLE_Y = CAR_CENTER_Y - WHEEL_HALF_L; // 271.36
const REAR_AXLE_Y = CAR_CENTER_Y + WHEEL_HALF_L; // 408.64

const POINT_A: Point2D = { x: PROOF_LINE_X, y: FRONT_BUMPER_Y };
const POINT_E: Point2D = { x: PROOF_LINE_X, y: FRONT_AXLE_Y };
const POINT_F: Point2D = { x: PROOF_LINE_X, y: REAR_AXLE_Y };
const POINT_X: Point2D = { x: 365, y: REAR_AXLE_Y };

const LENGTH_FX = POINT_F.x - POINT_X.x; // 249.92
const LENGTH_EF = POINT_F.y - POINT_E.y; // 137.28
const LENGTH_AF = POINT_F.y - POINT_A.y; // 179.52
const RADIUS_AX = Math.hypot(LENGTH_FX, LENGTH_AF); // 307.712

// Front parked car (width w = 91.2px aligned to kerb proof line x = 614.92)
const FRONT_CAR_SCALE = 1.2;
const FRONT_CAR_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * FRONT_CAR_SCALE; // 45.6
const FRONT_CAR_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * FRONT_CAR_SCALE; // 100.8
const FRONT_CAR_CENTER_X = PROOF_LINE_X - FRONT_CAR_HALF_W; // 569.32
const WIDTH_W = FRONT_CAR_HALF_W * 2; // 91.2

const POINT_G_X = PROOF_LINE_X - WIDTH_W; // 523.72
const POINT_G_Y = POINT_X.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - POINT_X.x) ** 2); // 145.023
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_H: Point2D = { x: PROOF_LINE_X, y: POINT_G_Y };
const POINT_K: Point2D = { x: POINT_G_X, y: REAR_AXLE_Y }; // (523.72, 408.64)
const FRONT_CAR_CENTER_Y = POINT_G.y - FRONT_CAR_HALF_L; // 44.223

const LENGTH_GK = POINT_K.y - POINT_G.y; // 263.617

const VIRTUAL_STEER_DEG = -((Math.atan2(LENGTH_EF, CAR_CENTER_X - POINT_X.x) * 180) / Math.PI);
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

const ANGLE_A_DEG = (Math.atan2(POINT_A.y - POINT_X.y, POINT_A.x - POINT_X.x) * 180) / Math.PI;
const ANGLE_G_DEG = (Math.atan2(POINT_G.y - POINT_X.y, POINT_G.x - POINT_X.x) * 180) / Math.PI;

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

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function buildArcSweep(center: Point2D, radius: number, startDeg: number, endDeg: number): string {
  const sRad = degToRad(startDeg);
  const eRad = degToRad(endDeg);
  const sx = center.x + radius * Math.cos(sRad);
  const sy = center.y + radius * Math.sin(sRad);
  const ex = center.x + radius * Math.cos(eRad);
  const ey = center.y + radius * Math.sin(eRad);
  const delta = endDeg - startDeg;
  const sweepFlag = delta >= 0 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

const OUTER_CIRCLE_ARC = buildArcSweep(POINT_X, RADIUS_AX, ANGLE_A_DEG + 12, ANGLE_G_DEG - 12);

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
        filter={pulse > 0.1 ? "url(#slide10-luminous-glow)" : undefined}
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

export function Slide10ConstructionGk(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0.00s - 4.80s): Stage fades in on Figure 2 / 3 baseline state
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));

  // Beat 2 (5.34s - 14.28s): Construction line GK drops from G parallel to kerb down to FX at K
  const gkDraw = easeInOutCubic(progressBetween(elapsedSeconds, 6.2, 11.4));
  const kerbParallelHighlight = pulseEnvelope(elapsedSeconds, 8.6, 9.0, 9.8, 10.6);
  const fxLineHighlight = pulseEnvelope(elapsedSeconds, 11.5, 11.9, 12.8, 13.6);
  const kOpacity = easeOutCubic(progressBetween(elapsedSeconds, 12.6, 13.6));
  const kRightAngleDraw = easeOutCubic(progressBetween(elapsedSeconds, 13.1, 14.2));

  // Beat 3 (14.86s - 22.26s): |FK| at bottom equals width w of parked car at top
  const fkFocus = pulseEnvelope(elapsedSeconds, 16.0, 16.8, 19.8, 21.8);
  const bottomWidthCaliper = easeOutCubic(progressBetween(elapsedSeconds, 16.9, 18.2));
  const topWidthCaliper = easeOutCubic(progressBetween(elapsedSeconds, 18.8, 20.2));
  const fkEqualsW = easeOutCubic(progressBetween(elapsedSeconds, 19.0, 20.0));
  const widthProjectionProgress = easeInOutCubic(progressBetween(elapsedSeconds, 19.1, 21.2));
  const widthProjectionBarY = POINT_G.y + LENGTH_GK * widthProjectionProgress;
  const widthProjectionBarOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 18.9, 19.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 21.3, 22.1)));
  const widthMatchHighlight = pulseEnvelope(elapsedSeconds, 18.6, 19.6, 22.0, 23.0);

  // Beat 4 (22.82s - 32.00s): Full length |FX| -> remaining segment |KX| = |FX| - w = sqrt(r^2 - l^2) - w
  const fxFullSpanDraw = easeInOutCubic(progressBetween(elapsedSeconds, 23.4, 25.1));
  const fxFullSpanDim = easeInOutCubic(progressBetween(elapsedSeconds, 26.2, 27.6));
  const kxHighlight = pulseEnvelope(elapsedSeconds, 25.8, 26.6, 30.2, 31.8);
  const kxBracketOpacity = easeOutCubic(progressBetween(elapsedSeconds, 26.0, 27.2));

  const cardEnterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 25.8, 26.6));
  const cardExpand = easeInOutCubic(progressBetween(elapsedSeconds, 28.0, 28.8));
  const symbolicEqOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 28.0, 28.55));
  const finalEqOpacity = easeOutCubic(progressBetween(elapsedSeconds, 28.35, 29.0));
  const minusWHighlight = pulseFactor(elapsedSeconds, 29.55, 0.6);

  const pillWidth = 236 + 56 * cardExpand;

  // Spoken-letter vertex pulses
  const pulseG = Math.max(pulseFactor(elapsedSeconds, 8.15, 0.55), pulseFactor(elapsedSeconds, 4.2, 0.5));
  const pulseK = Math.max(
    pulseFactor(elapsedSeconds, 14.15, 0.55),
    pulseFactor(elapsedSeconds, 17.95, 0.45),
    pulseFactor(elapsedSeconds, 26.95, 0.5),
  );
  const pulseF = Math.max(
    pulseFactor(elapsedSeconds, 11.85, 0.45),
    pulseFactor(elapsedSeconds, 17.35, 0.45),
    pulseFactor(elapsedSeconds, 24.75, 0.5),
    pulseFactor(elapsedSeconds, 28.55, 0.45),
  );
  const pulseX = Math.max(
    pulseFactor(elapsedSeconds, 12.4, 0.45),
    pulseFactor(elapsedSeconds, 25.2, 0.5),
    pulseFactor(elapsedSeconds, 27.55, 0.5),
    pulseFactor(elapsedSeconds, 29.1, 0.45),
  );

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">10</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Proof Steps 4 &amp; 5: Dropping Construction Line GK
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Figure 3 construction dropping vertical line GK parallel to the kerb to solve |KX| = sqrt(r^2 - l^2) - w
        </title>
        <defs>
          <radialGradient id="slide10-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide10-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide10-top-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="14%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="white" stopOpacity={1} />
          </linearGradient>

          <mask id="slide10-top-fade-mask">
            <rect x={0} y={0} width={960} height={620} fill="url(#slide10-top-fade-grad)" />
          </mask>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide10-ambient-glow)" />

        {/* Vertical Kerb Proof Line Through A, E, F, H */}
        <line
          x1={PROOF_LINE_X}
          y1={76}
          x2={PROOF_LINE_X}
          y2={474}
          stroke={`oklch(0.84 0 0 / ${(0.28 + 0.65 * kerbParallelHighlight).toFixed(2)})`}
          strokeWidth={1.2 + 1.1 * kerbParallelHighlight}
          strokeDasharray={kerbParallelHighlight > 0.2 ? undefined : "4 6"}
          opacity={stageFadeIn}
          filter={kerbParallelHighlight > 0.25 ? "url(#slide10-luminous-glow)" : undefined}
        />

        {/* Front Parked Car Rear Silhouette */}
        <g mask="url(#slide10-top-fade-mask)" opacity={stageFadeIn * 0.7}>
          <g transform={`translate(${FRONT_CAR_CENTER_X}, ${FRONT_CAR_CENTER_Y}) scale(${FRONT_CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* Subtle Hero Car Context */}
        <g transform={`translate(${CAR_CENTER_X}, ${CAR_CENTER_Y}) scale(${CAR_SCALE})`} opacity={stageFadeIn * 0.36}>
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

        {/* Outer Circle Reference & Carry-Over Radii AX / GX */}
        <g opacity={stageFadeIn * 0.42}>
          <path
            d={OUTER_CIRCLE_ARC}
            fill="none"
            stroke="oklch(0.84 0 0 / 0.55)"
            strokeWidth={1.3}
            strokeDasharray="5 5"
          />
          <line
            x1={POINT_X.x}
            y1={POINT_X.y}
            x2={POINT_A.x}
            y2={POINT_A.y}
            stroke="oklch(0.75 0 0 / 0.45)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          <line
            x1={POINT_X.x}
            y1={POINT_X.y}
            x2={POINT_G.x}
            y2={POINT_G.y}
            stroke="oklch(0.88 0 0 / 0.62)"
            strokeWidth={1.4}
          />
        </g>

        {/* Subtle Vertical Projection Corridor Shading Between GH and FK */}
        {widthMatchHighlight > 0.02 ? (
          <rect
            x={POINT_G.x}
            y={POINT_G.y}
            width={WIDTH_W}
            height={LENGTH_GK}
            fill="oklch(0.96 0 0 / 0.045)"
            opacity={widthMatchHighlight}
          />
        ) : null}

        {/* Animated Width Projection Bar Sliding Down from GH onto FK */}
        {widthProjectionBarOpacity > 0.01 ? (
          <g opacity={widthProjectionBarOpacity}>
            <line
              x1={POINT_G.x}
              y1={widthProjectionBarY}
              x2={POINT_H.x}
              y2={widthProjectionBarY}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.4}
              filter="url(#slide10-luminous-glow)"
            />
            <circle cx={POINT_G.x} cy={widthProjectionBarY} r={2.8} fill="oklch(0.99 0 0)" />
            <circle cx={POINT_H.x} cy={widthProjectionBarY} r={2.8} fill="oklch(0.99 0 0)" />
          </g>
        ) : null}

        {/* Horizontal Line FX */}
        <line
          x1={POINT_X.x}
          y1={POINT_X.y}
          x2={POINT_F.x}
          y2={POINT_F.y}
          stroke={`oklch(0.94 0 0 / ${(0.72 + 0.26 * fxLineHighlight).toFixed(2)})`}
          strokeWidth={1.65 + 0.9 * fxLineHighlight}
          opacity={stageFadeIn}
          filter={fxLineHighlight > 0.25 ? "url(#slide10-luminous-glow)" : undefined}
        />

        {/* ================================================================
            STEP 4: VERTICAL CONSTRUCTION LINE GK & RIGHT ANGLE AT K
           ================================================================ */}
        {gkDraw > 0.01 ? (
          <g>
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={POINT_K.x}
              y2={POINT_K.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={2}
              strokeDasharray={LENGTH_GK}
              strokeDashoffset={LENGTH_GK * (1 - gkDraw)}
              filter="url(#slide10-luminous-glow)"
            />

            {/* Right-Angle Corner Marker at K */}
            {kRightAngleDraw > 0.01 ? (
              <path
                d={`M ${POINT_K.x - 14} ${POINT_K.y} L ${POINT_K.x - 14} ${POINT_K.y - 14} L ${POINT_K.x} ${POINT_K.y - 14}`}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.45}
                opacity={kRightAngleDraw}
              />
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            STEP 5: WIDTH w MATCHING (GH AT TOP == FK AT BOTTOM) & SEGMENT KX
           ================================================================ */}
        {/* Top Parked Car Rear Bumper GH & Width w Caliper */}
        {topWidthCaliper > 0.01 ? (
          <g opacity={topWidthCaliper}>
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={POINT_H.x}
              y2={POINT_H.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={2.2}
              filter={widthMatchHighlight > 0.2 ? "url(#slide10-luminous-glow)" : undefined}
            />
            <g stroke="oklch(0.84 0 0 / 0.58)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={POINT_G.x} y1={POINT_G.y} x2={POINT_G.x} y2={114} />
              <line x1={POINT_H.x} y1={POINT_H.y} x2={POINT_H.x} y2={114} />
            </g>
            <line x1={POINT_G.x} y1={118} x2={POINT_H.x} y2={118} stroke="oklch(0.97 0 0)" strokeWidth={1.8} />
            <g stroke="oklch(0.95 0 0 / 0.9)" strokeWidth={1.4}>
              <line x1={POINT_G.x} y1={114} x2={POINT_G.x} y2={122} />
              <line x1={POINT_H.x} y1={114} x2={POINT_H.x} y2={122} />
            </g>
            <text
              x={FRONT_CAR_CENTER_X}
              y={107}
              textAnchor="middle"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
            >
              w = |GH|
            </text>
          </g>
        ) : null}

        {/* Bottom Segment FK = w */}
        {fkFocus > 0.02 ? (
          <line
            x1={POINT_K.x}
            y1={POINT_K.y}
            x2={POINT_F.x}
            y2={POINT_F.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.8}
            opacity={fkFocus}
            filter="url(#slide10-luminous-glow)"
          />
        ) : null}

        {bottomWidthCaliper > 0.01 ? (
          <g opacity={bottomWidthCaliper * (1 - 0.35 * kxHighlight)}>
            <path
              d={`M ${POINT_K.x} ${POINT_K.y + 8} L ${POINT_K.x} ${POINT_K.y + 14} L ${POINT_F.x} ${POINT_F.y + 14} L ${POINT_F.x} ${POINT_F.y + 8}`}
              fill="none"
              stroke="oklch(0.94 0 0 / 0.88)"
              strokeWidth={1.5}
            />
            <text
              x={(POINT_K.x + POINT_F.x) * 0.5}
              y={POINT_K.y + 30}
              textAnchor="middle"
              className="fill-text-primary font-mono text-xs font-semibold tracking-mono"
            >
              {fkEqualsW < 0.4 ? "|FK|" : "|FK| = w"}
            </text>
          </g>
        ) : null}

        {/* Remaining Segment KX Highlight & Caliper */}
        {kxHighlight > 0.02 ? (
          <line
            x1={POINT_X.x}
            y1={POINT_X.y}
            x2={POINT_K.x}
            y2={POINT_K.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.9}
            opacity={kxHighlight}
            filter="url(#slide10-luminous-glow)"
          />
        ) : null}

        {kxBracketOpacity > 0.01 ? (
          <g opacity={kxBracketOpacity}>
            <path
              d={`M ${POINT_X.x} ${POINT_X.y + 8} L ${POINT_X.x} ${POINT_X.y + 14} L ${POINT_K.x} ${POINT_K.y + 14} L ${POINT_K.x} ${POINT_K.y + 8}`}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.65}
            />
            <text
              x={(POINT_X.x + POINT_K.x) * 0.5}
              y={POINT_X.y + 30}
              textAnchor="middle"
              className="fill-text-primary font-mono text-xs font-semibold tracking-mono"
            >
              |KX|
            </text>
          </g>
        ) : null}

        {/* Full Length |FX| = sqrt(r^2 - l^2) Bracket */}
        {fxFullSpanDraw > 0.01 ? (
          <g opacity={fxFullSpanDraw * (1 - 0.35 * fxFullSpanDim)}>
            <line
              x1={POINT_X.x}
              y1={452}
              x2={POINT_F.x}
              y2={452}
              stroke="oklch(0.88 0 0 / 0.78)"
              strokeWidth={1.35}
              strokeDasharray={LENGTH_FX}
              strokeDashoffset={LENGTH_FX * (1 - fxFullSpanDraw)}
            />
            <g stroke="oklch(0.88 0 0 / 0.78)" strokeWidth={1.2}>
              <line x1={POINT_X.x} y1={447} x2={POINT_X.x} y2={457} />
              <line x1={POINT_F.x} y1={447} x2={POINT_F.x} y2={457} />
            </g>
            <g transform="translate(490, 476)" opacity={easeOutCubic(progressBetween(fxFullSpanDraw, 0.45, 1))}>
              <text x={-32} y={0} textAnchor="end" className="fill-text-secondary font-mono text-xs font-semibold">
                |FX| =
              </text>
              <path
                d="M -22 -1 L -19 -1 L -16 4 L -10 -13 L 38 -13 L 38 -10"
                fill="none"
                stroke="oklch(0.88 0 0)"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={-1} y={1} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                r
              </text>
              <text x={6} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs">
                2
              </text>
              <text x={15} y={1} textAnchor="middle" className="fill-text-secondary font-mono text-xs">
                −
              </text>
              <text x={26} y={1} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                l
              </text>
              <text x={33} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs">
                2
              </text>
            </g>
          </g>
        ) : null}

        {/* ================================================================
            BOTTOM DERIVATION CARD: |KX| = |FX| - w  -->  |KX| = √(r² − l²) − w
           ================================================================ */}
        {cardEnterOpacity > 0.01 ? (
          <g transform="translate(490, 526)" opacity={cardEnterOpacity}>
            <rect
              x={-(pillWidth * 0.5)}
              y={-26}
              width={pillWidth}
              height={48}
              rx={8}
              fill="oklch(0.21 0 0 / 0.92)"
              stroke="oklch(0.95 0 0 / 0.85)"
              strokeWidth={1.4}
            />

            {symbolicEqOpacity > 0.01 ? (
              <text
                x={0}
                y={5}
                textAnchor="middle"
                opacity={symbolicEqOpacity}
                className="fill-text-primary font-mono text-lg font-semibold"
              >
                |KX| = |FX| − w
              </text>
            ) : null}

            {finalEqOpacity > 0.01 ? (
              <g opacity={finalEqOpacity}>
                <text x={-89} y={5} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  |KX|
                </text>
                <text x={-55} y={5} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  =
                </text>

                <path
                  d="M -37 0 L -33 0 L -28 9 L -18 -18 L 53 -18 L 53 -13"
                  fill="none"
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x={-6} y={5} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  r
                </text>
                <text x={3} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </text>
                <text x={17} y={5} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  −
                </text>
                <text x={31} y={5} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  l
                </text>
                <text x={40} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </text>

                <g filter={minusWHighlight > 0.25 ? "url(#slide10-luminous-glow)" : undefined}>
                  <text x={75} y={5} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                    −
                  </text>
                  <text x={99} y={5} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                    w
                  </text>
                </g>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            TURNING CENTER X & GEOMETRIC VERTICES G, H, K, A, E, F
           ================================================================ */}
        <g transform={`translate(${POINT_X.x}, ${POINT_X.y})`} opacity={stageFadeIn}>
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
          <circle cx={0} cy={0} r={4.5 + 1.4 * pulseX} fill="oklch(0.98 0 0)" filter="url(#slide10-luminous-glow)" />
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
          point={POINT_G}
          label="G"
          labelX={POINT_G.x - 14}
          labelY={POINT_G.y - 8}
          textAnchor="end"
          opacity={stageFadeIn}
          pulse={pulseG}
        />
        <VertexNode
          point={POINT_H}
          label="H"
          labelX={636}
          labelY={POINT_H.y + 4}
          textAnchor="start"
          opacity={stageFadeIn}
          pulse={0}
        />
        <VertexNode
          point={POINT_A}
          label="A"
          labelX={636}
          labelY={POINT_A.y + 4}
          textAnchor="start"
          opacity={stageFadeIn * 0.52}
          pulse={0}
        />
        <VertexNode
          point={POINT_E}
          label="E"
          labelX={636}
          labelY={POINT_E.y + 4}
          textAnchor="start"
          opacity={stageFadeIn * 0.48}
          pulse={0}
        />
        <VertexNode
          point={POINT_F}
          label="F"
          labelX={636}
          labelY={POINT_F.y + 6}
          textAnchor="start"
          opacity={stageFadeIn}
          pulse={pulseF}
        />
        <VertexNode
          point={POINT_K}
          label="K"
          labelX={POINT_K.x + 12}
          labelY={POINT_K.y - 12}
          textAnchor="start"
          opacity={kOpacity}
          pulse={pulseK}
        />
      </svg>
    </div>
  );
}
