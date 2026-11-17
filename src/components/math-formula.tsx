import type { ReactElement } from "react";

export const MASTER_FORMULA_METRICS = {
  outerRadicalPath: "M -224 1 L -219 1 L -213 13 L -199 -41 L 212 -41 L 212 -35",
  outerRadicalLength: 492,
  innerRadicalPath: "M 46 0 L 50 0 L 54 9 L 64 -27 L 136 -27 L 136 -22",
  innerRadicalLength: 129,
  term1CenterX: -150,
  term2CenterX: -37.25,
  term3CenterX: 117.75,
} as const;

export type MasterFormulaLhs =
  | {
      readonly kind: "simple";
      readonly label: string;
      readonly glow?: number;
    }
  | {
      readonly kind: "step7-morph";
      readonly gkOpacity: number;
      readonly hfOpacity: number;
      readonly shiftHfLeft: number;
      readonly minusLOpacity: number;
      readonly minusKOpacity: number;
      readonly ahOpacity: number;
      readonly ahGlow: number;
    };

export interface MasterFormulaProps {
  readonly glowFilterId: string;
  readonly lhs?: MasterFormulaLhs;
  readonly equalsOpacity?: number;
  readonly outerRadicalDraw?: number;
  readonly innerRadicalDraw?: number;
  readonly nestedRootGlow?: number;
  readonly showFocusCapsules?: boolean;
  readonly term1Opacity?: number;
  readonly term1OffsetY?: number;
  readonly term1Focus?: number;
  readonly term2Opacity?: number;
  readonly term2OffsetY?: number;
  readonly term2Focus?: number;
  readonly term3Opacity?: number;
  readonly term3OffsetY?: number;
  readonly term3Focus?: number;
  readonly minusLOpacity?: number;
  readonly minusLOffsetY?: number;
  readonly minusKOpacity?: number;
  readonly minusKOffsetY?: number;
  readonly substGlow?: number;
  readonly rGlow?: number;
  readonly lGlow?: number;
  readonly kGlow?: number;
  readonly wGlow?: number;
  readonly showWRing?: boolean;
}

const DEFAULT_LHS: MasterFormulaLhs = {
  kind: "simple",
  label: "|AH|",
  glow: 0,
};

