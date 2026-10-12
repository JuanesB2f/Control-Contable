import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

/**
 * PNG version of the vector logo for platforms that need bitmaps (iOS home screen, Android install).
 * Maskable icons get a 20% margin so Android's circle/squircle crop never cuts the logo.
 */
export async function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"))
  const logo = maskable ? Math.round(size * 0.8) : size
  return new ImageResponse(
    (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>, next/image isn't available here */}
        <img src={`data:image/svg+xml;base64,${svg.toString("base64")}`} width={logo} height={logo} alt="" />
      </div>
    ),
    { width: size, height: size },
  )
}
