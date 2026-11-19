import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { MasterFormula } from "@/components/math-formula";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import type { ReactElement } from "react";

const CAR_SCALE = 1.48;
const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * CAR_SCALE; // 56.24
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * CAR_SCALE; // 124.32
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE; // 45.88
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE; // 76.96

// Figure 2 Geometry placed on the right side of the 1280x720 16:9 canvas with generous edge margins
const PARALLEL_CENTER_X = 975;
const PARALLEL_CENTER_Y = 398;
const REAR_AXLE_Y = PARALLEL_CENTER_Y + WHEEL_HALF_L; // 474.96
const TURNING_CENTER: Point2D = { x: 745, y: REAR_AXLE_Y }; // (745, 474.96)

const KERB_LINE_X = PARALLEL_CENTER_X + HALF_W; // 1031.24
const ROAD_LINE_X = PARALLEL_CENTER_X - HALF_W; // 918.76
const KERB_STONE_X = 1037;
const PARKING_LINE_X = 915;
const LANE_DIVIDER_X = 765;
const ASPHALT_LEFT_X = 615;

const REAR_TO_CENTER_DX = PARALLEL_CENTER_X - TURNING_CENTER.x; // 230
const VIRTUAL_STEER_DEG = -(
  (Math.atan2(DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE, REAR_TO_CENTER_DX) * 180) /
  Math.PI
);
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

// Exact concentric radii around turning center X(745, 474.96)
const RADIUS_FX = PARALLEL_CENTER_X + TRACK_HALF_W - TURNING_CENTER.x; // 275.88
const RADIUS_EX = Math.hypot(RADIUS_FX, -(DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE)); // 315.91
const RADIUS_AX = Math.hypot(KERB_LINE_X - TURNING_CENTER.x, PARALLEL_CENTER_Y - HALF_L - TURNING_CENTER.y); // 349.92

// Front parked car rear-left corner G on the exact outer turning circle
const POINT_G_X = ROAD_LINE_X; // 918.76
const POINT_G_Y = TURNING_CENTER.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - TURNING_CENTER.x) ** 2); // 171.23
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_H: Point2D = { x: KERB_LINE_X, y: POINT_G_Y };
const FRONT_PARKED_CENTER_Y = POINT_G_Y - HALF_L; // 46.91
const REAR_PARKED_CENTER_Y = 652;

const POINT_A_PARALLEL: Point2D = { x: KERB_LINE_X, y: PARALLEL_CENTER_Y - HALF_L }; // (1031.24, 273.68)
const CLEARANCE_HEIGHT = POINT_A_PARALLEL.y - POINT_G_Y; // 102.45

// Hero car frozen earlier in the reverse arc so corner A cleanly approaches G without label overlap
const HERO_HEADING_DEG = -38;

