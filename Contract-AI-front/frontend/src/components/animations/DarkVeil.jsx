import { useMemo } from "react";
import "./DarkVeil.css";

export default function DarkVeil({
  hueShift = 0,
  noiseIntensity = 0,
  scanlineIntensity = 0,
  speed = 0.5,
  scanlineFrequency = 0,
  warpAmount = 0,
  resolutionScale = 1,
}) {
  const style = useMemo(
    () => ({
      "--dv-hue-shift": `${hueShift}deg`,
      "--dv-noise": Math.max(0, Math.min(noiseIntensity, 1)),
      "--dv-scan": Math.max(0, Math.min(scanlineIntensity, 1)),
      "--dv-speed": `${Math.max(0.1, speed) * 8}s`,
      "--dv-scan-freq": `${Math.max(0.15, scanlineFrequency * 0.25)}rem`,
      "--dv-warp": `${Math.max(0, warpAmount) * 24}px`,
      "--dv-res": Math.max(0.5, resolutionScale),
    }),
    [hueShift, noiseIntensity, scanlineIntensity, speed, scanlineFrequency, warpAmount, resolutionScale]
  );

  return (
    <div className="darkveil-root" style={style}>
      <div className="darkveil-layer darkveil-base" />
      <div className="darkveil-layer darkveil-warp" />
      <div className="darkveil-layer darkveil-scanlines" />
      <div className="darkveil-layer darkveil-noise" />
    </div>
  );
}
