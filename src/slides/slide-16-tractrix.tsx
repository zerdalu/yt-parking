import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

const CAR_SCALE = 0.8;
const CAR_LENGTH = DEFAULT_VEHICLE_DIMENSIONS.length * CAR_SCALE; // 134.4
const CAR_WIDTH = DEFAULT_VEHICLE_DIMENSIONS.width * CAR_SCALE; // 60.8
const HALF_CAR_W = CAR_WIDTH * 0.5; // 30.4

// Multi-storey carpark bay EFGH geometry & vertical straight guide line EF
const X_GUIDE = 540;
const Y_0 = 434;
const BAY_WIDTH = 90;
const BAY_TOP_Y = 95;
const BAY_BOT_Y = 272;

const POINT_E: Point2D = { x: X_GUIDE, y: BAY_TOP_Y };
const POINT_F: Point2D = { x: X_GUIDE, y: BAY_BOT_Y };
const POINT_G: Point2D = { x: X_GUIDE + BAY_WIDTH, y: BAY_BOT_Y };
const POINT_H: Point2D = { x: X_GUIDE + BAY_WIDTH, y: BAY_TOP_Y };

const BAY_DIVIDERS_X = [270, 360, 450, 540, 630, 720, 810] as const;
const FAMILY_CIRCLE_ANGLES_DEG = [68, 56, 44, 32, 20, 10] as const;

const U_START_DEG = 74;
const U_END_DEG = 10;

interface TractrixFrame {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly wheelRollDistance: number;
}

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

function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.6): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Exact orthogonal tractrix state parameterized by angle `uDeg` between car side BC
 * and straight vertical guide line EF (x = X_GUIDE).
 */
function sampleTractrixGeometry(uDeg: number): {
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly centerX: number;
  readonly centerY: number;
} {
  const u = degToRad(uDeg);
  const sinU = Math.sin(u);
  const cosU = Math.cos(u);
  const yB = Y_0 + CAR_LENGTH * Math.log(Math.tan(u * 0.5));
  const xC = X_GUIDE - CAR_LENGTH * sinU;
  const yC = yB + CAR_LENGTH * cosU;

  const midX = (X_GUIDE + xC) * 0.5;
  const midY = (yB + yC) * 0.5;

  return {
    cornerB: { x: X_GUIDE, y: yB },
    cornerC: { x: xC, y: yC },
    centerX: midX + HALF_CAR_W * cosU,
    centerY: midY + HALF_CAR_W * sinU,
  };
}

const ENTRY_START_SAMPLE = sampleTractrixGeometry(U_START_DEG);
const FINAL_END_SAMPLE = sampleTractrixGeometry(U_END_DEG);

