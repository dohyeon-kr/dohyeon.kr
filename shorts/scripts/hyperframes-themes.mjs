const themes = Object.freeze({
  'monoliquid-v2': Object.freeze({
    id: 'monoliquid-v2',
    compositionId: 'monoliquid-v2',
    rootClass: 'ml-theme--dark',
    builder: './build-hyperframes-monoliquid.mjs',
  }),
  'aurora-explain': Object.freeze({
    id: 'aurora-explain',
    compositionId: 'aurora-explain',
    rootClass: 'ax-theme',
    builder: './build-hyperframes-aurora.mjs',
  }),
});

export function getHyperframesTheme(themeId) {
  const theme = themes[themeId];
  if (!theme) throw new Error(`Unsupported HyperFrames theme: ${themeId ?? '(none)'}`);
  return theme;
}

export const listHyperframesThemes = () => Object.values(themes).map(theme => ({...theme}));