const GRID_X = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960, 1040, 1120, 1200] as const;
const GRID_Y = [80, 160, 240, 320, 400, 480, 560, 640] as const;
const KERB_JOINT_Y = [60, 140, 220, 300, 380, 460, 540, 620] as const;
const PAVING_JOINT_Y = [80, 168, 256, 344, 432, 520, 608] as const;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotatePointAroundX(worldX: number, worldY: number, headingDeg: number): Point2D {
  const rad = degToRad(headingDeg);
  const dx = worldX - TURNING_CENTER.x;
  const dy = worldY - TURNING_CENTER.y;
  return {
    x: TURNING_CENTER.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: TURNING_CENTER.y + dx * Math.sin(rad) + dy * Math.cos(rad),
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
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

const HERO_CENTER = rotatePointAroundX(PARALLEL_CENTER_X, PARALLEL_CENTER_Y, HERO_HEADING_DEG);
const HERO_CORNER_A = rotatePointAroundX(POINT_A_PARALLEL.x, POINT_A_PARALLEL.y, HERO_HEADING_DEG);
const HERO_WHEEL_E = rotatePointAroundX(
  PARALLEL_CENTER_X + TRACK_HALF_W,
  PARALLEL_CENTER_Y - WHEEL_HALF_L,
  HERO_HEADING_DEG,
);
const HERO_WHEEL_F = rotatePointAroundX(PARALLEL_CENTER_X + TRACK_HALF_W, REAR_AXLE_Y, HERO_HEADING_DEG);

const ANGLE_A_PARALLEL_DEG =
  (Math.atan2(POINT_A_PARALLEL.y - TURNING_CENTER.y, POINT_A_PARALLEL.x - TURNING_CENTER.x) * 180) / Math.PI;
const ANGLE_A_HERO_DEG =
  (Math.atan2(HERO_CORNER_A.y - TURNING_CENTER.y, HERO_CORNER_A.x - TURNING_CENTER.x) * 180) / Math.PI;

const OUTER_CIRCLE_ARC = buildArcSweep(TURNING_CENTER, RADIUS_AX, -104, 18);
const WHEEL_E_ARC = buildArcSweep(TURNING_CENTER, RADIUS_EX, -98, 22);
const WHEEL_F_ARC = buildArcSweep(TURNING_CENTER, RADIUS_FX, -92, 26);
const ACTIVE_GRAZE_ARC = buildArcSweep(TURNING_CENTER, RADIUS_AX, ANGLE_A_HERO_DEG - 10, ANGLE_A_PARALLEL_DEG);

export function SlideThumbnail(): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-surface-sunken">
      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" className="h-full w-full select-none">
        <title>YouTube Thumbnail — The Geometry of Perfect Parking</title>
        <defs>
          <radialGradient id="thumb-bg-vignette" cx="62%" cy="50%" r="65%">
            <stop offset="0%" stopColor="oklch(0.25 0 0)" />
            <stop offset="55%" stopColor="oklch(0.18 0 0)" />
            <stop offset="100%" stopColor="oklch(0.12 0 0)" />
          </radialGradient>

          <radialGradient id="thumb-hero-spot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.95 0 0 / 0.12)" />
            <stop offset="55%" stopColor="oklch(0.75 0 0 / 0.04)" />
            <stop offset="100%" stopColor="oklch(0.2 0 0 / 0)" />
          </radialGradient>

          <linearGradient id="thumb-road-asphalt" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.135 0 0)" />
            <stop offset="20%" stopColor="oklch(0.16 0 0)" />
            <stop offset="55%" stopColor="oklch(0.17 0 0)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0)" />
          </linearGradient>

          <linearGradient id="thumb-sidewalk-right" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.9)" />
            <stop offset="55%" stopColor="oklch(0.18 0 0 / 0.4)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </linearGradient>

          <linearGradient id="thumb-sidewalk-left" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.2 0 0 / 0.72)" />
            <stop offset="55%" stopColor="oklch(0.17 0 0 / 0.25)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </linearGradient>

          <linearGradient id="thumb-road-fade-mask-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="8%" stopColor="white" stopOpacity={1} />
            <stop offset="92%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="thumb-road-mask">
            <rect x={460} y={0} width={820} height={720} fill="url(#thumb-road-fade-mask-grad)" />
          </mask>

          <filter id="thumb-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="thumb-soft-drop" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="oklch(0 0 0 / 0.7)" />
          </filter>

          <CutPlaneCarDefs />
        </defs>

        {/* Full-Bleed Obsidian Background */}
        <rect x={0} y={0} width={1280} height={720} fill="url(#thumb-bg-vignette)" />

        {/* Subtle Architectural Coordinate Grid */}
        <g stroke="oklch(0.85 0 0 / 0.045)" strokeWidth={1}>
          {GRID_X.map((gx) => (
            <line key={`gx-${gx}`} x1={gx} y1={0} x2={gx} y2={720} />
          ))}
          {GRID_Y.map((gy) => (
            <line key={`gy-${gy}`} x1={0} y1={gy} x2={1280} y2={gy} />
          ))}
        </g>

        {/* ================================================================
            RIGHT COMPOSITION: ARCHITECTURAL ROAD STAGE & FIGURE 2 GEOMETRY
           ================================================================ */}
        <circle cx={910} cy={350} r={420} fill="url(#thumb-hero-spot)" />

        <g mask="url(#thumb-road-mask)">
          {/* Left Shoulder */}
          <rect x={ASPHALT_LEFT_X - 110} y={0} width={104} height={720} fill="url(#thumb-sidewalk-left)" />
          <rect x={ASPHALT_LEFT_X - 6} y={0} width={6} height={720} fill="oklch(0.26 0 0)" />
          <line
            x1={ASPHALT_LEFT_X}
            y1={0}
            x2={ASPHALT_LEFT_X}
            y2={720}
            stroke="oklch(0.55 0 0 / 0.45)"
            strokeWidth={1.3}
          />

          {/* Right Sidewalk */}
          <rect x={KERB_STONE_X + 9} y={0} width={235} height={720} fill="url(#thumb-sidewalk-right)" />
          <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
            {PAVING_JOINT_Y.map((y) => (
              <line key={`pave-${y}`} x1={KERB_STONE_X + 9} y1={y} x2={1270} y2={y} />
            ))}
          </g>

          {/* Asphalt Surface */}
          <rect
            x={ASPHALT_LEFT_X}
            y={0}
            width={KERB_STONE_X - ASPHALT_LEFT_X}
            height={720}
            fill="url(#thumb-road-asphalt)"
          />

          {/* Concrete Kerb */}
          <rect x={KERB_STONE_X} y={0} width={9} height={720} fill="oklch(0.3 0 0)" />
          <line x1={KERB_STONE_X} y1={0} x2={KERB_STONE_X} y2={720} stroke="oklch(0.76 0 0 / 0.72)" strokeWidth={1.6} />
          <g stroke="oklch(0.45 0 0 / 0.65)" strokeWidth={1}>
            {KERB_JOINT_Y.map((y) => (
              <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 9} y2={y} />
            ))}
          </g>

          {/* Parking Lane & Center Divider */}
          <line
            x1={PARKING_LINE_X}
            y1={0}
            x2={PARKING_LINE_X}
            y2={720}
            stroke="oklch(0.64 0 0 / 0.34)"
            strokeWidth={1.3}
            strokeDasharray="8 10"
          />
          <line
            x1={LANE_DIVIDER_X}
            y1={10}
            x2={LANE_DIVIDER_X}
            y2={710}
            stroke="oklch(0.74 0 0 / 0.42)"
            strokeWidth={1.8}
            strokeDasharray="24 20"
          />
          <line
            x1={KERB_LINE_X}
            y1={16}
            x2={KERB_LINE_X}
            y2={704}
            stroke="oklch(0.8 0 0 / 0.28)"
            strokeWidth={1.1}
            strokeDasharray="3 5"
          />

          {/* Parked Car in Front */}
          <g transform={`translate(${PARALLEL_CENTER_X}, ${FRONT_PARKED_CENTER_Y}) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>

          {/* Parked Car Behind */}
          <g transform={`translate(${PARALLEL_CENTER_X}, ${REAR_PARKED_CENTER_Y}) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* Parallel Target Ghost Pose Inside Bay */}
        <g transform={`translate(${PARALLEL_CENTER_X}, ${PARALLEL_CENTER_Y}) scale(${CAR_SCALE})`} opacity={0.72}>
          <CutPlaneCar
            variant={CarSectionVariants.Ghost}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Concentric Turning Circles Centered at X */}
        <g fill="none">
          <path d={WHEEL_F_ARC} stroke="oklch(0.78 0 0 / 0.36)" strokeWidth={1.4} strokeDasharray="5 6" />
          <path d={WHEEL_E_ARC} stroke="oklch(0.85 0 0 / 0.48)" strokeWidth={1.5} strokeDasharray="5 6" />
          <path d={OUTER_CIRCLE_ARC} stroke="oklch(0.92 0 0 / 0.62)" strokeWidth={1.7} />
          <path
            d={ACTIVE_GRAZE_ARC}
            stroke="oklch(0.99 0 0)"
            strokeWidth={3.6}
            strokeLinecap="round"
            filter="url(#thumb-luminous-glow)"
          />
        </g>

        {/* Subtle Ackermann Wheel Normals to Turning Center X */}
        <g stroke="oklch(0.84 0 0 / 0.32)" strokeWidth={1.15} strokeDasharray="3 5">
          <line x1={HERO_WHEEL_F.x} y1={HERO_WHEEL_F.y} x2={TURNING_CENTER.x} y2={TURNING_CENTER.y} />
          <line x1={HERO_WHEEL_E.x} y1={HERO_WHEEL_E.y} x2={TURNING_CENTER.x} y2={TURNING_CENTER.y} />
        </g>

        {/* Congruent Outer-Circle Radii X -> G and X -> A_parallel */}
        <g stroke="oklch(0.95 0 0 / 0.62)" strokeWidth={1.5} strokeDasharray="6 4">
          <line x1={POINT_G.x} y1={POINT_G.y} x2={TURNING_CENTER.x} y2={TURNING_CENTER.y} />
          <line x1={POINT_A_PARALLEL.x} y1={POINT_A_PARALLEL.y} x2={TURNING_CENTER.x} y2={TURNING_CENTER.y} />
        </g>

        {/* Extra Space Clearance Zone & Glowing "+ ?" Callout */}
        <rect
          x={ROAD_LINE_X}
          y={POINT_G_Y}
          width={HALF_W * 2}
          height={CLEARANCE_HEIGHT}
          rx={4}
          fill="oklch(0.98 0 0 / 0.1)"
          stroke="oklch(0.98 0 0 / 0.78)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <g stroke="oklch(0.88 0 0 / 0.68)" strokeWidth={1.2} strokeDasharray="3 3">
          <line x1={POINT_H.x} y1={POINT_H.y} x2={1084} y2={POINT_H.y} />
          <line x1={POINT_A_PARALLEL.x} y1={POINT_A_PARALLEL.y} x2={1084} y2={POINT_A_PARALLEL.y} />
        </g>
        <g stroke="oklch(0.99 0 0)" strokeWidth={3} filter="url(#thumb-luminous-glow)">
          <line x1={1074} y1={POINT_H.y} x2={1074} y2={POINT_A_PARALLEL.y} />
          <line x1={1068} y1={POINT_H.y} x2={1080} y2={POINT_H.y} strokeWidth={1.9} />
          <line x1={1068} y1={POINT_A_PARALLEL.y} x2={1080} y2={POINT_A_PARALLEL.y} strokeWidth={1.9} />
        </g>
        <g filter="url(#thumb-soft-drop)">
          <rect
            x={1094}
            y={(POINT_H.y + POINT_A_PARALLEL.y) * 0.5 - 27}
            width={118}
            height={54}
            rx={9}
            fill="oklch(0.22 0 0 / 0.96)"
            stroke="oklch(0.99 0 0 / 0.94)"
            strokeWidth={1.9}
          />
          <text
            x={1153}
            y={(POINT_H.y + POINT_A_PARALLEL.y) * 0.5 + 11}
            textAnchor="middle"
            fontSize={32}
            className="fill-text-primary font-mono font-bold tracking-mono"
          >
            + ?
          </text>
        </g>

        {/* Hero 2D Cut-Plane Sports Coupe Mid-Sweep */}
        <g transform={`translate(${HERO_CENTER.x}, ${HERO_CENTER.y}) rotate(${HERO_HEADING_DEG}) scale(${CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ACKERMANN.frontLeftSteerDeg}
            frontRightSteerDeg={ACKERMANN.frontRightSteerDeg}
            isReversing={true}
            isBraking={false}
          />
        </g>

        {/* Turning Center Hexagonal Node X */}
        <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`}>
          <polygon
            points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
            fill="oklch(0.22 0 0 / 0.95)"
            stroke="oklch(0.98 0 0 / 0.92)"
            strokeWidth={1.8}
          />
          <circle cx={0} cy={0} r={6.5} fill="oklch(0.99 0 0)" filter="url(#thumb-luminous-glow)" />
          <text
            x={-28}
            y={7}
            textAnchor="end"
            stroke="oklch(0.14 0 0 / 0.95)"
            strokeWidth={5}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-lg font-bold tracking-mono"
          >
            X
          </text>
        </g>

        {/* Grazing Pinch Point G, Parallel Landing Node & Sweeping Corner A */}
        <g transform={`translate(${POINT_G.x}, ${POINT_G.y})`}>
          <circle cx={0} cy={0} r={11} fill="none" stroke="oklch(0.98 0 0 / 0.72)" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={5} fill="oklch(0.99 0 0)" filter="url(#thumb-luminous-glow)" />
          <text
            x={-14}
            y={-18}
            textAnchor="end"
            stroke="oklch(0.14 0 0 / 0.95)"
            strokeWidth={5}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-base font-bold"
          >
            G
          </text>
        </g>

        <circle
          cx={POINT_A_PARALLEL.x}
          cy={POINT_A_PARALLEL.y}
          r={4.2}
          fill="oklch(0.99 0 0)"
          filter="url(#thumb-luminous-glow)"
        />

        <g transform={`translate(${HERO_CORNER_A.x}, ${HERO_CORNER_A.y})`}>
          <circle cx={0} cy={0} r={5} fill="oklch(0.99 0 0)" filter="url(#thumb-luminous-glow)" />
          <text
            x={-14}
            y={-12}
            textAnchor="end"
            stroke="oklch(0.14 0 0 / 0.95)"
            strokeWidth={5}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-base font-bold"
          >
            A
          </text>
        </g>

        {/* ================================================================
            LEFT COMPOSITION: HIGH-CONTRAST YOUTUBE TITLE & MASTER FORMULA
           ================================================================ */}
        <g filter="url(#thumb-soft-drop)">
          <text
            x={72}
            y={142}
            textAnchor="start"
            fontSize={22}
            fontWeight={600}
            letterSpacing="0.14em"
            className="fill-text-secondary font-mono"
          >
            THE GEOMETRY OF
          </text>

          <text
            x={68}
            y={232}
            textAnchor="start"
            fontSize={94}
            fontWeight={700}
            letterSpacing="-0.03em"
            className="fill-text-primary font-display"
          >
            PERFECT
          </text>
          <text
            x={68}
            y={322}
            textAnchor="start"
            fontSize={94}
            fontWeight={700}
            letterSpacing="-0.03em"
            className="fill-text-primary font-display"
          >
            PARKING
          </text>

          <rect
            x={72}
            y={350}
            width={104}
            height={4}
            rx={2}
            fill="oklch(0.98 0 0)"
            filter="url(#thumb-luminous-glow)"
          />

          <text
            x={72}
            y={400}
            textAnchor="start"
            fontSize={29}
            fontWeight={500}
            className="fill-text-primary font-sans"
          >
            How much extra space do you need?
          </text>
        </g>

        {/* Frosted Obsidian Master Formula Card */}
        <g filter="url(#thumb-soft-drop)">
          <rect
            x={70}
            y={448}
            width={534}
            height={112}
            rx={12}
            fill="oklch(0.2 0 0 / 0.94)"
            stroke="oklch(0.95 0 0 / 0.78)"
            strokeWidth={1.7}
          />
          <g transform="translate(342, 515) scale(0.82)">
            <MasterFormula glowFilterId="thumb-luminous-glow" showFocusCapsules={false} />
          </g>
        </g>
      </svg>
    </div>
  );
}