function computeSlide16Frame(seconds: number): TractrixFrame {
  // Phase 1 (0.00s - 4.55s): Approach along horizontal multi-storey aisle until front corner B meets EF
  if (seconds < 4.55) {
    const u = easeInOutCubic(progressBetween(seconds, 0.0, 4.55));
    const headingDeg = 88 + (U_START_DEG - 88) * u;
    const centerX = 278 + (ENTRY_START_SAMPLE.centerX - 278) * u;
    const centerY = 434 + (ENTRY_START_SAMPLE.centerY - 434) * u;
    const hRad = degToRad(headingDeg);
    const steerDeg = -28 * Math.sin(degToRad(U_START_DEG)) * easeInOutCubic(progressBetween(seconds, 2.8, 4.55));

    const cornerB: Point2D = {
      x: centerX + -HALF_CAR_W * Math.cos(hRad) - -(CAR_LENGTH * 0.5) * Math.sin(hRad),
      y: centerY + -HALF_CAR_W * Math.sin(hRad) + -(CAR_LENGTH * 0.5) * Math.cos(hRad),
    };
    const cornerC: Point2D = {
      x: centerX + -HALF_CAR_W * Math.cos(hRad) - CAR_LENGTH * 0.5 * Math.sin(hRad),
      y: centerY + -HALF_CAR_W * Math.sin(hRad) + CAR_LENGTH * 0.5 * Math.cos(hRad),
    };

    return {
      centerX,
      centerY,
      headingDeg,
      steerDeg,
      cornerB,
      cornerC,
      wheelRollDistance: 196 * u,
    };
  }

  // Phase 2 (4.55s - 12.10s): Corner B tracks vertical line EF while rear corner C traces the tractrix
  if (seconds < 12.1) {
    const u = easeInOutCubic(progressBetween(seconds, 4.55, 12.1));
    const currentUDeg = U_START_DEG + (U_END_DEG - U_START_DEG) * u;
    const geom = sampleTractrixGeometry(currentUDeg);
    const steerDeg = -28 * Math.sin(degToRad(currentUDeg));
    return {
      centerX: geom.centerX,
      centerY: geom.centerY,
      headingDeg: currentUDeg,
      steerDeg,
      cornerB: geom.cornerB,
      cornerC: geom.cornerC,
      wheelRollDistance: 196 + 290 * u,
    };
  }

  // Phase 3 (12.10s - 18.00s): Straighten cleanly into bay EFGH
  const settle = easeInOutCubic(progressBetween(seconds, 12.1, 14.0));
  const headingDeg = U_END_DEG * (1 - settle);
  const centerX = FINAL_END_SAMPLE.centerX + (X_GUIDE + HALF_CAR_W + 10 - FINAL_END_SAMPLE.centerX) * settle;
  const centerY = FINAL_END_SAMPLE.centerY + (182 - FINAL_END_SAMPLE.centerY) * settle;
  const hRad = degToRad(headingDeg);

  const cornerB: Point2D = {
    x: centerX + -HALF_CAR_W * Math.cos(hRad) - -(CAR_LENGTH * 0.5) * Math.sin(hRad),
    y: centerY + -HALF_CAR_W * Math.sin(hRad) + -(CAR_LENGTH * 0.5) * Math.cos(hRad),
  };
  const cornerC: Point2D = {
    x: centerX + -HALF_CAR_W * Math.cos(hRad) - CAR_LENGTH * 0.5 * Math.sin(hRad),
    y: centerY + -HALF_CAR_W * Math.sin(hRad) + CAR_LENGTH * 0.5 * Math.cos(hRad),
  };

  return {
    centerX,
    centerY,
    headingDeg,
    steerDeg: -28 * Math.sin(degToRad(U_END_DEG)) * (1 - settle),
    cornerB,
    cornerC,
    wheelRollDistance: 486 + 18 * settle,
  };
}

function buildTractrixCurvePolyline(seconds: number): string {
  if (seconds < 4.55) {
    return "";
  }
  const u = easeInOutCubic(progressBetween(seconds, 4.55, 12.1));
  const endUDeg = U_START_DEG + (U_END_DEG - U_START_DEG) * u;
  const points: string[] = [];
  const stepDeg = 1.2;

  for (let deg = U_START_DEG; deg >= endUDeg; deg -= stepDeg) {
    const pt = sampleTractrixGeometry(deg).cornerC;
    points.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  }

  const exactEnd = sampleTractrixGeometry(endUDeg).cornerC;
  points.push(`${exactEnd.x.toFixed(1)},${exactEnd.y.toFixed(1)}`);
  return points.join(" ");
}

