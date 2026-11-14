#!/usr/bin/env python3
"""Genera WEH, DEM y pendiente para la ventana AP-1.

Requiere rasterio + numpy. El DEM MOLA se lee por HTTP con /vsicurl/ y solo
se descargan las filas necesarias; también se puede pasar un GeoTIFF local con
MOLA_DEM_PATH.
"""

import os
import time
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import Resampling, reproject
from rasterio.windows import Window

DATA_DIR = Path(__file__).resolve().parents[1] / "src" / "data" / "swim"
MOLA_DEM_URL = os.environ.get(
    "MOLA_DEM_URL",
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
)
MOLA_DEM_PATH = os.environ.get("MOLA_DEM_PATH")
MARS_RADIUS_M = 3396190.0


def signed_lon(lon):
    return ((lon + 180.0) % 360.0) - 180.0


def write_weh():
    src_path = DATA_DIR / "swim_ap1_neutron_weh.tif"
    out_path = DATA_DIR / "swim_ap1_weh.tif"
    with rasterio.open(src_path) as src:
        neutron = src.read(1).astype("float64")
        valid = neutron != src.nodata
        weh = np.full(neutron.shape, -9999.0, dtype="float32")
        weh[valid] = np.where(
            neutron[valid] >= 0, 10.0 + 15.0 * neutron[valid], 10.0 + 5.0 * neutron[valid]
        )
        profile = src.profile.copy()
        profile.update(dtype="float32", nodata=-9999.0, compress="deflate")
        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(weh, 1)
            dst.update_tags(
                units="percent WEH",
                method="inverse SWIM Cn scaling: n>=0 -> 10+15n; n<0 -> 10+5n",
                source="Pathare et al. 2018 W_dn via SWIM 2.0 Northern_Cn",
                clip="5..25 (SWIM saturated outside)",
            )
    print(f"OK {out_path.name}: {out_path.stat().st_size} bytes")


def write_dem_and_slope():
    with rasterio.open(DATA_DIR / "swim_ap1_consistency_0_1m.tif") as grid:
        dst_transform = grid.transform
        dst_crs = grid.crs
        width, height = grid.width, grid.height
        bbox = grid.bounds

    source = f"/vsicurl/{MOLA_DEM_URL}" if MOLA_DEM_PATH is None else MOLA_DEM_PATH
    with rasterio.open(source) as dem:
        left = signed_lon(bbox.left) / 180.0 * dem.bounds.right
        right = signed_lon(bbox.right) / 180.0 * dem.bounds.right
        top = bbox.top / 90.0 * dem.bounds.top
        bottom = bbox.bottom / 90.0 * dem.bounds.top
        col = int(round((left - dem.bounds.left) / dem.transform.a))
        row = int(round((dem.bounds.top - top) / abs(dem.transform.e)))
        win_w = int(round((right - left) / dem.transform.a))
        win_h = int(round((top - bottom) / abs(dem.transform.e)))
        window = Window(col, row, win_w, win_h)
        print(f"Leyendo DEM {win_w}x{win_h} (puede tardar por /vsicurl/)...")
        started = time.time()
        native = dem.read(1, window=window)
        src_transform = rasterio.windows.transform(window, dem.transform)
        src_crs = dem.crs
        print(f"DEM leído en {time.time() - started:.1f} s")

    dem_grid = np.empty((height, width), dtype="int16")
    reproject(
        source=native,
        destination=dem_grid,
        src_transform=src_transform,
        src_crs=src_crs,
        dst_transform=dst_transform,
        dst_crs=dst_crs,
        resampling=Resampling.bilinear,
    )

    dem_path = DATA_DIR / "mola_ap1_dem.tif"
    with rasterio.open(
        dem_path,
        "w",
        driver="GTiff",
        width=width,
        height=height,
        count=1,
        dtype="int16",
        crs=dst_crs,
        transform=dst_transform,
        nodata=-32768,
        compress="deflate",
    ) as dst:
        dst.write(dem_grid, 1)
        dst.update_tags(units="meters", source="MOLA DEM 463m (USGS), bilinear to 0.05 deg")

    step_m = np.deg2rad(0.05) * MARS_RADIUS_M
    lats = np.array([dst_transform.f + (row + 0.5) * dst_transform.e for row in range(height)])
    dx = step_m * np.cos(np.deg2rad(lats))[:, None]
    dzdy = np.gradient(dem_grid.astype("float64"), axis=0) / step_m
    dzdx = np.gradient(dem_grid.astype("float64"), axis=1) / dx
    slope = np.degrees(np.arctan(np.sqrt(dzdx**2 + dzdy**2)))

    slope_path = DATA_DIR / "mola_ap1_slope.tif"
    with rasterio.open(
        slope_path,
        "w",
        driver="GTiff",
        width=width,
        height=height,
        count=1,
        dtype="float32",
        crs=dst_crs,
        transform=dst_transform,
        nodata=-9999,
        compress="deflate",
    ) as dst:
        dst.write(slope.astype("float32"), 1)
        dst.update_tags(units="degrees", source="MOLA DEM 463m, gradient at 0.05 deg")
    print(
        f"OK {dem_path.name}: {dem_path.stat().st_size} bytes | "
        f"{slope_path.name}: {slope_path.stat().st_size} bytes | "
        f"slope {slope.min():.2f}-{slope.max():.2f} deg"
    )


if __name__ == "__main__":
    write_weh()
    write_dem_and_slope()
