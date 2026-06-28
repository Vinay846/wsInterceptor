export default {
  entryType: 'game',
  name: 'sweetbonanza',
  development: {
    staticPath: 'https://dev2-static.pragmaticplaylive.net',
  },
  viteConfig: {
    define: {
      TRANSLATION_PATH: JSON.stringify('apps'),
    },
  },
};
