# Solar System texture data

These user-requested astronomical maps are stored locally so GPU uploads do
not depend on third-party CORS or hotlink availability.

| Files                                                  | Source / credit                                                                                     | License                                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Planet, Sun, Earth clouds and night maps (2048 × 1024) | [Solar System Scope](https://www.solarsystemscope.com/textures/), based on NASA imagery             | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                                                                    |
| `milkyway.jpg` (4000 × 2000)                           | **ESO/S. Brunier**, [The Milky Way panorama, eso0932a](https://www.eso.org/public/images/eso0932a/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [ESO usage terms](https://www.eso.org/public/outreach/copyright/) |

The files are unmodified downloads. Rendering applies exposure, tone mapping,
cloud opacity, and an illustrative sky orientation. Rings and atmosphere are
generated with geometry and shaders. The source maps are visualization assets,
not exact current weather or season-dependent imagery.

`art-sources.json` records the exact source URLs, byte sizes, and SHA-256 hashes.
Refresh the files intentionally with `node scripts/solar-art.mjs` from the repo
root. Builds use the checked-in files and need no texture downloads.
