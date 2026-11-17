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
        <stop offset="0%" stopColor="oklch(0.41 0 0)" />
        <stop offset="48%" stopColor="oklch(0.3 0 0)" />
        <stop offset="100%" stopColor="oklch(0.22 0 0)" />
      </linearGradient>

      <linearGradient id="cut-car-hero-cabin-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.34 0 0 / 0.88)" />
        <stop offset="100%" stopColor="oklch(0.23 0 0 / 0.92)" />
      </linearGradient>

      <linearGradient id="cut-car-parked-grad" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.27 0 0)" />
        <stop offset="55%" stopColor="oklch(0.22 0 0)" />
        <stop offset="100%" stopColor="oklch(0.18 0 0)" />
      </linearGradient>

      <linearGradient id="cut-car-glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.11 0 0 / 0.94)" />
        <stop offset="100%" stopColor="oklch(0.16 0 0 / 0.9)" />
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

      <radialGradient id="cut-car-brake-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="oklch(0.68 0.24 25 / 0.85)" />
        <stop offset="48%" stopColor="oklch(0.62 0.22 25 / 0.35)" />
        <stop offset="100%" stopColor="oklch(0.58 0.2 25 / 0)" />
      </radialGradient>

      <radialGradient id="cut-car-reverse-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="oklch(0.98 0 0 / 0.88)" />
        <stop offset="48%" stopColor="oklch(0.94 0 0 / 0.35)" />
        <stop offset="100%" stopColor="oklch(0.9 0 0 / 0)" />
      </radialGradient>

      <clipPath id="cut-car-tire-clip">
        <rect x={-5.5} y={-14} width={11} height={28} rx={3.5} />
      </clipPath>
    </>
  );
}

/**
 * Outer sculpted sports-coupe planform inside the 76x168 ABCD envelope (-38..38 x -84..84),
 * featuring a tapered nose, scalloped waist, flared rear haunches, and open wheel-arch
 * cutouts around (±31, ±52) so full-lock Ackermann steering remains unobstructed.
 */
