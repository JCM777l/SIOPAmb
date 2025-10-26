import React from 'react';

export const RANKS = [
  'Soldado PM', 'Cabo PM', '3º Sgt PM', '2º Sgt PM', '1º Sgt PM', 
  'Subten PM', 'Tenente PM', 'Capitão PM'
];

export const PLATOONS = ['1º pelotão', '2º pelotão', '3º pelotão', '2ª Cia'];

export const PLATOONS_INTEGRATED = ['1º pel.', '2º pel.', '3º pel.', '2ª Cia.'];

export const PLATOONS_FORM = ['1º', '2º', '3º', '2ª Cia.'];

export const SCALE_TYPES = ['Ordinária', 'DEJEM'];

export const NUMERIC_OPTIONS_1_TO_10 = Array.from({ length: 10 }, (_, i) => i + 1);

export const SilverStar = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 inline-block text-gray-300"
  >
    <path
      fillRule="evenodd"
      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z"
      clipRule="evenodd"
    />
  </svg>
);
