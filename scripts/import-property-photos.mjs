/**
 * One-off: download property photos from the legacy WordPress site into public/properties/.
 * Usage: node scripts/import-property-photos.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const properties = [
  {
    slug: "ferndale-avenue-middlesbrough-ts3-9ds",
    images: [
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5526-scaled.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5548-2048x1869.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5549-2048x1712.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5551-2048x1536.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5552-2048x1536.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5553-2048x1536.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2026/04/IMG_5554-2048x1536.jpg",
    ],
  },
  {
    slug: "howe-street-middlesbrough-ts1-4ld",
    images: [
      "https://www.rent-or-let.co.uk/wp-content/uploads/2020/11/Kitchen-1-scaled.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2020/11/Kitchen-2-2048x1536.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2020/11/Lounge-1-1536x1152.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2020/11/bedroom2-2-2048x1536.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2020/11/Bathroom-3-1536x1152.jpg",
      "https://www.rent-or-let.co.uk/wp-content/uploads/2020/11/Bedroom1-1-1536x1152.jpg",
    ],
  },
];

for (const property of properties) {
  const dir = join(root, "public", "properties", property.slug);
  await mkdir(dir, { recursive: true });

  for (let i = 0; i < property.images.length; i++) {
    const url = property.images[i];
    const ext = url.match(/\.(jpe?g|png|webp)/i)?.[1]?.replace("jpeg", "jpg") ?? "jpg";
    const filename = `${String(i + 1).padStart(2, "0")}.${ext}`;
    const dest = join(dir, filename);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${url}: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buffer);
    console.log(`Saved ${dest} (${buffer.length} bytes)`);
  }
}

console.log("Done.");
