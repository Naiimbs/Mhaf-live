import * as React from "react";

export function MeetingIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 320 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-[280px] drop-shadow-sm"
      >
        {/* Soft pastel ambient background blobs */}
        <circle cx="160" cy="130" r="95" fill="#E8F8F5" />
        <path
          d="M260 80C275 95 280 125 270 145C258 170 230 180 205 180C170 180 140 195 125 175C110 155 125 130 135 110C150 80 170 65 200 65C225 65 245 68 260 80Z"
          fill="#DDF3F0"
          opacity="0.6"
        />

        {/* Decorative leafy mint accents */}
        <path
          d="M75 140C65 145 55 138 52 130C50 120 60 115 70 120C75 123 78 132 75 140Z"
          fill="#A7F3D0"
          opacity="0.7"
        />
        <path
          d="M280 110C290 105 295 115 292 122C288 130 278 128 275 120C273 115 276 112 280 110Z"
          fill="#A7F3D0"
          opacity="0.6"
        />

        {/* Calendar Shadow */}
        <rect
          x="75"
          y="75"
          width="135"
          height="120"
          rx="18"
          fill="#06182D"
          opacity="0.08"
          transform="rotate(-4 142 135)"
        />

        {/* Calendar Body (Navy Base Frame) */}
        <rect
          x="70"
          y="65"
          width="140"
          height="125"
          rx="18"
          fill="#09264D"
          transform="rotate(-3 140 127)"
        />

        {/* Calendar Top Binders / Rings */}
        <rect x="95" y="55" width="8" height="18" rx="4" fill="#01377A" transform="rotate(-3 99 64)" />
        <rect x="135" y="53" width="8" height="18" rx="4" fill="#01377A" transform="rotate(-3 139 62)" />
        <rect x="175" y="51" width="8" height="18" rx="4" fill="#01377A" transform="rotate(-3 179 60)" />

        {/* Calendar Page (White Surface) */}
        <rect
          x="74"
          y="73"
          width="132"
          height="113"
          rx="14"
          fill="#FFFFFF"
          transform="rotate(-3 140 129)"
        />

        {/* Grid of Soft Blue Date Squares */}
        <g transform="rotate(-3 140 129)">
          {/* Row 1 */}
          <rect x="88" y="88" width="18" height="14" rx="4" fill="#E2E8F0" />
          <rect x="114" y="88" width="18" height="14" rx="4" fill="#E2E8F0" />
          <rect x="140" y="88" width="18" height="14" rx="4" fill="#CBD5E1" />
          <rect x="166" y="88" width="18" height="14" rx="4" fill="#E2E8F0" />

          {/* Row 2 */}
          <rect x="88" y="110" width="18" height="14" rx="4" fill="#E2E8F0" />
          <rect x="114" y="110" width="18" height="14" rx="4" fill="#BFDBFE" />
          <rect x="140" y="110" width="18" height="14" rx="4" fill="#E2E8F0" />
          <rect x="166" y="110" width="18" height="14" rx="4" fill="#BFDBFE" />

          {/* Row 3 */}
          <rect x="88" y="132" width="18" height="14" rx="4" fill="#E2E8F0" />
          <rect x="114" y="132" width="18" height="14" rx="4" fill="#CBD5E1" />
          <rect x="140" y="132" width="18" height="14" rx="4" fill="#E2E8F0" />
          <rect x="166" y="132" width="18" height="14" rx="4" fill="#E2E8F0" />

          {/* Green Checkmark Circle Badge on the Calendar */}
          <circle cx="150" cy="142" r="16" fill="#10B981" />
          <path
            d="M142 142L147 147L158 136"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Foreground Clock Shadow */}
        <circle cx="218" cy="168" r="42" fill="#06182D" opacity="0.08" />

        {/* Clock Outer Rim */}
        <circle cx="214" cy="164" r="40" fill="#01377A" />

        {/* Clock Inner Dial Face */}
        <circle cx="214" cy="164" r="34" fill="#FFFFFF" />

        {/* Clock Center Pin */}
        <circle cx="214" cy="164" r="3.5" fill="#09264D" />

        {/* Clock Hour Hand (pointing to ~3:00) */}
        <path
          d="M214 164H232"
          stroke="#09264D"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Clock Minute Hand (pointing to 12:00) */}
        <path
          d="M214 164V142"
          stroke="#09264D"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Subtle coral accent dot on the clock */}
        <circle cx="214" cy="136" r="2" fill="#FD2E2D" />
      </svg>
    </div>
  );
}