export function Slide16Tractrix(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.8));

  const frame = computeSlide16Frame(elapsedSeconds);
  const ackermann = computeAckermannAngles(frame.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);
  const tractrixPolyline = useMemo(() => buildTractrixCurvePolyline(elapsedSeconds), [elapsedSeconds]);

  // Progressive visual highlights aligned to narration
  const guideHighlight = pulseEnvelope(elapsedSeconds, 4.5, 5.2, 7.6, 8.5);
  const bPulse = pulseFactor(elapsedSeconds, 6.2, 0.7);
  const cPulse = pulseFactor(elapsedSeconds, 9.0, 0.7);
  const tractrixGlow = pulseEnvelope(elapsedSeconds, 8.6, 9.5, 14.5, 17.5);
  const tractrixLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 9.8, 10.9));

  // Progress of uDeg along the tractrix for revealing the family of orthogonal circles
  const tractrixProgress = easeInOutCubic(progressBetween(elapsedSeconds, 4.55, 12.1));
  const currentUDeg = U_START_DEG + (U_END_DEG - U_START_DEG) * tractrixProgress;
  const showLiveOrthogonalRadius = elapsedSeconds >= 4.55 && elapsedSeconds < 12.4;

  // Orthogonal right-angle marker between live tangent radius C->B and vertical/curve normal
  const liveU = degToRad(currentUDeg);
  const tangentDirX = Math.sin(liveU);
  const tangentDirY = -Math.cos(liveU);
  const orthoPerpX = tangentDirY;
  const orthoPerpY = -tangentDirX;
  const tickLen = 9;
  const liveOrthoCornerPath = [
    `M ${(frame.cornerC.x + tangentDirX * tickLen).toFixed(1)} ${(frame.cornerC.y + tangentDirY * tickLen).toFixed(1)}`,
    `L ${(frame.cornerC.x + tangentDirX * tickLen + orthoPerpX * tickLen).toFixed(1)} ${(frame.cornerC.y + tangentDirY * tickLen + orthoPerpY * tickLen).toFixed(1)}`,
    `L ${(frame.cornerC.x + orthoPerpX * tickLen).toFixed(1)} ${(frame.cornerC.y + orthoPerpY * tickLen).toFixed(1)}`,
  ].join(" ");

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">16</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Nose-First Bay Parking &amp; The Tractrix
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Multi-storey carpark bay EFGH showing front corner B tracking straight guide line EF while rear corner C
          traces an orthogonal tractrix across a family of circles
        </title>
        <defs>
          <radialGradient id="slide16-ambient-glow" cx="52%" cy="48%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide16-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide16-floor-fade-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="12%" stopColor="white" stopOpacity={1} />
            <stop offset="88%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide16-floor-fade-mask">
            <rect x={140} y={40} width={740} height={510} fill="url(#slide16-floor-fade-grad)" />
          </mask>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={305} r={315} fill="url(#slide16-ambient-glow)" />

        {/* ================================================================
            MULTI-STOREY CARPARK FLOOR & PERPENDICULAR BAYS
           ================================================================ */}
        <g opacity={stageFadeIn} mask="url(#slide16-floor-fade-mask)">
          {/* Concrete Carpark Deck */}
          <rect x={160} y={84} width={700} height={416} fill="oklch(0.165 0 0)" />

          {/* Top Structural Concrete Wheel-Stop Kerb */}
          <rect x={160} y={84} width={700} height={11} fill="oklch(0.26 0 0)" />
          <line x1={160} y1={95} x2={860} y2={95} stroke="oklch(0.68 0 0 / 0.55)" strokeWidth={1.5} />

          {/* Bottom Driving Aisle Centerline */}
          <line
            x1={180}
            y1={408}
            x2={840}
            y2={408}
            stroke="oklch(0.7 0 0 / 0.25)"
            strokeWidth={1.5}
            strokeDasharray="20 18"
          />

          {/* Parking Bay Stall Divider Lines */}
          <g stroke="oklch(0.68 0 0 / 0.34)" strokeWidth={1.4}>
            {BAY_DIVIDERS_X.map((bx) => (
              <line key={`bay-${bx}`} x1={bx} y1={BAY_TOP_Y} x2={bx} y2={BAY_BOT_Y} />
            ))}
          </g>

          {/* Highlighted Target Bay EFGH */}
          <rect
            x={X_GUIDE}
            y={BAY_TOP_Y}
            width={BAY_WIDTH}
            height={BAY_BOT_Y - BAY_TOP_Y}
            fill="oklch(0.95 0 0 / 0.04)"
            stroke="oklch(0.88 0 0 / 0.5)"
            strokeWidth={1.3}
          />

          {/* Neighboring Parked Cars in Multi-Storey Bays */}
          <g transform={`translate(315, 184) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
          <g transform={`translate(675, 184) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
          <g transform={`translate(765, 184) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* ================================================================
            FIGURE 6: FAMILY OF CIRCLES CENTERED ALONG GUIDE LINE EF
           ================================================================ */}
        {elapsedSeconds >= 4.55 ? (
          <g>
            {FAMILY_CIRCLE_ANGLES_DEG.map((deg) => {
              const centerB = sampleTractrixGeometry(deg).cornerB;
              const isReached = currentUDeg <= deg + 1;
              const appear = easeOutCubic(progressBetween(deg + 2 - currentUDeg, 0, 8));
              if (!isReached || appear <= 0.01) {
                return null;
              }
              return (
                <g key={`fam-${deg}`} opacity={appear}>
                  <circle
                    cx={centerB.x}
                    cy={centerB.y}
                    r={CAR_LENGTH}
                    fill="none"
                    stroke="oklch(0.84 0 0 / 0.24)"
                    strokeWidth={1.1}
                    strokeDasharray="3 5"
                  />
                  <circle cx={centerB.x} cy={centerB.y} r={2.2} fill="oklch(0.84 0 0 / 0.55)" />
                </g>
              );
            })}
          </g>
        ) : null}

        {/* Straight Guide Line Extension Along EF */}
        <line
          x1={X_GUIDE}
          y1={BAY_TOP_Y}
          x2={X_GUIDE}
          y2={425}
          stroke={`oklch(0.96 0 0 / ${(0.35 + 0.65 * guideHighlight).toFixed(2)})`}
          strokeWidth={1.5 + 0.9 * guideHighlight}
          strokeDasharray="5 5"
          opacity={stageFadeIn}
          filter={guideHighlight > 0.2 ? "url(#slide16-luminous-glow)" : undefined}
        />

        {/* Live Orthogonal Radius Segment B -> C & Right-Angle Tick */}
        {showLiveOrthogonalRadius ? (
          <g>
            <circle
              cx={frame.cornerB.x}
              cy={frame.cornerB.y}
              r={CAR_LENGTH}
              fill="none"
              stroke="oklch(0.92 0 0 / 0.32)"
              strokeWidth={1.2}
            />
            <line
              x1={frame.cornerB.x}
              y1={frame.cornerB.y}
              x2={frame.cornerC.x}
              y2={frame.cornerC.y}
              stroke="oklch(0.96 0 0 / 0.72)"
              strokeWidth={1.4}
              strokeDasharray="4 4"
            />
            <path d={liveOrthoCornerPath} fill="none" stroke="oklch(0.98 0 0 / 0.85)" strokeWidth={1.3} />
          </g>
        ) : null}

        {/* ================================================================
            SWEPT ORTHOGONAL TRACTRIX CURVE TRACED BY CORNER C
           ================================================================ */}
        {tractrixPolyline ? (
          <polyline
            points={tractrixPolyline}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.4 + 0.7 * tractrixGlow}
            strokeLinecap="round"
            filter="url(#slide16-luminous-glow)"
          />
        ) : null}

        {tractrixLabelOpacity > 0.01 ? (
          <text
            x={376}
            y={346}
            textAnchor="end"
            opacity={tractrixLabelOpacity}
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tracking-mono"
          >
            TRACTRIX
          </text>
        ) : null}

        {/* ================================================================
            HERO 2D CUT-PLANE CAR TURNING NOSE-FIRST INTO BAY EFGH
           ================================================================ */}
        <g transform={`translate(${frame.centerX}, ${frame.centerY}) rotate(${frame.headingDeg}) scale(${CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ackermann.frontLeftSteerDeg}
            frontRightSteerDeg={ackermann.frontRightSteerDeg}
            wheelRollDistance={frame.wheelRollDistance}
            isReversing={false}
            isBraking={elapsedSeconds >= 13.8}
          />
        </g>

        {/* ================================================================
            BAY CORNERS E, F, G, H & LIVE CORNERS B, C
           ================================================================ */}
        <g opacity={stageFadeIn} className="font-mono text-xs font-semibold">
          <circle cx={POINT_E.x} cy={POINT_E.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_E.x - 10} y={POINT_E.y - 6} textAnchor="end" className="fill-text-secondary">
            E
          </text>

          <circle cx={POINT_F.x} cy={POINT_F.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_F.x + 10} y={POINT_F.y + 15} textAnchor="start" className="fill-text-secondary">
            F
          </text>

          <circle cx={POINT_G.x} cy={POINT_G.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_G.x + 8} y={POINT_G.y + 15} textAnchor="start" className="fill-text-secondary">
            G
          </text>

          <circle cx={POINT_H.x} cy={POINT_H.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_H.x + 8} y={POINT_H.y - 6} textAnchor="start" className="fill-text-secondary">
            H
          </text>
        </g>

        {/* Live Front Corner B Tracking Straight Line EF */}
        <g transform={`translate(${frame.cornerB.x}, ${frame.cornerB.y})`} opacity={stageFadeIn}>
          {bPulse > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={8 + 8 * bPulse}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.3}
              opacity={bPulse}
            />
          ) : null}
          <circle cx={0} cy={0} r={4.2 + 1.4 * bPulse} fill="oklch(0.99 0 0)" filter="url(#slide16-luminous-glow)" />
          <text
            x={14}
            y={4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            B
          </text>
        </g>

        {/* Live Rear Corner C Tracing the Tractrix */}
        <g transform={`translate(${frame.cornerC.x}, ${frame.cornerC.y})`} opacity={stageFadeIn}>
          {cPulse > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={8 + 8 * cPulse}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.3}
              opacity={cPulse}
            />
          ) : null}
          <circle cx={0} cy={0} r={4.2 + 1.4 * cPulse} fill="oklch(0.99 0 0)" filter="url(#slide16-luminous-glow)" />
          <text
            x={-14}
            y={12}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            C
          </text>
        </g>
      </svg>
    </div>
  );
}