const CAR_BODY_PATH = [
  "M -16 -84",
  "C -6 -84, 6 -84, 16 -84",
  "C 26 -83.5, 34 -78, 35 -70",
  "L 34 -68",
  "C 22 -68, 18.5 -63, 18.5 -52",
  "C 18.5 -41, 22 -36, 34 -36",
  "L 35 -33",
  "C 34 -18, 33 -2, 33.5 14",
  "C 34 24, 35.5 29, 36 33",
  "L 35 36",
  "C 24 36, 22 41, 22 52",
  "C 22 63, 24 68, 35 68",
  "L 35.5 71",
  "C 35 79, 29 83.2, 20 84",
  "C 8 84, -8 84, -20 84",
  "C -29 83.2, -35 79, -35.5 71",
  "L -35 68",
  "C -24 68, -22 63, -22 52",
  "C -22 41, -24 36, -35 36",
  "L -36 33",
  "C -35.5 29, -34 24, -33.5 14",
  "C -33 -2, -34 -18, -35 -33",
  "L -34 -36",
  "C -22 -36, -18.5 -41, -18.5 -52",
  "C -18.5 -63, -22 -68, -34 -68",
  "L -35 -70",
  "C -34 -78, -26 -83.5, -16 -84",
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
 * 2D Top-Down Sports Coupe sliced by a horizontal plane formed from the four wheel centers.
 * Local SVG coordinates (centered at geometric center (0,0) of ABCD):
 * - Width: 76px (-38 to +38)
 * - Length: 168px (-84 front nose to +84 rear tail)
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
      ? "oklch(0.72 0.24 25 / 0.98)"
      : "oklch(0.78 0.08 25 / 0.64)"
    : "oklch(0.5 0.05 25 / 0.45)";

  return (
    <g className="select-none">
      {/* Contoured Ground Contact Shadow */}
      {!isGhost ? <path d={CAR_BODY_PATH} fill="oklch(0 0 0 / 0.45)" transform="translate(0, 4)" /> : null}

      {/* Mathematical Bounding Envelope ABCD */}
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

      {/* Sectioned Rolling & Steering Wheels Inside Open Wheel Wells */}
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

      {/* Sculpted Sports Coupe Body Shell */}
      <path
        d={CAR_BODY_PATH}
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={isHero ? 1.4 : 1.1}
        strokeDasharray={isGhost ? "4 4" : undefined}
      />

      {/* Aerodynamic Wing Mirrors (tangent to ±38 bounding width) */}
      {!isGhost ? (
        <g
          fill={isHero ? "oklch(0.32 0 0)" : "oklch(0.24 0 0)"}
          stroke={isHero ? "oklch(0.84 0 0 / 0.75)" : "oklch(0.45 0 0 / 0.6)"}
          strokeWidth={0.9}
        >
          <path d="M -33.5 -22 L -38 -20 L -38 -15.5 L -33.5 -17 Z" />
          <path d="M 33.5 -22 L 38 -20 L 38 -15.5 L 33.5 -17 Z" />
        </g>
      ) : null}

      {/* Sports Coupe Bonnet Contours, Fastback Glasshouse, Ducktail & LED Signatures */}
      {!isGhost ? (
        <g>
          {/* Subtle front chin splitter rim */}
          <path
            d="M -21 -83 C -8 -83.6, 8 -83.6, 21 -83"
            fill="none"
            stroke={isHero ? "oklch(0.75 0 0 / 0.32)" : "oklch(0.42 0 0 / 0.25)"}
            strokeWidth={0.9}
          />

          {/* Long sculpted bonnet creases */}
          <path
            d="M -15 -78 C -13 -60, -11 -42, -10 -25 M 15 -78 C 13 -60, 11 -42, 10 -25"
            fill="none"
            stroke={isHero ? "oklch(0.68 0 0 / 0.36)" : "oklch(0.38 0 0 / 0.3)"}
            strokeWidth={0.9}
            strokeLinecap="round"
          />

          {/* Central bonnet NACA extractor */}
          <path
            d="M -5 -58 C -2 -59, 2 -59, 5 -58 L 6 -45 C 2 -46, -2 -46, -6 -45 Z"
            fill={isHero ? "oklch(0.18 0 0 / 0.5)" : "oklch(0.15 0 0 / 0.4)"}
          />

          {/* Front fender aero louvers */}
          <path
            d="M -32 -32 L -27 -27 M 32 -32 L 27 -27"
            fill="none"
            stroke={isHero ? "oklch(0.6 0 0 / 0.42)" : "oklch(0.35 0 0 / 0.3)"}
            strokeWidth={1}
            strokeLinecap="round"
          />

          {/* Rear haunch shoulder lines */}
          <path
            d="M -27 24 C -29 42, -29 58, -26 74 M 27 24 C 29 42, 29 58, 26 74"
            fill="none"
            stroke={isHero ? "oklch(0.7 0 0 / 0.34)" : "oklch(0.38 0 0 / 0.28)"}
            strokeWidth={0.9}
            strokeLinecap="round"
          />

          {/* Steeply Raked Sports Windshield */}
          <path
            d="M -22 -24 C -9 -28, 9 -28, 22 -24 L 17.5 2 C 7 0, -7 0, -17.5 2 Z"
            fill="url(#cut-car-glass-grad)"
            stroke={isHero ? "oklch(0.76 0 0 / 0.35)" : "oklch(0.42 0 0 / 0.32)"}
            strokeWidth={0.9}
          />

          {/* Sleek Coupe Side Quarter Windows */}
          <path
            d="M -24 -19 L -18.5 3 L -16.5 31 L -20.5 46 C -23.5 26, -25 4, -24 -19 Z"
            fill="oklch(0.12 0 0 / 0.85)"
          />
          <path d="M 24 -19 L 18.5 3 L 16.5 31 L 20.5 46 C 23.5 26, 25 4, 24 -19 Z" fill="oklch(0.12 0 0 / 0.85)" />

          {/* Fastback Rear Glass */}
          <path
            d="M -15 32 C -6 33.5, 6 33.5, 15 32 L 18 58 C 7 61, -7 61, -18 58 Z"
            fill="url(#cut-car-glass-grad)"
            stroke={isHero ? "oklch(0.72 0 0 / 0.3)" : "oklch(0.4 0 0 / 0.28)"}
            strokeWidth={0.9}
          />

          {/* Tapered Teardrop Coupe Roof Panel */}
          <path
            d="M -17.5 2 C -7 0, 7 0, 17.5 2 L 15 32 C 6 33.5, -6 33.5, -15 32 Z"
            fill={isHero ? "url(#cut-car-hero-cabin-grad)" : "oklch(0.2 0 0 / 0.9)"}
            stroke={isHero ? "oklch(0.78 0 0 / 0.32)" : "oklch(0.42 0 0 / 0.25)"}
            strokeWidth={0.9}
          />

          {/* Integrated Rear Ducktail Lip Spoiler */}
          <path
            d="M -23 76 C -10 78.5, 10 78.5, 23 76"
            fill="none"
            stroke={isHero ? "oklch(0.84 0 0 / 0.48)" : "oklch(0.45 0 0 / 0.35)"}
            strokeWidth={1.1}
            strokeLinecap="round"
          />

          {/* Swept LED Headlight Blades */}
          <path
            d="M -29 -76 C -24 -80, -17 -81.5, -12 -80"
            fill="none"
            stroke={isHero ? "oklch(0.96 0 0 / 0.94)" : "oklch(0.62 0 0 / 0.55)"}
            strokeWidth={isHero ? 2 : 1.5}
            strokeLinecap="round"
          />
          <path
            d="M 12 -80 C 17 -81.5, 24 -80, 29 -76"
            fill="none"
            stroke={isHero ? "oklch(0.96 0 0 / 0.94)" : "oklch(0.62 0 0 / 0.55)"}
            strokeWidth={isHero ? 2 : 1.5}
            strokeLinecap="round"
          />

          {/* Red Brake Light Glow Halos */}
          {isHero && isBraking ? (
            <g>
              <circle cx={-19} cy={81} r={9} fill="url(#cut-car-brake-glow)" />
              <circle cx={19} cy={81} r={9} fill="url(#cut-car-brake-glow)" />
              <ellipse cx={0} cy={81.5} rx={9} ry={5} fill="url(#cut-car-brake-glow)" />
            </g>
          ) : null}

          {/* Sports Taillight Blades & Brake Strip */}
          <path
            d="M -27 79 C -21 81.5, -15 82, -10 81.5"
            fill="none"
            stroke={taillightStroke}
            strokeWidth={isHero && isBraking ? 2.4 : 1.6}
            strokeLinecap="round"
          />
          <path
            d="M 10 81.5 C 15 82, 21 81.5, 27 79"
            fill="none"
            stroke={taillightStroke}
            strokeWidth={isHero && isBraking ? 2.4 : 1.6}
            strokeLinecap="round"
          />
          <line
            x1={-7}
            y1={81.5}
            x2={7}
            y2={81.5}
            stroke={taillightStroke}
            strokeWidth={isHero && isBraking ? 1.8 : 0.9}
            strokeLinecap="round"
          />

          {/* White Reversing Lamps & Glow */}
          {isHero && isReversing ? (
            <g>
              <circle cx={-8.5} cy={82.5} r={7.5} fill="url(#cut-car-reverse-glow)" />
              <circle cx={8.5} cy={82.5} r={7.5} fill="url(#cut-car-reverse-glow)" />
              <g stroke="oklch(0.98 0 0)" strokeWidth={2} strokeLinecap="round">
                <line x1={-11} y1={82} x2={-6} y2={82} />
                <line x1={6} y1={82} x2={11} y2={82} />
              </g>
            </g>
          ) : null}

          {/* 4-Corner Amber Hazard Lights */}
          {isHero ? (
            <g>
              {isHazardLit ? (
                <g>
                  <circle cx={-30} cy={-75} r={11} fill="url(#cut-car-hazard-glow)" />
                  <circle cx={30} cy={-75} r={11} fill="url(#cut-car-hazard-glow)" />
                  <circle cx={-30} cy={75} r={11} fill="url(#cut-car-hazard-glow)" />
                  <circle cx={30} cy={75} r={11} fill="url(#cut-car-hazard-glow)" />
                </g>
              ) : null}

              <g
                fill="none"
                stroke={isHazardLit ? "oklch(0.88 0.18 76)" : "oklch(0.45 0.04 76 / 0.32)"}
                strokeWidth={isHazardLit ? 2.4 : 1.4}
                strokeLinecap="round"
              >
                <path d="M -31 -73 L -28 -77.5" />
                <path d="M 31 -73 L 28 -77.5" />
                <path d="M -31 73 L -28 77.5" />
                <path d="M 31 73 L 28 77.5" />
              </g>
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Wheel-Center Cut-Plane Axle Geometry Overlay */}
      {showAxlePlaneLines ? (
        <g>
          <line
            x1={-25}
            y1={-52}
            x2={25}
            y2={-52}
            stroke={isHero ? "oklch(0.88 0 0 / 0.65)" : "oklch(0.5 0 0 / 0.4)"}
            strokeWidth={1.2}
            strokeDasharray="2.5 2.5"
          />
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
