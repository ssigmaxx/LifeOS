import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          borderRadius: 96,
        }}
      >
        <svg width="260" height="260" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 0 C12.8 8.2 15.8 11.2 24 12 C15.8 12.8 12.8 15.8 12 24 C11.2 15.8 8.2 12.8 0 12 C8.2 11.2 11.2 8.2 12 0 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
