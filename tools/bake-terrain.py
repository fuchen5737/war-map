#!/usr/bin/env python3
"""离线烘焙地形晕渲图。

从 AWS Terrain Tiles（Terrarium 编码，公有领域）取高程瓦片，重采样到与
src/geo.js 完全一致的 Albers 投影栅格，算中性灰晕渲（128 = 平地），
存成 JPEG。前端把它 clip 在陆地路径里、用 overlay 混合模式贴上去，
所以水域保持纯色、山脊阴影落在陆地上。

用法：
  python3 tools/bake-terrain.py [--zoom 7] [--width 2400] [--quality 80]

产物：data/geo/terrain.jpg
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
CACHE = os.path.join(ROOT, "data", "geo", "raw", "terrain-tiles")

# ---- 与 src/geo.js 保持一致的 Albers 参数（改一处必须改两处） ----
D2R = math.pi / 180
LON0 = 105 * D2R
LAT0 = 35 * D2R
LAT1 = 25 * D2R
LAT2 = 47 * D2R
_N = (math.sin(LAT1) + math.sin(LAT2)) / 2
_C = math.cos(LAT1) ** 2 + 2 * _N * math.sin(LAT1)
_RHO0 = math.sqrt(_C - 2 * _N * math.sin(LAT0)) / _N
EARTH_R = 6371000.0


def unproject(x, y):
    """投影平面 → 经纬度（弧度），向量化版，对应 geo.js 的 unproject。"""
    dy = _RHO0 - y
    rho = np.hypot(x, dy) * (1 if _N > 0 else -1)
    theta = np.arctan2(x, dy)
    phi = np.arcsin(np.clip((_C - (rho * _N) ** 2) / (2 * _N), -1, 1))
    return theta / _N + LON0, phi


def lonlat_to_tile(lon, lat, z):
    n = 2.0**z
    tx = (lon + math.pi) / (2 * math.pi) * n
    ty = (1 - math.asinh(math.tan(lat)) / math.pi) / 2 * n
    return tx, ty


def fetch_tile(z, x, y):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{z}_{x}_{y}.png")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return Image.open(io.BytesIO(f.read())).convert("RGB")
    req = urllib.request.Request(TILE_URL.format(z=z, x=x, y=y), headers={"User-Agent": "war-map/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    with open(path, "wb") as f:
        f.write(data)
    return Image.open(io.BytesIO(data)).convert("RGB")


def decode_terrarium(img):
    a = np.asarray(img, dtype=np.float32)
    return a[..., 0] * 256.0 + a[..., 1] + a[..., 2] / 256.0 - 32768.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zoom", type=int, default=7)
    ap.add_argument("--width", type=int, default=1800)
    ap.add_argument("--quality", type=int, default=76)
    ap.add_argument("--format", default="webp", choices=["webp", "jpg"])
    ap.add_argument("--azimuth", type=float, default=315.0, help="光照方位角，315 = 西北")
    ap.add_argument("--altitude", type=float, default=45.0)
    ap.add_argument("--strength", type=float, default=0.8)
    # 输出栅格约 2.3 km/像素，真实坡度在此尺度上太平缓、晕渲几乎看不见，
    # 因此按制图惯例做垂直夸张（放大高程后再求梯度）。
    ap.add_argument("--vexag", type=float, default=3.5)
    args = ap.parse_args()

    with open(os.path.join(ROOT, "data", "geo", "basemap.json"), encoding="utf-8") as f:
        base = json.load(f)
    minX, minY, maxX, maxY = base["bbox"]
    dx, dy = maxX - minX, maxY - minY
    W = args.width
    H = max(2, round(W * dy / dx))
    print(f"输出栅格 {W}×{H}，bbox {minX:.4f},{minY:.4f} → {maxX:.4f},{maxY:.4f}")

    # ---- 目标栅格的每一点反投影回经纬度 ----
    xs = minX + (np.arange(W, dtype=np.float64) + 0.5) / W * dx
    ys = maxY - (np.arange(H, dtype=np.float64) + 0.5) / H * dy  # 上→下
    gx, gy = np.meshgrid(xs, ys)
    lon, lat = unproject(gx, gy)
    lat = np.clip(lat, -85 * D2R, 85 * D2R)

    # ---- 需要哪些瓦片 ----
    z = args.zoom
    lon_deg, lat_deg = lon / D2R, lat / D2R
    tx0, ty0 = lonlat_to_tile(lon_deg.min() * D2R, lat_deg.max() * D2R, z)
    tx1, ty1 = lonlat_to_tile(lon_deg.max() * D2R, lat_deg.min() * D2R, z)
    x0, x1 = int(math.floor(tx0)), int(math.floor(tx1))
    y0, y1 = int(math.floor(ty0)), int(math.floor(ty1))
    jobs = [(z, tx, ty) for ty in range(y0, y1 + 1) for tx in range(x0, x1 + 1)]
    print(f"抓取 z={z} 瓦片 {len(jobs)} 张（{x0}..{x1} × {y0}..{y1}）")

    n = 2**z
    mosaic = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), dtype=np.float32)
    with ThreadPoolExecutor(max_workers=8) as ex:
        for (_, tx, ty), img in zip(jobs, ex.map(lambda j: fetch_tile(*j), jobs)):
            mosaic[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256] = decode_terrarium(img)
    print(f"高程马赛克 {mosaic.shape[1]}×{mosaic.shape[0]}，范围 {mosaic.min():.0f}..{mosaic.max():.0f} m")

    # ---- 双线性采样 ----
    fx = (lon_deg + 180.0) / 360.0 * n * 256.0 - x0 * 256.0 - 0.5
    fy = (1.0 - np.arcsinh(np.tan(lat)) / math.pi) / 2.0 * n * 256.0 - y0 * 256.0 - 0.5
    fx = np.clip(fx, 0, mosaic.shape[1] - 1.001)
    fy = np.clip(fy, 0, mosaic.shape[0] - 1.001)
    ix, iy = np.floor(fx).astype(np.int32), np.floor(fy).astype(np.int32)
    ax, ay = fx - ix, fy - iy
    e = (
        mosaic[iy, ix] * (1 - ax) * (1 - ay)
        + mosaic[iy, ix + 1] * ax * (1 - ay)
        + mosaic[iy + 1, ix] * (1 - ax) * ay
        + mosaic[iy + 1, ix + 1] * ax * ay
    )
    # 抗锯齿：先轻度平滑，避免 30″ 瓦片直接放大出块状台阶
    e = 0.5 * e + 0.5 * np.pad(e, 1, mode="edge")[1:-1, 1:-1]

    # ---- 坡度与坡向（像素间距按等积投影换算成米） ----
    # 海面及以下压成 0：海底沟壑会顺着海岸线渗进来，糊掉陆海分界。
    e = np.maximum(e, 0.0)
    mpp = dx / W * EARTH_R
    e2 = e * args.vexag
    gy_grad, gx_grad = np.gradient(e2, mpp)  # 注意 gy 沿「上→下」，与 y 轴反向
    grad_up = -gy_grad
    slope = np.arctan(np.hypot(gx_grad, grad_up))
    aspect = np.arctan2(gx_grad, grad_up)  # 0 = 朝正北，顺时针

    az = math.radians(360.0 - args.azimuth + 90.0)  # 光来自方位角 azimuth
    alt = math.radians(args.altitude)
    shade = (
        math.sin(alt) * np.cos(slope)
        + math.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    )
    shade = np.clip(shade, 0.0, 1.0)
    # 以平地亮度为锚：平地不改变底色，坡面才出明暗
    relief = (shade - math.sin(alt)) * args.strength

    # ---- 分层设色（hypsometric tint）----
    # 深色作战图的底色：低地墨绿、高地灰褐。刻意压住高段亮度——
    # 高原一旦逼近白色，琥珀/朱红的战事符号就全被吞掉了。
    STOPS = [
        (0, (64, 76, 58)),
        (200, (72, 84, 62)),
        (600, (84, 93, 66)),
        (1200, (96, 100, 72)),
        (2000, (108, 106, 80)),
        (3200, (122, 116, 92)),
        (4400, (138, 130, 108)),
        (5600, (156, 148, 130)),
    ]
    rgb = np.zeros((*e.shape, 3), dtype=np.float32)
    prev_h, prev_c = STOPS[0]
    rgb[:] = prev_c
    for h, col in STOPS[1:]:
        t = np.clip((e - prev_h) / (h - prev_h), 0.0, 1.0)[..., None]
        rgb = rgb * (1 - t) + np.array(col, dtype=np.float32) * t
        prev_h = h
    # 晕渲乘上去：坡面明暗，平地保持原色
    rgb = rgb * (1.0 + relief[..., None] * 1.05)
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)

    ext = "webp" if args.format == "webp" else "jpg"
    out = os.path.join(ROOT, "data", "geo", f"terrain.{ext}")
    img = Image.fromarray(rgb, mode="RGB")
    if args.format == "webp":
        img.save(out, "WEBP", quality=args.quality, method=6)
    else:
        img.save(out, "JPEG", quality=args.quality, optimize=True, progressive=True)
    kb = os.path.getsize(out) / 1024
    print(f"写出 {out} — {W}×{H}，{kb:.0f} KB")
    if kb > 900:
        print("提示：文件偏大，可降 --width 或 --quality 再烘一次", file=sys.stderr)


if __name__ == "__main__":
    main()
