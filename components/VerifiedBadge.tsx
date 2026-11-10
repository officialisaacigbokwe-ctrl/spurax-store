// Rough-edged circle with a small, tall shop and a tick in the middle.
function sealPath(lobes = 12, base = 44, amp = 3, points = 120) {
  let d = "";

  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const r = base + amp * Math.cos(lobes * t);
    const x = 50 + r * Math.cos(t);
    const y = 50 + r * Math.sin(t);

    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }

  return `${d}Z`;
}

const SEAL = sealPath();

export default function VerifiedBadge({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Verified by Spurax"
      className={className}
    >
      <title>Verified by Spurax</title>

      {/* rough-edged circle */}
      <path d={SEAL} fill="#000" />

      <g transform="translate(34 28)">
        {/* awning */}
        <path
          d="M4 0 H28 L32 12 a4 3.5 0 0 1 -8 0 a4 3.5 0 0 1 -8 0 a4 3.5 0 0 1 -8 0 a4 3.5 0 0 1 -8 0 Z"
          fill="#fff"
        />

        {/* awning stripes */}
        <path
          d="M10 0 L8 12.2 M16 0 V12.2 M22 0 L24 12.2"
          fill="none"
          stroke="#000"
          strokeWidth="1.3"
        />

        {/* shop body */}
        <path
          d="M4 17 H28 V41 a3 3 0 0 1 -3 3 H7 a3 3 0 0 1 -3 -3 Z"
          fill="#fff"
        />

        {/* tick in the middle of the shop */}
        <path
          d="M9.5 30.5 l4.5 4.5 l9 -10"
          fill="none"
          stroke="#000"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}