import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { RoadStage } from "@/components/road-stage";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

// Exact Figure 2 geometry aligned with RoadStage bay (center x = 627) so all 3 concentric circles fit inside 960x620
const PARALLEL_CENTER_X = 627;
const PARALLEL_CENTER_Y = 324;
const REAR_AXLE_Y = PARALLEL_CENTER_Y + DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 376
const TURNING_CENTER: Point2D = { x: 475, y: REAR_AXLE_Y }; // (475, 376)

const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5; // 38
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5; // 84
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth; // 31
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 52

const REAR_TO_CENTER_DX = PARALLEL_CENTER_X - TURNING_CENTER.x; // 152
const VIRTUAL_STEER_DEG = -((Math.atan2(DEFAULT_VEHICLE_DIMENSIONS.wheelbase, REAR_TO_CENTER_DX) * 180) / Math.PI); // -34.38 deg
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

// Exact concentric radii around turning center X(475, 376)
const RADIUS_FX = PARALLEL_CENTER_X + TRACK_HALF_W - TURNING_CENTER.x; // 183
const RADIUS_EX = Math.hypot(RADIUS_FX, -DEFAULT_VEHICLE_DIMENSIONS.wheelbase); // 210.487
const RADIUS_AX = Math.hypot(
  PARALLEL_CENTER_X + HALF_W - TURNING_CENTER.x,
  PARALLEL_CENTER_Y - HALF_L - TURNING_CENTER.y,
); // 233.658

// Front parked car rear-left corner G positioned on the exact outer circle (radius = RADIUS_AX)
const POINT_G_X = PARALLEL_CENTER_X - HALF_W; // 589
const POINT_G_Y = TURNING_CENTER.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - TURNING_CENTER.x) ** 2); // 172.039
const FRONT_PARKED_CENTER_Y = POINT_G_Y - HALF_L; // 88.039
const REAR_PARKED_CENTER_Y = 520;

const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_A_PARALLEL: Point2D = { x: PARALLEL_CENTER_X + HALF_W, y: PARALLEL_CENTER_Y - HALF_L }; // (665, 240)
const POINT_E_PARALLEL: Point2D = { x: PARALLEL_CENTER_X + TRACK_HALF_W, y: PARALLEL_CENTER_Y - WHEEL_HALF_L }; // (658, 272)

const ANGLE_A_PARALLEL_DEG =
  (Math.atan2(POINT_A_PARALLEL.y - TURNING_CENTER.y, POINT_A_PARALLEL.x - TURNING_CENTER.x) * 180) / Math.PI;
const ANGLE_E_PARALLEL_DEG =
  (Math.atan2(POINT_E_PARALLEL.y - TURNING_CENTER.y, POINT_E_PARALLEL.x - TURNING_CENTER.x) * 180) / Math.PI;
const ANGLE_F_PARALLEL_DEG = 0;
const ANGLE_G_DEG = (Math.atan2(POINT_G.y - TURNING_CENTER.y, POINT_G.x - TURNING_CENTER.x) * 180) / Math.PI;
const GRAZE_HEADING_DEG = ANGLE_G_DEG - ANGLE_A_PARALLEL_DEG; // -25.203 deg

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

