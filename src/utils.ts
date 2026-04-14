import { App, DataAdapter } from 'obsidian';
import type { Profile } from './types';

interface AppWithPlugins extends App {
  plugins: {
    plugins: Record<string, unknown>;
  };
}

// Flattens nested variable objects into a single level map
export function flattenVars(
  varsObject: Record<string, Record<string, string>>,
): Record<string, string> {
  let flatVars: { [key: string]: string } = {};
  for (const category in varsObject) {
    flatVars = { ...flatVars, ...varsObject[category] };
  }
  return flatVars;
}

// Standard relative luminance calculation
export function getLuminance(hex: string): number {
  const rgb = parseInt(hex.startsWith('#') ? hex.substring(1) : hex, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Calculates WCAG contrast ratio between two colors
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Returns rating (AAA, AA, Fail) based on contrast score
export function getAccessibilityRating(ratio: number) {
  const score = ratio.toFixed(2);
  if (ratio >= 7) {
    return { text: 'AAA', score, cls: 'cm-accessibility-pass' };
  }
  if (ratio >= 4.5) {
    return { text: 'AA', score, cls: 'cm-accessibility-pass' };
  }
  if (ratio >= 3) {
    return { text: 'AA Large', score, cls: 'cm-accessibility-warn' };
  }
  return { text: 'Fail', score, cls: 'cm-accessibility-fail' };
}

// Checks if a plugin is both installed AND enabled
export function isPluginEnabled(app: App, pluginIds: string | string[]): boolean {
  const pluginManager = (app as AppWithPlugins).plugins;
  const idsToCheck = Array.isArray(pluginIds) ? pluginIds : [pluginIds];

  return idsToCheck.some((id) => pluginManager.plugins[id]);
}

// Helper check for Iconize or Icon Folder
export function isIconizeEnabled(app: App): boolean {
  const iconizeIDs = ['obsidian-icon-folder', 'iconize'];
  return isPluginEnabled(app, iconizeIDs);
}

// Auto-increments filename if path exists (e.g., file-2.png)
export async function findNextAvailablePath(adapter: DataAdapter, path: string): Promise<string> {
  if (!(await adapter.exists(path))) {
    return path;
  }

  const pathParts = path.split('/');
  const fullFileName = pathParts.pop();
  if (!fullFileName) return path;

  const dir = pathParts.join('/');
  const fileNameParts = fullFileName.split('.');
  const ext = fileNameParts.length > 1 ? fileNameParts.pop() : '';
  const baseName = fileNameParts.join('.');

  let counter = 2;
  let newPath = ext ? `${dir}/${baseName}-${counter}.${ext}` : `${dir}/${baseName}-${counter}`;

  while (await adapter.exists(newPath)) {
    counter++;
    newPath = ext ? `${dir}/${baseName}-${counter}.${ext}` : `${dir}/${baseName}-${counter}`;
  }
  return newPath;
}

// Converts image to JPG using Canvas if setting is enabled
export async function maybeConvertToJpg(
  activeProfile: Profile | undefined,
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<{ arrayBuffer: ArrayBuffer; fileName: string }> {
  const fileExt = fileName.split('.').pop()?.toLowerCase();
  const isAlreadyJpg = fileExt === 'jpg' || fileExt === 'jpeg';
  const supportedToConvert = ['png', 'webp', 'bmp'].includes(fileExt || '');

  if (!activeProfile || !activeProfile.convertImagesToJpg || isAlreadyJpg || !supportedToConvert) {
    return { arrayBuffer, fileName };
  }

  console.debug(`Theme Engine: Converting ${fileName} to JPG...`);

  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('Failed to get canvas context'));
      }

      // Fill background white since JPG doesn't support alpha
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      const quality = (activeProfile.jpgQuality || 85) / 100.0;

      canvas.toBlob(
        (jpgBlob) => {
          if (!jpgBlob) {
            reject(new Error('Failed to create JPG blob'));
            return;
          }

          jpgBlob
            .arrayBuffer()
            .then((newArrayBuffer) => {
              const newFileName = fileName.substring(0, fileName.lastIndexOf('.')) + '.jpg';

              console.debug(
                `Theme Engine: Conversion complete. New size: ${newArrayBuffer.byteLength} bytes`,
              );

              resolve({ arrayBuffer: newArrayBuffer, fileName: newFileName });
            })
            .catch((err) => {
              reject(err instanceof Error ? err : new Error(String(err)));
            });
        },
        'image/jpeg',
        quality,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for conversion'));
    };

    image.src = url;
  });
}

// Reconstructs nested object from dot-notation keys
export function unflattenStrings(flatObject: Record<string, string>): Record<string, unknown> {
  const nestedResult: Record<string, unknown> = {};

  for (const key in flatObject) {
    if (Object.prototype.hasOwnProperty.call(flatObject, key)) {
      const keys = key.split('.');
      let currentLevel = nestedResult;

      for (let i = 0; i < keys.length; i++) {
        const part = keys[i];

        if (i === keys.length - 1) {
          currentLevel[part] = flatObject[key] as unknown;
        } else {
          if (!currentLevel[part] || typeof currentLevel[part] !== 'object') {
            currentLevel[part] = {};
          }
          currentLevel = currentLevel[part] as Record<string, unknown>;
        }
      }
    }
  }
  return nestedResult;
}

function componentToHex(c: number): string {
  const hex = Math.round(c).toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

// Normalizes any CSS color string to Hex/HexA format
export function convertColorToHex(colorString: string): string {
  const s = colorString.toLowerCase().trim();

  if (s === 'transparent') {
    return '#00000000';
  }

  // Expand short hex codes if needed
  if (s.startsWith('#')) {
    if (s.length === 4) {
      const r = s[1];
      const g = s[2];
      const b = s[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    if (s.length === 5) {
      const r = s[1];
      const g = s[2];
      const b = s[3];
      const a = s[4];
      return `#${r}${r}${g}${g}${b}${b}${a}${a}`;
    }
    return s;
  }

  // Use the DOM to normalize other formats (rgb, hsl, names)
  const d = document.createElement('div');
  d.style.color = s;
  document.body.appendChild(d);

  // Browser always computes to rgb/rgba
  const computedColor = getComputedStyle(d).color;
  document.body.removeChild(d);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const a = match[4] ? parseFloat(match[4]) : 1;

    const hexR = componentToHex(r);
    const hexG = componentToHex(g);
    const hexB = componentToHex(b);

    if (a === 1) {
      return `#${hexR}${hexG}${hexB}`;
    } else {
      const hexA = componentToHex(a * 255);
      return `#${hexR}${hexG}${hexB}${hexA}`;
    }
  }

  return s;
}

// Polyfill for HTMLElement.setCssProps (Obsidian 1.7+ API)
declare global {
  interface HTMLElement {
    setCssProps(props: Record<string, string | null>): void;
  }
}

if (!HTMLElement.prototype.setCssProps) {
  HTMLElement.prototype.setCssProps = function (props) {
    for (const key in props) {
      const value = props[key];

      if (value === null || value === undefined || value === '') {
        this.style.removeProperty(key);
      } else {
        try {
          this.style.setProperty(key, value);
        } catch (e) {
          console.warn(`setCssProps: failed to set ${key} = ${value}`, e);
        }
      }
    }
  };
}
