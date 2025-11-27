// @ts-check
import { defineConfig } from 'astro/config';

import solidJs from '@astrojs/solid-js';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';


import vercel from '@astrojs/vercel';


// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [solidJs()],

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});