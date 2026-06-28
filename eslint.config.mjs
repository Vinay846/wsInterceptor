import { fileURLToPath } from 'node:url';

import { createBaseConfig } from '../../eslint.config.base.mjs';

export default createBaseConfig({
  tsconfigPath: './tsconfig.json',
  rootDir: fileURLToPath(new URL('.', import.meta.url)),
});
