'use client';

import React from 'react';

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
        JP
      </div>
      <div className="flex flex-col">
        <div className="text-base font-semibold leading-tight text-ink">
          Japfa Control Tower
        </div>
        <div className="text-xs leading-relaxed text-ink-soft">
          Hệ thống giám sát vận hành
        </div>
      </div>
    </div>
  );
}
