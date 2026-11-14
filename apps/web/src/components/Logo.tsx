export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="lg-g" cx="35%" cy="30%">
          <stop offset="0" stopColor="#2a2f5c" />
          <stop offset="1" stopColor="#0d1124" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="url(#lg-g)" stroke="#ff7a50" strokeWidth="2.5" />
      <path d="M10 32h44M32 10c-9 8-9 36 0 44M32 10c9 8 9 36 0 44" fill="none" stroke="#9b6bff" strokeWidth="2.2" />
      <ellipse cx="32" cy="32" rx="30" ry="9" fill="none" stroke="#ffb26b" strokeOpacity=".55" strokeWidth="1.4" transform="rotate(-18 32 32)" />
    </svg>
  );
}
