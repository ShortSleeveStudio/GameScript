import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { optimizeImports, optimizeCss, icons, pictograms } from "carbon-preprocess-svelte";

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: [vitePreprocess(), optimizeImports(), icons(), pictograms()],
  kit: {
    vite: {
      plugins: [process.env.NODE_ENV === "production" && optimizeCss()],
    },
  },
};
