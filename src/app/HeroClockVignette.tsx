"use client";

import { useEffect, useState } from "react";

function getClockAngles(date: Date) {
  const milliseconds = date.getMilliseconds();
  const seconds = date.getSeconds() + milliseconds / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  return {
    second: seconds * 6,
    minute: minutes * 6,
    hour: hours * 30,
  };
}

export default function HeroClockVignette() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const frame = window.requestAnimationFrame(tick);
    const interval = window.setInterval(tick, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, []);

  const angles = getClockAngles(now ?? new Date(2020, 0, 1, 10, 10, 30));
  const hourTicks = Array.from({ length: 12 }, (_, index) => {
    const angle = index * 30;
    return (
      <line
        key={angle}
        x1="100"
        y1="55"
        x2="100"
        y2="62"
        stroke="currentColor"
        strokeWidth={index % 3 === 0 ? 3 : 2}
        strokeLinecap="round"
        transform={`rotate(${angle} 100 100)`}
        opacity={index % 3 === 0 ? 0.42 : 0.22}
      />
    );
  });

  const minuteTicks = Array.from({ length: 60 }, (_, index) => {
    if (index % 5 === 0) return null;
    const angle = index * 6;
    return (
      <line
        key={angle}
        x1="100"
        y1="57"
        x2="100"
        y2="59"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        transform={`rotate(${angle} 100 100)`}
        opacity={0.16}
      />
    );
  });

  const sunRaySegments = [
    "M96 17 100 11 104 17 102 55 98 55Z",
    "M79 31 85 28 96 55 91 58Z",
    "M121 31 115 28 104 55 109 58Z",
  ];

  const sunRays = Array.from({ length: 8 }, (_, index) => {
    const angle = index * 45;
    return (
      <g key={angle} transform={`rotate(${angle} 100 100)`}>
        {sunRaySegments.map((segment) => (
          <g key={segment}>
            <path
              d={segment}
              fill="none"
              stroke="url(#copper-shadow)"
              strokeWidth="3"
              strokeLinejoin="round"
              opacity="0.22"
              transform="translate(1.1 1.6)"
            />
            <path
              d={segment}
              fill="none"
              stroke="url(#copper-wire)"
              strokeWidth="1.9"
              strokeLinejoin="round"
              opacity="0.9"
            />
            <path
              d={segment}
              fill="none"
              stroke="url(#copper-highlight)"
              strokeWidth="0.65"
              strokeLinejoin="round"
              opacity="0.62"
              transform="translate(-0.45 -0.45)"
            />
          </g>
        ))}
      </g>
    );
  });

  const bentWireHand = (path: string, width: number, opacity = 0.94) => (
    <g>
      <path
        d={path}
        fill="none"
        stroke="url(#copper-shadow)"
        strokeWidth={width + 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.2"
        transform="translate(1.1 1.6)"
      />
      <path
        d={path}
        fill="none"
        stroke="url(#bronze-hand)"
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
      <path
        d={path}
        fill="none"
        stroke="#f3c982"
        strokeWidth={Math.max(0.7, width * 0.22)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.38"
        transform="translate(-0.55 -0.55)"
      />
    </g>
  );

  const hangerWireHand = (length: number, halfWidth: number, opacity = 0.88) => {
    const tipY = 100 - length;
    const baseY = 106;
    const shoulderY = baseY - 8;

    return (
      <g>
        <path
          d={`M${100 - halfWidth} ${baseY} ${100 - halfWidth} ${shoulderY} 100 ${tipY} ${100 + halfWidth} ${shoulderY} ${100 + halfWidth} ${baseY}`}
          fill="none"
          stroke="url(#copper-shadow)"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.2"
          transform="translate(1.1 1.6)"
        />
        <path
          d={`M${100 - halfWidth} ${baseY} ${100 - halfWidth} ${shoulderY} 100 ${tipY} ${100 + halfWidth} ${shoulderY} ${100 + halfWidth} ${baseY}`}
          fill="none"
          stroke="url(#copper-wire)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
        <path
          d={`M${100 - halfWidth} ${baseY} ${100 - halfWidth} ${shoulderY} 100 ${tipY} ${100 + halfWidth} ${shoulderY} ${100 + halfWidth} ${baseY}`}
          fill="none"
          stroke="url(#copper-highlight)"
          strokeWidth="0.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.52"
          transform="translate(-0.45 -0.45)"
        />
      </g>
    );
  };

  return (
    <div className="relative mx-auto my-8 flex w-full max-w-[30rem] justify-center sm:my-10">
      <div className="absolute inset-2 rounded-full bg-amber-200/24 blur-3xl dark:bg-amber-500/10" />
      <div className="relative bg-transparent p-5">
        <svg
          className="hero-clock h-[22rem] w-[22rem] text-[#3f3427] dark:text-[#f3e7cf] sm:h-[27rem] sm:w-[27rem]"
          viewBox="0 0 200 200"
          role="img"
          aria-label="Animated local time clock painter"
        >
          <defs>
            <radialGradient id="clock-face" cx="45%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#fff9ea" />
              <stop offset="58%" stopColor="#f7ecd2" />
              <stop offset="100%" stopColor="#ead8b7" />
            </radialGradient>
            <linearGradient id="clock-ring" x1="45" y1="42" x2="158" y2="160">
              <stop offset="0%" stopColor="#b98254" />
              <stop offset="48%" stopColor="#89512f" />
              <stop offset="100%" stopColor="#4a2d20" />
            </linearGradient>
            <linearGradient id="copper-wire" x1="70" y1="10" x2="130" y2="72">
              <stop offset="0%" stopColor="#bc8657" />
              <stop offset="42%" stopColor="#85502f" />
              <stop offset="72%" stopColor="#4d3023" />
              <stop offset="100%" stopColor="#a6683e" />
            </linearGradient>
            <linearGradient id="copper-highlight" x1="75" y1="12" x2="115" y2="60">
              <stop offset="0%" stopColor="#d6a06d" />
              <stop offset="55%" stopColor="#9a633b" />
              <stop offset="100%" stopColor="#6a412c" />
            </linearGradient>
            <linearGradient id="bronze-hand" x1="92" y1="44" x2="108" y2="120">
              <stop offset="0%" stopColor="#c58b5b" />
              <stop offset="32%" stopColor="#8b5532" />
              <stop offset="68%" stopColor="#473025" />
              <stop offset="100%" stopColor="#aa6b40" />
            </linearGradient>
            <linearGradient id="copper-shadow" x1="70" y1="12" x2="130" y2="70">
              <stop offset="0%" stopColor="#513323" />
              <stop offset="100%" stopColor="#211711" />
            </linearGradient>
            <radialGradient id="bronze-rivet" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#e2b078" />
              <stop offset="36%" stopColor="#9a6038" />
              <stop offset="74%" stopColor="#533526" />
              <stop offset="100%" stopColor="#201611" />
            </radialGradient>
            <filter id="copper-soft-shadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0.7" dy="1.2" stdDeviation="0.6" floodColor="#3f2718" floodOpacity="0.18" />
            </filter>
          </defs>

          <g filter="url(#copper-soft-shadow)">{sunRays}</g>
          <circle cx="100" cy="100" r="49" fill="rgba(255, 249, 234, 0.34)" stroke="url(#clock-ring)" strokeWidth="2.2" opacity="0.96" />
          <circle cx="99.3" cy="99.2" r="49" fill="none" stroke="url(#copper-highlight)" strokeWidth="0.7" opacity="0.5" />
          <circle cx="100" cy="100" r="38" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.08" />

          {minuteTicks}
          {hourTicks}

          <g style={{ transform: `rotate(${angles.hour}deg)`, transformOrigin: "100px 100px" }}>
            {hangerWireHand(31, 1.7, 0.9)}
          </g>

          <g style={{ transform: `rotate(${angles.minute}deg)`, transformOrigin: "100px 100px" }}>
            {hangerWireHand(43, 1.7, 0.9)}
          </g>

          <g style={{ transform: `rotate(${angles.second}deg)`, transformOrigin: "100px 100px" }}>
            {bentWireHand("M100 112 99 94 101 74 100 56", 2.2, 0.82)}
          </g>

          <g>
            <circle cx="100" cy="100" r="4.1" fill="none" stroke="url(#copper-shadow)" strokeWidth="0.9" opacity="0.24" transform="translate(0.6 0.7)" />
            <circle cx="100" cy="100" r="4" fill="none" stroke="url(#clock-ring)" strokeWidth="0.75" opacity="0.86" />
            <circle cx="100" cy="100" r="2.7" fill="none" stroke="url(#copper-highlight)" strokeWidth="0.45" opacity="0.66" />
            <g transform="rotate(45 100 100)" opacity="0.72">
              <path d="M100 95.8 101 99 100 100 99 99Z" fill="none" stroke="url(#copper-wire)" strokeWidth="0.65" strokeLinejoin="round" />
              <path d="M104.2 100 101 101 100 100 101 99Z" fill="none" stroke="url(#copper-wire)" strokeWidth="0.65" strokeLinejoin="round" />
              <path d="M100 104.2 99 101 100 100 101 101Z" fill="none" stroke="url(#copper-wire)" strokeWidth="0.65" strokeLinejoin="round" />
              <path d="M95.8 100 99 99 100 100 99 101Z" fill="none" stroke="url(#copper-wire)" strokeWidth="0.65" strokeLinejoin="round" />
            </g>
            <path
              d="M100 94.9 101.1 98.9 105.1 100 101.1 101.1 100 105.1 98.9 101.1 94.9 100 98.9 98.9Z"
              fill="none"
              stroke="url(#copper-shadow)"
              strokeWidth="1.1"
              strokeLinejoin="round"
              opacity="0.24"
              transform="translate(0.5 0.6)"
            />
            <path
              d="M100 94.9 101.1 98.9 105.1 100 101.1 101.1 100 105.1 98.9 101.1 94.9 100 98.9 98.9Z"
              fill="none"
              stroke="url(#copper-wire)"
              strokeWidth="0.7"
              strokeLinejoin="round"
              opacity="0.9"
            />
            <circle cx="100" cy="100" r="1.2" fill="url(#bronze-rivet)" opacity="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
}
