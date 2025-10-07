import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

/**
 * Custom boolean parser for environment variables
 * Properly handles string values like "true", "false", "1", "0"
 */
export const booleanString = () =>
  z
    .string()
    .transform((val) => {
      const normalized = val.toLowerCase().trim();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0' || normalized === '') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
    .pipe(z.boolean());

export { z };
