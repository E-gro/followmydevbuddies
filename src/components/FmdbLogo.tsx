import React from 'react';

interface FmdbLogoProps {
  className?: string;
}

export const FmdbLogo: React.FC<FmdbLogoProps> = ({ className = 'h-10 w-10' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Follow My Dev Buddies Logo"
    >
      <defs>
        <linearGradient
          id="fmdb-logo-bg"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#090D16" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient
          id="fmdb-logo-grad"
          x1="8"
          y1="12"
          x2="56"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient
          id="fmdb-logo-gold"
          x1="22"
          y1="8"
          x2="42"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#fmdb-logo-bg)" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke="url(#fmdb-logo-grad)"
        strokeOpacity="0.55"
        strokeWidth="2.2"
      />

      {/* Code Brackets < > */}
      <path
        d="M17 24L9 32L17 40"
        stroke="url(#fmdb-logo-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M47 24L55 32L47 40"
        stroke="url(#fmdb-logo-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left Buddy Node */}
      <circle cx="25" cy="27" r="4.5" fill="#10B981" />
      <path
        d="M18.5 41C18.5 36.8 21.4 34 25 34C28.6 34 31.5 36.8 31.5 41"
        stroke="#10B981"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Right Buddy Node */}
      <circle cx="39" cy="27" r="4.5" fill="#06B6D4" />
      <path
        d="M32.5 41C32.5 36.8 35.4 34 39 34C42.6 34 45.5 36.8 45.5 41"
        stroke="#06B6D4"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Connection Bridge */}
      <path
        d="M27 45C30.5 47.5 33.5 47.5 37 45"
        stroke="url(#fmdb-logo-grad)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Top Community Crown Accent */}
      <path
        d="M27 15.5L30 18.5L32 13.5L34 18.5L37 15.5L36 20.5H28L27 15.5Z"
        fill="url(#fmdb-logo-gold)"
      />
    </svg>
  );
};