function rotateLocalPointAroundX(localX: number, localY: number, headingDeg: number): Point2D {
  const theta = degToRad(headingDeg);
  const baseWorldX = PARALLEL_CENTER_X + localX;
  const baseWorldY = PARALLEL_CENTER_Y + localY;
  const vx = baseWorldX - TURNING_CENTER.x;
  const vy = baseWorldY - TURNING_CENTER.y;
  return {
    x: TURNING_CENTER.x + vx * Math.cos(theta) - vy * Math.sin(theta),
    y: TURNING_CENTER.y + vx * Math.sin(theta) + vy * Math.cos(theta),
  };
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
  const largeArcFlag = Math.abs(delta) > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function buildCongruenceTicks(p1: Point2D, p2: Point2D): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) {
    return "";
  }
  const tx = dx / len;
  const ty = dy / len;
  const nx = -ty;
  const ny = tx;
  const mx = (p1.x + p2.x) * 0.5;
  const my = (p1.y + p2.y) * 0.5;

  const t1x = mx - tx * 3;
  const t1y = my - ty * 3;
  const t2x = mx + tx * 3;
  const t2y = my + ty * 3;

  return [
    `M ${(t1x - nx * 6).toFixed(1)} ${(t1y - ny * 6).toFixed(1)} L ${(t1x + nx * 6).toFixed(1)} ${(t1y + ny * 6).toFixed(1)}`,
    `M ${(t2x - nx * 6).toFixed(1)} ${(t2y - ny * 6).toFixed(1)} L ${(t2x + nx * 6).toFixed(1)} ${(t2y + ny * 6).toFixed(1)}`,
  ].join(" ");
}

interface ConcentricCircleProps {
  readonly radius: number;
  readonly startDeg: number;
  readonly drawProgress: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeDasharray?: string;
  readonly luminous?: boolean;
}

function ConcentricCircle({
  radius,
  startDeg,
  drawProgress,
  stroke,
  strokeWidth,
  strokeDasharray,
  luminous = false,
}: ConcentricCircleProps): ReactElement | null {
  if (drawProgress <= 0.01) {
    return null;
  }

  const filterAttr = luminous ? "url(#slide07-luminous-glow)" : undefined;

  if (drawProgress >= 0.995) {
    return (
      <circle
        cx={TURNING_CENTER.x}
        cy={TURNING_CENTER.y}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        filter={filterAttr}
      />
    );
  }

  const pathD = buildArcSweep(TURNING_CENTER, radius, startDeg, startDeg + 359.2 * drawProgress);
  return (
    <path
      d={pathD}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      filter={filterAttr}
    />
  );
}

interface VertexMarkerProps {
  readonly point: Point2D;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly opacity: number;
  readonly pulse: number;
}

