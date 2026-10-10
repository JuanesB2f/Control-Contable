import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** iOS needs a PNG for "Add to Home Screen"; it's rendered from the same vector logo as the favicon. */
export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"))
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>, next/image isn't available here */}
        <img src={`data:image/svg+xml;base64,${svg.toString("base64")}`} width={size.width} height={size.height} alt="" />
      </div>
    ),
    size,
  )
}
