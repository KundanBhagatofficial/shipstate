import { registerProvider,queryProvider,providerHealth,chooseProvider,providerRegistry } from './registry.js';
import { shipstateLiteProvider } from './structural/shipstate-lite.js';
import { codeReviewGraphProvider } from './structural/code-review-graph.js';
import { codeAtlasProvider } from './semantic/codeatlas.js';
import { uiUxProvider } from './ui/ui-ux-pro-max.js';
import { webDiscoverabilityProvider } from './discoverability/web-native.js';
import { geoSeoProvider } from './discoverability/geo-seo.js';
import { gameForgeProvider } from './workflow/gameforge.js';

for(const p of [shipstateLiteProvider,codeReviewGraphProvider,codeAtlasProvider,uiUxProvider,webDiscoverabilityProvider,geoSeoProvider,gameForgeProvider])registerProvider(p);
export { queryProvider,providerHealth,chooseProvider,providerRegistry } from './registry.js';
