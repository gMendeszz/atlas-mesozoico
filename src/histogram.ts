// Drawing of the timeline histogram (an SVG path in a 186 × 40 frame).
import { MA_SPAN } from "./constants";

// Square-root scale: without it, the end-Cretaceous peak flattens everything and the Triassic
// (few fossils) disappears. Each million years becomes a step 1 wide.
export function histogramPath(histogram: ArrayLike<number>): string {
  const values = Array.from(histogram);
  const max = Math.max(...values);
  let d = "M0,40";
  if (max > 0) {
    values.forEach((v, b) => {
      const y = (40 - 38 * Math.sqrt(v / max)).toFixed(1);
      d += `L${b},${y}L${b + 1},${y}`;
    });
  }
  return `${d}L${MA_SPAN},40Z`;
}
