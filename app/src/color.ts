import { HCLColor, lch } from 'd3-color'

// PJW-32 hash string to get numeric value
const pjw = (str: string) => {
  let h = 0xffffffff
  for (let i = 0; i < str.length; i++) {
    h = (h << 4) + str.charCodeAt(i)
    const g = h & 0xf0000000
    if (g !== 0) {
      h ^= g >>> 18
      h ^= g
    }
  }
  return Math.abs(h)
}

// returns a css color string
function deterministicColor(str: string, alpha: number = 0.47): HCLColor {
  const hue = pjw(str)
  return lch(40, 132, hue, alpha).brighter()
}
export default deterministicColor
