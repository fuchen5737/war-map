// 绘图组件库的入口。所有组件都是「给我上下文和参数，我画」的函数，
// 不认识战事数据，也不读 DOM 状态——这样它们能被任何一版地图复用。

export { clamp, lerp, easeOut, smoothstep, pulse, window01, parseHex, rgba, mixColor, lighten } from "./ease.js";
export { hatchPattern, hatchFill, clearHatchCache, hatchCacheSize, hatchTileSize } from "./hatch.js";
export { drawRisingSun, drawFlame, drawStar, drawBracket, drawSeal } from "./marks.js";
export {
  drawVignette,
  drawCaptionBand,
  drawYearCard,
  drawCaption,
  drawKicker,
  drawSource,
  drawDayCount,
  drawTitleCard,
  drawFilmLegend,
  drawLetterbox,
  textShadow,
  wrapLines,
  FONTS,
  drawPanelTitle,
  drawCityGrid,
  drawQuoteBlock,
  drawFallTag,
  drawInsetFrame,
} from "./overlay.js";