function VertexMarker({
  point,
  label,
  labelX,
  labelY,
  textAnchor,
  opacity,
  pulse,
}: VertexMarkerProps): ReactElement | null {
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
        filter={pulse > 0.1 ? "url(#slide07-luminous-glow)" : undefined}
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

export function Slide07Circles(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0.00s - 4.76s): Car finishes reversing parallel to kerb (-15 deg -> 0 deg)
  // Beat 2-3 (5.38s - 26.40s): Car demonstrates full arc (-44 deg -> 0 deg), grazing G right at 20.60s
  let headingDeg = 0;
  let heroOpacity = 1;
  let isReversing = false;
  let isBraking = false;

  if (elapsedSeconds < 4.9) {
    const finishPull = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 4.3));
    headingDeg = -15 * (1 - finishPull);
    isReversing = elapsedSeconds < 4.25;
    isBraking = elapsedSeconds >= 4.25;
    heroOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 4.7, 4.9));
  } else if (elapsedSeconds < 5.35) {
    headingDeg = -44;
    heroOpacity = easeOutCubic(progressBetween(elapsedSeconds, 5.05, 5.35));
    isReversing = false;
  } else {
    const sweep1 = progressBetween(elapsedSeconds, 5.4, 20.6); // -44 -> -25.203 (grazes G at 20.60s)
    const sweep2 = easeOutCubic(progressBetween(elapsedSeconds, 20.6, 26.2)); // -25.203 -> 0 parallel
    if (elapsedSeconds <= 20.6) {
      headingDeg = -44 + (GRAZE_HEADING_DEG - -44) * sweep1;
      isReversing = true;
    } else {
      headingDeg = GRAZE_HEADING_DEG * (1 - sweep2);
      isReversing = elapsedSeconds < 26.15;
      isBraking = elapsedSeconds >= 26.15;
    }
  }

  const wheelRollDistance = -REAR_TO_CENTER_DX * degToRad(headingDeg + 44);
  const carCenter = rotateLocalPointAroundX(0, 0, headingDeg);
  const pointA = rotateLocalPointAroundX(HALF_W, -HALF_L, headingDeg);
  const pointE = rotateLocalPointAroundX(TRACK_HALF_W, -WHEEL_HALF_L, headingDeg);
  const pointF = rotateLocalPointAroundX(TRACK_HALF_W, WHEEL_HALF_L, headingDeg);

  // Target parallel Ghost remains subtly visible once the demonstration sweep begins
  const parallelGhostOpacity = elapsedSeconds >= 5.05 ? 0.34 : 0;

  // Turning center X appears on "around center X" (5.38s - 7.36s)
  const xOpacity = easeOutCubic(progressBetween(elapsedSeconds, 5.2, 6.2));
  const xPulse = Math.max(pulseFactor(elapsedSeconds, 7.15, 0.6), pulseFactor(elapsedSeconds, 32.1, 0.65));

  // Two inner dashed circles (E and F) draw cleanly during 7.6s - 11.44s
  const wheelLabelsOpacity = easeOutCubic(progressBetween(elapsedSeconds, 7.8, 8.6));
  const dashedCircleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 8.2, 11.4));
  const ePulse = pulseFactor(elapsedSeconds, 8.55, 0.55);
  const fPulse = pulseFactor(elapsedSeconds, 9.12, 0.55);

  // Outer circle for corner A draws cleanly during 12.6s - 16.2s
  const aLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 12.6, 13.4));
  const outerCircleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 13.6, 16.2));
  const aPulse = Math.max(
    pulseFactor(elapsedSeconds, 13.7, 0.55),
    pulseFactor(elapsedSeconds, 19.65, 0.55),
    pulseFactor(elapsedSeconds, 24.72, 0.55),
    pulseFactor(elapsedSeconds, 28.6, 0.65),
  );

  // Active sweep arc trail traced by corner A as it approaches and clears G
  const liveSweepStartHeading = -44;
  const showActiveTrail = elapsedSeconds >= 12.8;
  const trailEndDeg = ANGLE_A_PARALLEL_DEG + headingDeg;
  const trailStartDeg = ANGLE_A_PARALLEL_DEG + liveSweepStartHeading;
  const activeTrailPath =
    showActiveTrail && trailEndDeg > trailStartDeg
      ? buildArcSweep(TURNING_CENTER, RADIUS_AX, trailStartDeg, trailEndDeg)
      : "";

  // Grazing corner G highlights at 18.8s - 23.3s ("just barely miss the corner G") and again on 26.2s+
  const gOpacity = easeOutCubic(progressBetween(elapsedSeconds, 18.2, 19.2));
  const gPulse = Math.max(
    pulseFactor(elapsedSeconds, 20.6, 0.85),
    pulseFactor(elapsedSeconds, 21.75, 0.6),
    pulseFactor(elapsedSeconds, 26.4, 0.6),
    pulseFactor(elapsedSeconds, 29.36, 0.65),
  );

  // Beat 4 (26.6s - 34.0s): Equal-radius proof lines XA and XG draw out from X
  const equalRadiiDraw = easeInOutCubic(progressBetween(elapsedSeconds, 27.4, 30.2));
  const equalLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 29.8, 31.0));
  const arcBetweenGA = buildArcSweep(TURNING_CENTER, RADIUS_AX, ANGLE_G_DEG, ANGLE_A_PARALLEL_DEG);
  const ticksXA = buildCongruenceTicks(TURNING_CENTER, POINT_A_PARALLEL);
  const ticksXG = buildCongruenceTicks(TURNING_CENTER, POINT_G);

  // Outward normal unit vector for clean moving car vertex labels (A, E, F)
  const hRad = degToRad(headingDeg);
  const outX = Math.cos(hRad);
  const outY = Math.sin(hRad);
  const fwdX = Math.sin(hRad);
  const fwdY = -Math.cos(hRad);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">07</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Concentric Turning Circles
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Figure 2 concentric turning circles centered at X for wheels E, F and outer corner A grazing corner G
        </title>
        <defs>
          <radialGradient id="slide07-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide07-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide07-ambient-glow)" />

        {/* Architectural Two-Lane Road Stage */}
        <RoadStage showTangentGuide={elapsedSeconds >= 4.0} />

        {/* Parked Car in Front (Rear-left corner G sits on outer circle) */}
        <g transform={`translate(${PARALLEL_CENTER_X}, ${FRONT_PARKED_CENTER_Y})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Parked Car Behind */}
        <g transform={`translate(${PARALLEL_CENTER_X}, ${REAR_PARKED_CENTER_Y})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Parallel Finish Ghost Outline During Sweep */}
        {parallelGhostOpacity > 0.01 ? (
          <g transform={`translate(${PARALLEL_CENTER_X}, ${PARALLEL_CENTER_Y})`} opacity={parallelGhostOpacity}>
            <CutPlaneCar
              variant={CarSectionVariants.Ghost}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        ) : null}

        {/* ================================================================
            CONCENTRIC TURNING CIRCLES CENTERED AT X
           ================================================================ */}
        {/* Inner Dashed Circle (Wheel F) */}
        <ConcentricCircle
          radius={RADIUS_FX}
          startDeg={ANGLE_F_PARALLEL_DEG + headingDeg}
          drawProgress={dashedCircleDraw}
          stroke="oklch(0.76 0 0 / 0.45)"
          strokeWidth={1.3}
          strokeDasharray="5 5"
        />

        {/* Middle Dashed Circle (Wheel E) */}
        <ConcentricCircle
          radius={RADIUS_EX}
          startDeg={ANGLE_E_PARALLEL_DEG + headingDeg}
          drawProgress={dashedCircleDraw}
          stroke="oklch(0.84 0 0 / 0.55)"
          strokeWidth={1.4}
          strokeDasharray="5 5"
        />

        {/* Outer Circle (Front Corner A Passing Through G) */}
        <ConcentricCircle
          radius={RADIUS_AX}
          startDeg={ANGLE_A_PARALLEL_DEG + headingDeg}
          drawProgress={outerCircleDraw}
          stroke="oklch(0.92 0 0 / 0.65)"
          strokeWidth={1.5}
        />

        {/* Luminous Swept Outer Arc Trace */}
        {activeTrailPath ? (
          <path
            d={activeTrailPath}
            fill="none"
            stroke="oklch(0.98 0 0)"
            strokeWidth={2.2}
            filter="url(#slide07-luminous-glow)"
          />
        ) : null}

        {/* Live Rear Axle Line Extending to X */}
        {xOpacity > 0.01 ? (
          <line
            x1={pointF.x}
            y1={pointF.y}
            x2={TURNING_CENTER.x}
            y2={TURNING_CENTER.y}
            stroke="oklch(0.86 0 0 / 0.45)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            opacity={xOpacity}
          />
        ) : null}

        {/* ================================================================
            EQUAL RADII PROOF: |AX| = |GX| (27.4s - 34.0s)
           ================================================================ */}
        {equalRadiiDraw > 0.01 ? (
          <g>
            {/* Highlighted Arc Segment Directly Joining G and A */}
            <path
              d={arcBetweenGA}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={2.6}
              opacity={equalRadiiDraw}
              filter="url(#slide07-luminous-glow)"
            />

            {/* Radius XA */}
            <line
              x1={TURNING_CENTER.x}
              y1={TURNING_CENTER.y}
              x2={POINT_A_PARALLEL.x}
              y2={POINT_A_PARALLEL.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.9}
              strokeDasharray={RADIUS_AX}
              strokeDashoffset={RADIUS_AX * (1 - equalRadiiDraw)}
              filter="url(#slide07-luminous-glow)"
            />

            {/* Radius XG */}
            <line
              x1={TURNING_CENTER.x}
              y1={TURNING_CENTER.y}
              x2={POINT_G.x}
              y2={POINT_G.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.9}
              strokeDasharray={RADIUS_AX}
              strokeDashoffset={RADIUS_AX * (1 - equalRadiiDraw)}
              filter="url(#slide07-luminous-glow)"
            />

            {/* Congruence Tick Marks + Equality Badge */}
            {equalLabelOpacity > 0.01 ? (
              <g opacity={equalLabelOpacity}>
                <path d={ticksXA} fill="none" stroke="oklch(0.98 0 0)" strokeWidth={1.6} strokeLinecap="round" />
                <path d={ticksXG} fill="none" stroke="oklch(0.98 0 0)" strokeWidth={1.6} strokeLinecap="round" />

                <rect
                  x={702}
                  y={192}
                  width={106}
                  height={30}
                  rx={6}
                  fill="oklch(0.22 0 0 / 0.94)"
                  stroke="oklch(0.96 0 0 / 0.88)"
                  strokeWidth={1.4}
                />
                <text
                  x={755}
                  y={212}
                  textAnchor="middle"
                  className="fill-text-primary font-mono text-sm font-semibold tracking-mono"
                >
                  |AX| = |GX|
                </text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            HERO 2D CUT-PLANE SPORTS COUPE
           ================================================================ */}
        <g transform={`translate(${carCenter.x}, ${carCenter.y}) rotate(${headingDeg})`} opacity={heroOpacity}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ACKERMANN.frontLeftSteerDeg}
            frontRightSteerDeg={ACKERMANN.frontRightSteerDeg}
            wheelRollDistance={wheelRollDistance}
            isReversing={isReversing}
            isBraking={isBraking}
          />
        </g>

        {/* ================================================================
            TURNING CENTER X NODE
           ================================================================ */}
        {xOpacity > 0.01 ? (
          <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={xOpacity}>
            {xPulse > 0.04 ? (
              <circle
                cx={0}
                cy={0}
                r={20 + 10 * xPulse}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.4}
                opacity={xPulse * 0.85}
              />
            ) : null}
            <polygon
              points="0,-18 15.6,-9 15.6,9 0,18 -15.6,9 -15.6,-9"
              fill="oklch(0.24 0 0 / 0.94)"
              stroke="oklch(0.94 0 0 / 0.9)"
              strokeWidth={1.4}
            />
            <circle cx={0} cy={0} r={5 + 1.5 * xPulse} fill="oklch(0.98 0 0)" filter="url(#slide07-luminous-glow)" />
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
        ) : null}

        {/* ================================================================
            LIVE GEOMETRIC VERTEX MARKERS: E, F, A, G
           ================================================================ */}
        <VertexMarker
          point={pointE}
          label="E"
          labelX={pointE.x + outX * 18}
          labelY={pointE.y + outY * 18 + 4}
          textAnchor="start"
          opacity={wheelLabelsOpacity * heroOpacity}
          pulse={ePulse}
        />
        <VertexMarker
          point={pointF}
          label="F"
          labelX={pointF.x + outX * 18}
          labelY={pointF.y + outY * 18 + 4}
          textAnchor="start"
          opacity={wheelLabelsOpacity * heroOpacity}
          pulse={fPulse}
        />
        <VertexMarker
          point={pointA}
          label="A"
          labelX={pointA.x + outX * 14 + fwdX * 10}
          labelY={pointA.y + outY * 14 + fwdY * 10 + 4}
          textAnchor="start"
          opacity={aLabelOpacity * heroOpacity}
          pulse={aPulse}
        />
        <VertexMarker
          point={POINT_G}
          label="G"
          labelX={POINT_G.x - 13}
          labelY={POINT_G.y - 10}
          textAnchor="end"
          opacity={gOpacity}
          pulse={gPulse}
        />
      </svg>
    </div>
  );
}
