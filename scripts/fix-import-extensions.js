import fs from 'fs/promises';
import path from 'path';

async function fixExtensions(dir) {
  const entries = await fs.readdir(dir, { recursive: true });

  for (const entry of entries) {
    if (!entry.endsWith('.js')) continue;

    const fullPath = path.join(dir, entry);
    let content = await fs.readFile(fullPath, 'utf8');

    // Add .js to relative imports/exports that don't have an extension
    content = content.replace(
      /(from|import)\s+["'](\.\/|\.\.\/)([^"']*?)(?<!\.js|\.json|\.mjs|\.cjs)["']/g,
      (match, keyword, prefix, importPath) => {
        return `${keyword} '${prefix}${importPath}.js'`;
      }
    );

    await fs.writeFile(fullPath, content);
    console.log(`✓ Fixed: ${entry}`);
  }
}

fixExtensions('./examples/dist').catch(console.error);