import { CarSectionVariants, KerbSides, type CarSectionVariant, type KerbSide } from "@/simulation/car-simulator";
import type { ReactElement } from "react";

export type { CarSectionVariant, KerbSide };

export interface CutPlaneCarProps {
  readonly variant?: CarSectionVariant;
  readonly kerbSide?: KerbSide;
  readonly showBoundingBox?: boolean;
  readonly showVertexLabels?: boolean;
  readonly showAxlePlaneLines?: boolean;
  readonly frontLeftSteerDeg?: number;
  readonly frontRightSteerDeg?: number;
  readonly wheelRollDistance?: number;
  readonly isHazardLit?: boolean;
  readonly isReversing?: boolean;
  readonly isBraking?: boolean;
}

const TIRE_RADIUS = 14;
const TREAD_RIB_COUNT = 10;
const TREAD_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Shared SVG gradients & clip paths for CutPlaneCar instances.
 * Render once inside the parent <svg><defs> to avoid duplicate IDs.
 */
export function CutPlaneCarDefs(): ReactElement {
  return (
    <>
      <linearGradient id="cut-car-hero-grad" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.39 0 0)" />
        <stop offset="48%" stopColor="oklch(0.29 0 0)" />
        <stop offset="100%" stopColor="oklch(0.22 0 0)" />
      </linearGradient>

      <linearGradient id="cut-car-hero-cabin-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.32 0 0 / 0.85)" />
        <stop offset="100%" stopColor="oklch(0.22 0 0 / 0.9)" />
      </linearGradient>

      <linearGradient id="cut-car-parked-grad" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.27 0 0)" />
        <stop offset="55%" stopColor="oklch(0.22 0 0)" />
        <stop offset="100%" stopColor="oklch(0.18 0 0)" />
      </linearGradient>

      <linearGradient id="cut-car-glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.12 0 0 / 0.92)" />
        <stop offset="100%" stopColor="oklch(0.17 0 0 / 0.88)" />
      </linearGradient>

      <linearGradient id="cut-car-tire-hero-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="oklch(0.16 0 0)" />
        <stop offset="50%" stopColor="oklch(0.28 0 0)" />
        <stop offset="100%" stopColor="oklch(0.16 0 0)" />
      </linearGradient>

      <linearGradient id="cut-car-tire-parked-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="oklch(0.14 0 0)" />
        <stop offset="50%" stopColor="oklch(0.21 0 0)" />
        <stop offset="100%" stopColor="oklch(0.14 0 0)" />
      </linearGradient>

      <radialGradient id="cut-car-hazard-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="oklch(0.86 0.18 76 / 0.9)" />
        <stop offset="42%" stopColor="oklch(0.82 0.18 76 / 0.4)" />
        <stop offset="100%" stopColor="oklch(0.75 0.18 76 / 0)" />
      </radialGradient>

      <clipPath id="cut-car-tire-clip">
        <rect x={-5.5} y={-14} width={11} height={28} rx={3.5} />
      </clipPath>
    </>
  );
}

/**
 * Outer sculpted automotive planform inside the 76x168 ABCD envelope (-38..38 x -84..84),
 * with flared wheel-arch pockets around (±31, ±52) so Ackermann wheel angles remain unobstructed.
 */
const CAR_BODY_PATH = [
  "M -24 -84",
  "C -10 -85, 10 -85, 24 -84",
  "C 32 -83, 35 -79, 35 -71",
  "L 34 -68",
  "C 24 -68, 22 -63, 22 -52",
  "C 22 -41, 24 -36, 34 -36",
  "L 35 -33",
  "L 35 33",
  "L 34 36",
  "C 24 36, 22 41, 22 52",
  "C 22 63, 24 68, 34 68",
  "L 35 71",
  "C 35 79, 32 83, 24 84",
  "C 10 85, -10 85, -24 84",
  "C -32 83, -35 79, -35 71",
  "L -34 68",
  "C -24 68, -22 63, -22 52",
  "C -22 41, -24 36, -34 36",
  "L -35 33",
  "L -35 -33",
  "L -34 -36",
  "C -24 -36, -22 -41, -22 -52",
  "C -22 -63, -24 -68, -34 -68",
  "L -35 -71",
  "C -35 -79, -32 -83, -24 -84",
  "Z",
].join(" ");