function renderLhs(lhs: MasterFormulaLhs, filterUrl: string): ReactElement {
  switch (lhs.kind) {
    case "simple": {
      const glow = lhs.glow ?? 0;
      return (
        <text
          x={-282}
          y={8}
          textAnchor="middle"
          filter={glow > 0.25 ? filterUrl : undefined}
          className="fill-text-primary font-math text-2xl font-semibold"
        >
          {lhs.label}
        </text>
      );
    }

    case "step7-morph":
      return (
        <g>
          {lhs.gkOpacity > 0.01 ? (
            <text
              x={-282}
              y={8}
              textAnchor="middle"
              opacity={lhs.gkOpacity}
              className="fill-text-primary font-math text-2xl font-semibold"
            >
              |GK|
            </text>
          ) : null}

          {lhs.hfOpacity > 0.01 ? (
            <g opacity={lhs.hfOpacity}>
              <text
                x={-282 - 82 * lhs.shiftHfLeft}
                y={8}
                textAnchor="middle"
                className="fill-text-primary font-math text-2xl font-semibold"
              >
                |HF|
              </text>

              {lhs.minusLOpacity > 0.01 ? (
                <text x={-318} y={8} textAnchor="middle" opacity={lhs.minusLOpacity} className="font-math text-2xl">
                  <tspan className="fill-text-secondary">− </tspan>
                  <tspan className="fill-text-primary font-semibold italic">l</tspan>
                </text>
              ) : null}

              {lhs.minusKOpacity > 0.01 ? (
                <text x={-280} y={8} textAnchor="middle" opacity={lhs.minusKOpacity} className="font-math text-2xl">
                  <tspan className="fill-text-secondary">− </tspan>
                  <tspan className="fill-text-primary font-semibold italic">k</tspan>
                </text>
              ) : null}
            </g>
          ) : null}

          {lhs.ahOpacity > 0.01 ? (
            <text
              x={-282}
              y={8}
              textAnchor="middle"
              opacity={lhs.ahOpacity}
              filter={lhs.ahGlow > 0.25 ? filterUrl : undefined}
              className="fill-text-primary font-math text-2xl font-semibold"
            >
              |AH|
            </text>
          ) : null}
        </g>
      );

    default: {
      const _exhaustive: never = lhs;
      throw new Error(`Unhandled LHS kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function MasterFormula({
  glowFilterId,
  lhs = DEFAULT_LHS,
  equalsOpacity = 1,
  outerRadicalDraw = 1,
  innerRadicalDraw = 1,
  nestedRootGlow = 0,
  showFocusCapsules = false,
  term1Opacity = 1,
  term1OffsetY = 0,
  term1Focus = 0,
  term2Opacity = 1,
  term2OffsetY = 0,
  term2Focus = 0,
  term3Opacity = 1,
  term3OffsetY = 0,
  term3Focus = 0,
  minusLOpacity = 1,
  minusLOffsetY = 0,
  minusKOpacity = 1,
  minusKOffsetY = 0,
  substGlow = 0,
  rGlow = 0,
  lGlow = 0,
  kGlow = 0,
  wGlow = 0,
  showWRing = false,
}: MasterFormulaProps): ReactElement {
  const filterUrl = `url(#${glowFilterId})`;
  const term1GroupFilter = Math.max(term1Focus, substGlow) > 0.25 ? filterUrl : undefined;
  const term2GroupFilter = Math.max(term2Focus, substGlow) > 0.25 ? filterUrl : undefined;
  const term3GroupFilter = Math.max(term3Focus, substGlow) > 0.25 ? filterUrl : undefined;

  const rActiveFilter = rGlow > 0.25 ? filterUrl : undefined;
  const lActiveFilter = lGlow > 0.25 ? filterUrl : undefined;
  const kActiveFilter = kGlow > 0.25 ? filterUrl : undefined;
  const wActiveFilter = wGlow > 0.2 ? filterUrl : undefined;

  return (
    <g>
      {/* Optional Highlight Capsules Behind Bracketed Terms */}
      {showFocusCapsules && term1Focus > 0.02 ? (
        <rect
          x={-197}
          y={-32}
          width={94}
          height={48}
          rx={6}
          fill="oklch(0.98 0 0 / 0.08)"
          stroke="oklch(0.96 0 0 / 0.65)"
          strokeWidth={1.3}
          opacity={term1Focus}
        />
      ) : null}

      {showFocusCapsules && term2Focus > 0.02 ? (
        <rect
          x={-78}
          y={-32}
          width={83}
          height={48}
          rx={6}
          fill="oklch(0.98 0 0 / 0.08)"
          stroke="oklch(0.96 0 0 / 0.65)"
          strokeWidth={1.3}
          opacity={term2Focus}
        />
      ) : null}

      {showFocusCapsules && term3Focus > 0.02 ? (
        <rect
          x={30}
          y={-34}
          width={176}
          height={53}
          rx={6}
          fill="oklch(0.98 0 0 / 0.08)"
          stroke="oklch(0.96 0 0 / 0.65)"
          strokeWidth={1.3}
          opacity={term3Focus}
        />
      ) : null}

      {nestedRootGlow > 0.02 ? (
        <rect
          x={42}
          y={-31}
          width={99}
          height={44}
          rx={5}
          fill="oklch(0.98 0 0 / 0.08)"
          stroke="oklch(0.98 0 0 / 0.72)"
          strokeWidth={1.3}
          opacity={nestedRootGlow}
        />
      ) : null}

      {/* Left-Hand Side */}
      {renderLhs(lhs, filterUrl)}

      {/* Equals Sign */}
      <text
        x={-242}
        y={8}
        textAnchor="middle"
        opacity={equalsOpacity}
        className="fill-text-secondary font-math text-2xl"
      >
        =
      </text>

      {/* Outer Square Root Radical */}
      {outerRadicalDraw > 0.01 ? (
        <path
          d={MASTER_FORMULA_METRICS.outerRadicalPath}
          fill="none"
          stroke="oklch(0.98 0 0)"
          strokeWidth={2.1 + 0.75 * nestedRootGlow}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={MASTER_FORMULA_METRICS.outerRadicalLength}
          strokeDashoffset={MASTER_FORMULA_METRICS.outerRadicalLength * (1 - outerRadicalDraw)}
          filter={nestedRootGlow > 0.25 ? filterUrl : undefined}
        />
      ) : null}

      {/* Term 1: (r² − l²) */}
      {term1Opacity > 0.01 ? (
        <g opacity={term1Opacity} transform={`translate(0, ${term1OffsetY})`} filter={term1GroupFilter}>
          <text x={-188} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            (
          </text>
          <text
            x={-172}
            y={8}
            textAnchor="middle"
            filter={rActiveFilter}
            className="fill-text-primary font-math text-2xl"
          >
            <tspan className="font-semibold italic">r</tspan>
            <tspan dy={-10} className="text-sm font-semibold">
              2
            </tspan>
          </text>
          <text x={-150} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            −
          </text>
          <text
            x={-128}
            y={8}
            textAnchor="middle"
            filter={lActiveFilter}
            className="fill-text-primary font-math text-2xl"
          >
            <tspan className="font-semibold italic">l</tspan>
            <tspan dy={-10} className="text-sm font-semibold">
              2
            </tspan>
          </text>
          <text x={-112} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            )
          </text>
        </g>
      ) : null}

      {/* Plus Operator */}
      {term2Opacity > 0.01 ? (
        <text
          x={-91}
          y={8}
          textAnchor="middle"
          opacity={term2Opacity}
          className="fill-text-secondary font-math text-2xl"
        >
          +
        </text>
      ) : null}

      {/* Term 2: (l + k)² */}
      {term2Opacity > 0.01 ? (
        <g opacity={term2Opacity} transform={`translate(0, ${term2OffsetY})`} filter={term2GroupFilter}>
          <text x={-70} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            (
          </text>
          <text
            x={-58}
            y={8}
            textAnchor="middle"
            filter={lActiveFilter}
            className="fill-text-primary font-math text-2xl font-semibold italic"
          >
            l
          </text>
          <text x={-41} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            +
          </text>
          <text
            x={-23}
            y={8}
            textAnchor="middle"
            filter={kActiveFilter}
            className="fill-text-primary font-math text-2xl font-semibold italic"
          >
            k
          </text>
          <text x={-8} y={8} textAnchor="middle" className="font-math text-2xl">
            <tspan className="fill-text-secondary">)</tspan>
            <tspan dy={-10} className="fill-text-primary text-sm font-semibold">
              2
            </tspan>
          </text>
        </g>
      ) : null}

      {/* Minus Operator */}
      {term3Opacity > 0.01 ? (
        <text
          x={16}
          y={8}
          textAnchor="middle"
          opacity={term3Opacity}
          className="fill-text-secondary font-math text-2xl"
        >
          −
        </text>
      ) : null}

      {/* Term 3: (√(r² − l²) − w)² */}
      {term3Opacity > 0.01 ? (
        <g opacity={term3Opacity} transform={`translate(0, ${term3OffsetY})`} filter={term3GroupFilter}>
          <path
            d="M 40 -27 Q 31 -6 40 15"
            fill="none"
            stroke="oklch(0.84 0 0)"
            strokeWidth={1.9}
            strokeLinecap="round"
          />

          <path
            d={MASTER_FORMULA_METRICS.innerRadicalPath}
            fill="none"
            stroke="oklch(0.98 0 0)"
            strokeWidth={1.8 + 0.7 * nestedRootGlow}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={MASTER_FORMULA_METRICS.innerRadicalLength}
            strokeDashoffset={MASTER_FORMULA_METRICS.innerRadicalLength * (1 - innerRadicalDraw)}
            filter={nestedRootGlow > 0.2 ? filterUrl : undefined}
          />

          <text
            x={76}
            y={8}
            textAnchor="middle"
            filter={rActiveFilter}
            className="fill-text-primary font-math text-2xl"
          >
            <tspan className="font-semibold italic">r</tspan>
            <tspan dy={-9} className="text-sm font-semibold">
              2
            </tspan>
          </text>
          <text x={98} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            −
          </text>
          <text
            x={120}
            y={8}
            textAnchor="middle"
            filter={lActiveFilter}
            className="fill-text-primary font-math text-2xl"
          >
            <tspan className="font-semibold italic">l</tspan>
            <tspan dy={-9} className="text-sm font-semibold">
              2
            </tspan>
          </text>

          <text x={150} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            −
          </text>

          {showWRing && wGlow > 0.02 ? (
            <circle
              cx={171}
              cy={1}
              r={16}
              fill="oklch(0.98 0 0 / 0.14)"
              stroke="oklch(0.98 0 0 / 0.85)"
              strokeWidth={1.4}
              opacity={wGlow}
            />
          ) : null}

          <text
            x={171}
            y={8}
            textAnchor="middle"
            filter={wActiveFilter}
            className="fill-text-primary font-math text-2xl font-semibold italic"
          >
            w
          </text>

          <path
            d="M 184 -27 Q 193 -6 184 15"
            fill="none"
            stroke="oklch(0.84 0 0)"
            strokeWidth={1.9}
            strokeLinecap="round"
          />
          <text x={197} y={-17} textAnchor="middle" className="fill-text-primary font-math text-base font-semibold">
            2
          </text>
        </g>
      ) : null}

      {/* Subtracted Tail: − l − k */}
      {minusLOpacity > 0.01 ? (
        <g opacity={minusLOpacity} transform={`translate(0, ${minusLOffsetY})`} filter={lActiveFilter}>
          <text x={228} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            −
          </text>
          <text x={247} y={8} textAnchor="middle" className="fill-text-primary font-math text-2xl font-semibold italic">
            l
          </text>
        </g>
      ) : null}

      {minusKOpacity > 0.01 ? (
        <g opacity={minusKOpacity} transform={`translate(0, ${minusKOffsetY})`} filter={kActiveFilter}>
          <text x={266} y={8} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
            −
          </text>
          <text x={285} y={8} textAnchor="middle" className="fill-text-primary font-math text-2xl font-semibold italic">
            k
          </text>
        </g>
      ) : null}
    </g>
  );
}

export interface RootR2MinusL2Props {
  readonly x: number;
  readonly y: number;
  readonly withMinusW?: boolean;
  readonly prefixEqualsFx?: boolean;
  readonly scale?: number;
}

export function RootR2MinusL2({
  x,
  y,
  withMinusW = false,
  prefixEqualsFx = false,
  scale = 1,
}: RootR2MinusL2Props): ReactElement {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {prefixEqualsFx ? (
        <text x={-38} y={2} textAnchor="end" className="font-math text-sm font-semibold">
          <tspan className="fill-text-primary">|FX|</tspan>
          <tspan className="fill-text-secondary font-normal"> =</tspan>
        </text>
      ) : null}
      <path
        d="M -32 0 L -29 0 L -26 6 L -19 -14 L 34 -14 L 34 -10"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={-6} y={2} textAnchor="middle" className="fill-current font-math text-sm">
        <tspan className="font-semibold italic">r</tspan>
        <tspan dy={-5} className="text-xs font-semibold">
          2
        </tspan>
      </text>
      <text x={8} y={2} textAnchor="middle" className="fill-text-secondary font-math text-sm">
        −
      </text>
      <text x={22} y={2} textAnchor="middle" className="fill-current font-math text-sm">
        <tspan className="font-semibold italic">l</tspan>
        <tspan dy={-5} className="text-xs font-semibold">
          2
        </tspan>
      </text>
      {withMinusW ? (
        <text x={50} y={2} textAnchor="middle" className="font-math text-sm">
          <tspan className="fill-text-secondary">− </tspan>
          <tspan className="fill-current font-semibold italic">w</tspan>
        </text>
      ) : null}
    </g>
  );
}
