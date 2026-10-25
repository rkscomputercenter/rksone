import React, { useId } from 'react';

/*
 * RKS ONE logo, drawn as paths (no image, no font dependency).
 * RKS takes the surrounding text color (white on dark, graphite on light), ONE and the
 * orbit keep the brand's blue-to-violet gradient. Letter paths live in a 0–764 × 0–100 box.
 */

const BRAND = {
  violet: '#9B3CF4',
  blue: '#5F7DFF',
  indigo: '#7B61FF',
  lilac: '#C9A8FF',
};

/** R without its stem: a ribbon bowl, the leg, and a violet wedge where the stem would be. */
function RLetter({ wedge }: { wedge: string }) {
  return (
    <>
      <path d="M14 0 H84 C104 0 118 14 118 31 C118 48 104 61 84 61 H52 L36 37 H82 C87 37 91 35 91 30.5 C91 26 87 24 82 24 H30 Z" />
      <path d="M64 61 H96 L128 100 H94 Z" />
      <path fill={wedge} d="M0 100 L52 32 V100 Z" />
    </>
  );
}

const K = <>
  <path d="M148 0 H174 V100 H148 Z" />
  <path d="M176 40 L226 0 H264 L196 54 Z" />
  <path d="M196 44 L266 100 H228 L176 60 Z" />
</>;
const S = <path d="M386 0 V24 H312 C307 24 304 26.5 304 30 C304 33.5 307 36 312 36 H356 C373 36 386 49 386 66 V70 C386 87 373 100 356 100 H280 V76 H354 C359 76 362 73.5 362 70 C362 66.5 359 64 354 64 H310 C293 64 280 51 280 34 V30 C280 13 293 0 310 0 Z" />;
const ONE = <>
  <path fillRule="evenodd" d="M454 0 H498 C517 0 532 15 532 34 V66 C532 85 517 100 498 100 H454 C435 100 420 85 420 66 V34 C420 15 435 0 454 0 Z M456 24 C449 24 444 29 444 36 V64 C444 71 449 76 456 76 H496 C503 76 508 71 508 64 V36 C508 29 503 24 496 24 Z" />
  <path d="M552 100 V0 H582 L630 66 V0 H654 V100 H624 L576 34 V100 Z" />
  <path d="M674 0 H764 V24 H698 V38 H754 V62 H698 V76 H764 V100 H674 Z" />
</>;

function useIds(...names: string[]) {
  const base = useId().replace(/:/g, '');
  return Object.fromEntries(names.map(n => [n, `${base}-${n}`])) as Record<string, string>;
}

interface LogoProps {
  /** Rendered height in px; width follows the logo's proportions. */
  height?: number;
  /** The two crescents around the letters. Off for very small sizes. */
  orbit?: boolean;
  /** Soft light around the orbit; looks right on dark backgrounds only. */
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** The full RKS ONE wordmark. */
export function RksOneLogo({ height = 40, orbit = true, glow = false, className, style }: LogoProps) {
  const id = useIds('one', 'top', 'bottom', 'wedge', 'glow');
  const box = orbit ? { w: 820, h: 236, x: 36, y: 64 } : { w: 772, h: 108, x: 4, y: 4 };
  return (
    <svg role="img" aria-label="RKS ONE" viewBox={`0 0 ${box.w} ${box.h}`} height={height}
      width={(height * box.w) / box.h} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id.one} x1="420" y1="0" x2="764" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} />
          <stop offset="0.45" stopColor={BRAND.blue} />
          <stop offset="1" stopColor={BRAND.violet} />
        </linearGradient>
        <linearGradient id={id.top} x1="300" y1="0" x2="780" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8B3CF4" stopOpacity="0.15" />
          <stop offset="0.35" stopColor="#9B4DFA" />
          <stop offset="0.7" stopColor={BRAND.lilac} />
          <stop offset="1" stopColor="#5F6DFF" />
        </linearGradient>
        <linearGradient id={id.bottom} x1="80" y1="0" x2="560" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7A3CF0" />
          <stop offset="0.45" stopColor="#9B6BFF" />
          <stop offset="1" stopColor={BRAND.blue} stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={id.wedge} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#A43CF5" />
          <stop offset="1" stopColor="#7B4DFF" />
        </linearGradient>
        {glow && <filter id={id.glow} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>}
      </defs>

      {orbit && (() => {
        const crescents = (
          <>
            <path fill={`url(#${id.top})`} d="M262 58 C 400 26, 600 8, 706 12 C 752 14, 766 34, 718 64 C 730 42, 718 30, 694 30 C 560 26, 420 36, 262 58 Z" />
            <path fill={`url(#${id.bottom})`} d="M540 178 C 430 208, 270 228, 174 224 C 124 222, 108 198, 150 180 C 136 198, 152 208, 194 208 C 304 208, 424 198, 540 178 Z" />
          </>
        );
        return (
          <>
            {glow && <g filter={`url(#${id.glow})`} opacity="0.7">{crescents}</g>}
            {crescents}
          </>
        );
      })()}

      <g transform={`translate(${box.x} ${box.y})`}>
        <g fill="currentColor">
          <RLetter wedge={`url(#${id.wedge})`} />
          {K}
          {S}
        </g>
        <g fill={`url(#${id.one})`}>{ONE}</g>
      </g>
    </svg>
  );
}

/** Square app mark: the R with its wedge inside the orbit, on the brand's night background. */
export function RksOneMark({ size = 40, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const id = useIds('bg', 'wedge', 'orbit');
  return (
    <svg role="img" aria-label="RKS ONE" viewBox="0 0 128 128" width={size} height={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id.bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#151238" />
          <stop offset="1" stopColor="#07060F" />
        </linearGradient>
        <linearGradient id={id.wedge} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#A43CF5" />
          <stop offset="1" stopColor="#7B4DFF" />
        </linearGradient>
        <linearGradient id={id.orbit} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8B3CF4" />
          <stop offset="0.6" stopColor={BRAND.lilac} />
          <stop offset="1" stopColor={BRAND.blue} />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill={`url(#${id.bg})`} />
      <path fill={`url(#${id.orbit})`} d="M22 50 C 44 30, 86 20, 104 26 C 118 31, 116 44, 104 54 C 108 44, 104 37, 94 36 C 74 34, 46 40, 22 50 Z" />
      <path fill={`url(#${id.orbit})`} opacity="0.85" d="M106 88 C 84 104, 46 112, 28 106 C 14 101, 14 90, 26 82 C 22 92, 28 97, 40 98 C 60 99, 86 94, 106 88 Z" />
      <g transform="translate(34 38) scale(0.47)" fill="#fff">
        <RLetter wedge={`url(#${id.wedge})`} />
      </g>
    </svg>
  );
}