interface TireWheelProps {
  readonly x: number;
  readonly y: number;
  readonly steerDeg: number;
  readonly wheelRollDistance: number;
  readonly isHero: boolean;
  readonly isGhost: boolean;
  readonly showAxlePlaneLines: boolean;
}

function TireWheel({
  x,
  y,
  steerDeg,
  wheelRollDistance,
  isHero,
  isGhost,
  showAxlePlaneLines,
}: TireWheelProps): ReactElement {
  const wheelFill = isGhost ? "none" : isHero ? "url(#cut-car-tire-hero-grad)" : "url(#cut-car-tire-parked-grad)";
  const wheelStroke = isHero ? "oklch(0.92 0 0 / 0.92)" : isGhost ? "oklch(0.85 0 0 / 0.32)" : "oklch(0.5 0 0 / 0.65)";
  const hubFill = isHero ? "oklch(0.97 0 0)" : "oklch(0.56 0 0)";
  const rollAngleBase = -wheelRollDistance / TIRE_RADIUS;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${steerDeg})`}>
      <rect
        x={-5.5}
        y={-14}
        width={11}
        height={28}
        rx={3.5}
        fill={wheelFill}
        stroke={wheelStroke}
        strokeWidth={isHero ? 1.35 : 1.1}
        strokeDasharray={isGhost ? "3 3" : undefined}
      />

      {!isGhost ? (
        <g clipPath="url(#cut-car-tire-clip)">
          {/* Longitudinal tread drainage grooves */}
          <line x1={-2} y1={-14} x2={-2} y2={14} stroke="oklch(0.11 0 0 / 0.72)" strokeWidth={0.9} />
          <line x1={2} y1={-14} x2={2} y2={14} stroke="oklch(0.11 0 0 / 0.72)" strokeWidth={0.9} />

          {/* Cylindrical rolling transverse tread ribs */}
          {TREAD_INDICES.map((index) => {
            const angle = rollAngleBase + (index * 2 * Math.PI) / TREAD_RIB_COUNT;
            const cosAngle = Math.cos(angle);
            if (cosAngle <= 0.08) {
              return null;
            }
            const ribY = TIRE_RADIUS * Math.sin(angle);
            const ridgeOpacity = isHero ? 0.22 + 0.48 * cosAngle : 0.1 + 0.16 * cosAngle;
            const grooveOpacity = isHero ? 0.35 + 0.48 * cosAngle : 0.22 + 0.25 * cosAngle;

            return (
              <g key={index}>
                <line
                  x1={-5}
                  y1={ribY}
                  x2={5}
                  y2={ribY}
                  stroke={`oklch(0.78 0 0 / ${ridgeOpacity.toFixed(2)})`}
                  strokeWidth={1.1}
                />
                <line
                  x1={-5}
                  y1={ribY + 1.15}
                  x2={5}
                  y2={ribY + 1.15}
                  stroke={`oklch(0.08 0 0 / ${grooveOpacity.toFixed(2)})`}
                  strokeWidth={1}
                />
              </g>
            );
          })}
        </g>
      ) : null}

      {!isGhost && isHero && showAxlePlaneLines ? (
        <line x1={-7.5} y1={0} x2={7.5} y2={0} stroke={hubFill} strokeWidth={1.2} />
      ) : null}

      {!isGhost ? <circle cx={0} cy={0} r={isHero ? 2.1 : 1.7} fill={hubFill} /> : null}
    </g>
  );
}

/**
 * 2D Top-Down Car sliced by a horizontal plane formed from the four wheel centers.
 * Local SVG coordinates (centered at geometric center (0,0) of ABCD):
 * - Width: 76px (-38 to +38)
 * - Length: 168px (-84 front bumper to +84 rear bumper)
 * - Front wheel centers at y = -52, x = -31 / +31
 * - Rear wheel centers at y = +52, x = -31 / +31
 */
export function CutPlaneCar({
  variant = CarSectionVariants.Hero,
  kerbSide = KerbSides.Right,
  showBoundingBox = false,
  showVertexLabels = false,
  showAxlePlaneLines = true,
  frontLeftSteerDeg = 0,
  frontRightSteerDeg = 0,
  wheelRollDistance = 0,
  isHazardLit = false,
  isReversing = false,
  isBraking = false,
}: CutPlaneCarProps): ReactElement {
  const isHero = variant === CarSectionVariants.Hero;
  const isGhost = variant === CarSectionVariants.Ghost;

  const bodyFill = isHero
    ? "url(#cut-car-hero-grad)"
    : isGhost
      ? "oklch(0.95 0 0 / 0.04)"
      : "url(#cut-car-parked-grad)";

  const bodyStroke = isHero ? "oklch(0.92 0 0 / 0.88)" : isGhost ? "oklch(0.9 0 0 / 0.36)" : "oklch(0.48 0 0 / 0.65)";
  const hubFill = isHero ? "oklch(0.97 0 0)" : "oklch(0.58 0 0)";

  const isRightKerb = kerbSide === KerbSides.Right;
  const kerbX = isRightKerb ? 38 : -38;
  const roadX = isRightKerb ? -38 : 38;
  const kerbWheelX = isRightKerb ? 31 : -31;
  const kerbLabelX = isRightKerb ? 49 : -49;
  const roadLabelX = isRightKerb ? -48 : 48;
  const kerbAnchor = isRightKerb ? "start" : "end";
  const roadAnchor = isRightKerb ? "end" : "start";

  const taillightStroke = isHero
    ? isBraking
      ? "oklch(0.68 0.22 25 / 0.96)"
      : "oklch(0.78 0.08 25 / 0.62)"
    : "oklch(0.5 0.05 25 / 0.45)";

  return (
    <g className="select-none">
      {/* Contoured Ground Contact Shadow (keeps wheel wells clean against asphalt) */}
      {!isGhost ? <path d={CAR_BODY_PATH} fill="oklch(0 0 0 / 0.45)" transform="translate(0, 4)" /> : null}

      {/* Mathematical Bounding Envelope ABCD (Enabled explicitly in proof/cut-plane slides) */}
      {isHero && showBoundingBox ? (
        <g>
          <rect
            x={-38}
            y={-84}
            width={76}
            height={168}
            rx={2}
            fill="none"
            stroke="oklch(0.82 0 0 / 0.24)"
            strokeWidth={0.9}
            strokeDasharray="3 4"
          />
          <path
            d="M -38 -77 L -38 -84 L -31 -84 M 31 -84 L 38 -84 L 38 -77 M 38 77 L 38 84 L 31 84 M -31 84 L -38 84 L -38 77"
            fill="none"
            stroke="oklch(0.9 0 0 / 0.55)"
            strokeWidth={1.1}
          />
        </g>
      ) : null}

      {/* Sectioned Rolling & Steering Wheels Inside Flared Wheel Wells */}
      <TireWheel
        x={-31}
        y={-52}
        steerDeg={frontLeftSteerDeg}
        wheelRollDistance={wheelRollDistance}
        isHero={isHero}
        isGhost={isGhost}
        showAxlePlaneLines={showAxlePlaneLines}
      />
      <TireWheel
        x={31}
        y={-52}
        steerDeg={frontRightSteerDeg}
        wheelRollDistance={wheelRollDistance}
        isHero={isHero}
        isGhost={isGhost}
        showAxlePlaneLines={showAxlePlaneLines}
      />
      <TireWheel
        x={-31}
        y={52}
        steerDeg={0}
        wheelRollDistance={wheelRollDistance}
        isHero={isHero}
        isGhost={isGhost}
        showAxlePlaneLines={false}
      />
      <TireWheel
        x={31}
        y={52}
        steerDeg={0}
        wheelRollDistance={wheelRollDistance}
        isHero={isHero}
        isGhost={isGhost}
        showAxlePlaneLines={false}
      />

      {/* Sculpted Main Body Shell */}
      <path
        d={CAR_BODY_PATH}
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={isHero ? 1.4 : 1.1}
        strokeDasharray={isGhost ? "4 4" : undefined}
      />

      {/* Sleek Wing Mirrors (kept strictly inside ±38 width envelope) */}
      {!isGhost ? (
        <g
          fill={isHero ? "oklch(0.32 0 0)" : "oklch(0.24 0 0)"}
          stroke={isHero ? "oklch(0.84 0 0 / 0.75)" : "oklch(0.45 0 0 / 0.6)"}
          strokeWidth={0.9}
        >
          <path d="M -35 -31 L -38 -29 L -38 -24 L -35 -25 Z" />
          <path d="M 35 -31 L 38 -29 L 38 -24 L 35 -25 Z" />
        </g>
      ) : null}

      {/* Automotive Hood Contours, Smoked Glasshouse & Lighting */}
      {!isGhost ? (
        <g>
          {/* Subtle bonnet crease lines */}
          <path
            d="M -18 -74 L -15 -42 M 18 -74 L 15 -42"
            fill="none"
            stroke={isHero ? "oklch(0.65 0 0 / 0.35)" : "oklch(0.38 0 0 / 0.32)"}
            strokeWidth={0.9}
            strokeLinecap="round"
          />

          {/* Smoked Glass Windshield */}
          <path
            d="M -23 -36 C -10 -39, 10 -39, 23 -36 L 19 -16 C 8 -18, -8 -18, -19 -16 Z"
            fill="url(#cut-car-glass-grad)"
            stroke={isHero ? "oklch(0.76 0 0 / 0.35)" : "oklch(0.42 0 0 / 0.32)"}
            strokeWidth={0.9}
          />

          {/* Smoked Glass Side Windows */}
          <path d="M -25 -30 L -21 -14 L -21 24 L -24 36 C -26 16, -26 -10, -25 -30 Z" fill="oklch(0.13 0 0 / 0.82)" />
          <path d="M 25 -30 L 21 -14 L 21 24 L 24 36 C 26 16, 26 -10, 25 -30 Z" fill="oklch(0.13 0 0 / 0.82)" />

          {/* Smoked Glass Rear Window */}
          <path
            d="M -19 28 C -8 29, 8 29, 19 28 L 22 48 C 9 50, -9 50, -22 48 Z"
            fill="url(#cut-car-glass-grad)"
            stroke={isHero ? "oklch(0.72 0 0 / 0.3)" : "oklch(0.4 0 0 / 0.28)"}
            strokeWidth={0.9}
          />

          {/* Clean Roof Panel */}
          <rect
            x={-18}
            y={-15}
            width={36}
            height={42}
            rx={6}
            fill={isHero ? "url(#cut-car-hero-cabin-grad)" : "oklch(0.2 0 0 / 0.9)"}
            stroke={isHero ? "oklch(0.78 0 0 / 0.3)" : "oklch(0.42 0 0 / 0.25)"}
            strokeWidth={0.9}
          />

          {/* Luminous Headlight Slits (Front) */}
          <path
            d="M -27 -81 C -23 -82, -17 -82, -13 -80"
            fill="none"
            stroke={isHero ? "oklch(0.96 0 0 / 0.92)" : "oklch(0.62 0 0 / 0.55)"}
            strokeWidth={isHero ? 2 : 1.5}
            strokeLinecap="round"
          />
          <path
            d="M 13 -80 C 17 -82, 23 -82, 27 -81"
            fill="none"
            stroke={isHero ? "oklch(0.96 0 0 / 0.92)" : "oklch(0.62 0 0 / 0.55)"}
            strokeWidth={isHero ? 2 : 1.5}
            strokeLinecap="round"
          />

          {/* Rear Taillight & Brake Light Bars */}
          <path
            d="M -26 81 C -21 82, -16 82, -12 81"
            fill="none"
            stroke={taillightStroke}
            strokeWidth={isHero && isBraking ? 2.1 : 1.6}
            strokeLinecap="round"
          />
          <path
            d="M 12 81 C 16 82, 21 82, 26 81"
            fill="none"
            stroke={taillightStroke}
            strokeWidth={isHero && isBraking ? 2.1 : 1.6}
            strokeLinecap="round"
          />

          {/* White Reversing Lamps (Rear Inner Bumper) */}
          {isHero && isReversing ? (
            <g stroke="oklch(0.97 0 0 / 0.95)" strokeWidth={1.8} strokeLinecap="round">
              <line x1={-10} y1={82} x2={-5} y2={82} />
              <line x1={5} y1={82} x2={10} y2={82} />
            </g>
          ) : null}

          {/* 4-Corner Amber Hazard Lights */}
          {isHero ? (
            <g>
              {isHazardLit ? (
                <g>
                  <circle cx={-32.5} cy={-76.5} r={11} fill="url(#cut-car-hazard-glow)" />
                  <circle cx={32.5} cy={-76.5} r={11} fill="url(#cut-car-hazard-glow)" />
                  <circle cx={-32.5} cy={76.5} r={11} fill="url(#cut-car-hazard-glow)" />
                  <circle cx={32.5} cy={76.5} r={11} fill="url(#cut-car-hazard-glow)" />
                </g>
              ) : null}

              <g
                fill="none"
                stroke={isHazardLit ? "oklch(0.88 0.18 76)" : "oklch(0.45 0.04 76 / 0.32)"}
                strokeWidth={isHazardLit ? 2.4 : 1.4}
                strokeLinecap="round"
              >
                <path d="M -33.5 -74 L -30.5 -79" />
                <path d="M 33.5 -74 L 30.5 -79" />
                <path d="M -33.5 74 L -30.5 79" />
                <path d="M 33.5 74 L 30.5 79" />
              </g>
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Wheel-Center Cut-Plane Axle Geometry Overlay */}
      {showAxlePlaneLines ? (
        <g>
          {/* Front steering tie-rod axis */}
          <line
            x1={-25}
            y1={-52}
            x2={25}
            y2={-52}
            stroke={isHero ? "oklch(0.88 0 0 / 0.65)" : "oklch(0.5 0 0 / 0.4)"}
            strokeWidth={1.2}
            strokeDasharray="2.5 2.5"
          />
          {/* Fixed rear axle shaft */}
          <line
            x1={-25}
            y1={52}
            x2={25}
            y2={52}
            stroke={isHero ? "oklch(0.95 0 0 / 0.88)" : "oklch(0.55 0 0 / 0.45)"}
            strokeWidth={1.75}
          />
          <circle
            cx={0}
            cy={52}
            r={3}
            fill={isHero ? "oklch(0.2 0 0)" : "oklch(0.18 0 0)"}
            stroke={hubFill}
            strokeWidth={1.2}
          />
          {/* Subtle centerline connecting front & rear axle midpoints */}
          <line
            x1={0}
            y1={-52}
            x2={0}
            y2={52}
            stroke={isHero ? "oklch(0.78 0 0 / 0.35)" : "oklch(0.45 0 0 / 0.25)"}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </g>
      ) : null}

      {/* Blackburn Vertex Markers (A, B, C, D and Wheel Centers E, F) */}
      {showVertexLabels ? (
        <g className="font-mono text-xs font-semibold">
          <circle cx={kerbX} cy={-84} r={3.5} fill="oklch(0.98 0 0)" />
          <text x={kerbLabelX} y={-81} textAnchor={kerbAnchor} className="fill-text-primary">
            A
          </text>

          <circle cx={roadX} cy={-84} r={2.8} fill="oklch(0.78 0 0)" />
          <text x={roadLabelX} y={-81} textAnchor={roadAnchor} className="fill-text-secondary">
            B
          </text>

          <circle cx={roadX} cy={84} r={2.8} fill="oklch(0.78 0 0)" />
          <text x={roadLabelX} y={87} textAnchor={roadAnchor} className="fill-text-secondary">
            C
          </text>

          <circle cx={kerbX} cy={84} r={2.8} fill="oklch(0.78 0 0)" />
          <text x={kerbLabelX} y={87} textAnchor={kerbAnchor} className="fill-text-secondary">
            D
          </text>

          <circle cx={kerbWheelX} cy={-52} r={2.2} fill="oklch(0.98 0 0)" />
          <text x={kerbLabelX} y={-48} textAnchor={kerbAnchor} className="fill-text-primary">
            E
          </text>

          <circle cx={kerbWheelX} cy={52} r={2.2} fill="oklch(0.98 0 0)" />
          <text x={kerbLabelX} y={56} textAnchor={kerbAnchor} className="fill-text-primary">
            F
          </text>
        </g>
      ) : null}
    </g>
  );
}
