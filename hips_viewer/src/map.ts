import geo from 'geojs';
import colorbrewer from 'colorbrewer';

import {
    cells, map, maxZoom, cellFeature, pointFeature,
    colorBy, colormapName, colorLegend, cellColors,
    selectedCellIds, selectedColor,
} from '@/store'
import {
    selectCell,
    clusterFirstPoint, colorInterpolate,
    getCellAttribute, hexToRgb
} from './utils';
import type { Cell } from './types';


export async function createMap(mapId: string, tileUrl: string) {
    const tileInfo = await (await fetch(tileUrl)).json()
    maxZoom.value = tileInfo.levels - 1;
    let params = geo.util.pixelCoordinateParams(
        '#' + mapId, tileInfo.sizeX, tileInfo.sizeY, tileInfo.tileWidth, tileInfo.tileHeight
    );
    map.value = geo.map(params.map);
    params.layer.url = `${tileUrl}/zxy/{z}/{x}/{y}`;
    map.value.createLayer('osm', params.layer);
    const ui = map.value.createLayer('ui');
    ui.createWidget('slider', { position: { right: 40, top: 40 } });
    colorLegend.value = ui.createWidget('colorLegend', {
        position: { bottom: 10, left: 10, right: 10 },
        ticks: 10,
        width: '1000'
    })
    map.value.draw()
}

export function createFeatures(color: string, zoomThreshold: number) {
    const cellLayer = map.value.createLayer('feature', {
        features: ['marker']
    });
    cellFeature.value = cellLayer.createFeature('marker').style({
        radius: (item: any) => item.width / (2 ** (maxZoom.value + 1)),
        rotation: (item: any) => item.width > item.height ? item.orientation : item.orientation + Math.PI / 2,
        symbolValue: (item: any) => Math.min(item.width, item.height) / Math.max(item.width, item.height),
        symbol: geo.markerFeature.symbols.ellipse,
        scaleWithZoom: geo.markerFeature.scaleMode.fill,
        rotateWithMap: true,
        strokeColor: color,
        strokeWidth: 2,
        strokeOffset: 1,
        strokeOpacity: 1,
        fillOpacity: 0,
    })
    cellFeature.value.visible(false)
    cellFeature.value.geoOn(geo.event.feature.mouseclick, (e: any) => {
        selectCell(e, e.data.id)
    })

    pointFeature.value = cellLayer.createFeature('point', {
        style: {
            strokeWidth: 0,
            fillColor: color,
        }
    });
    pointFeature.value.clustering({ radius: 10, maxZoom: zoomThreshold })
    pointFeature.value.geoOn(geo.event.feature.mouseclick, selectCell)
}

export function addZoomCallback(callback: Function) {
    map.value.geoOn(geo.event.zoom, callback)
}

export function addHoverCallback(callback: Function, feature: any) {
    feature.geoOn(geo.event.feature.mouseover, callback)
}

export function updateColors() {
    if (!(colormapName.value && colorBy.value && cells.value && colorLegend.value)) {
        colorLegend.value.categories([])
        return
    }

    const values = [...new Set(cells.value.map(
        (cell: any) => getCellAttribute(cell, colorBy.value)
    ).map(
        (v: any) => isNaN(parseFloat(v)) ? v : parseFloat(v)
    ).filter((v: any) => v !== undefined))];
    // @ts-ignore
    const colormapSets = colorbrewer[colormapName.value]
    let colors = colormapSets[values.length];
    if (!colors) colors = colormapSets[Math.max(...Object.keys(colormapSets).map((v) => parseInt(v)))]
    const rgbColors = colors.map(hexToRgb)

    let colormapFunction;
    if (values.every((v) => typeof v === 'number')) {
        const range = [Math.min(...values), Math.max(...values)]
        colorLegend.value.categories([{
            name: colorBy.value,
            type: 'continuous',
            scale: 'linear',
            domain: range,
            colors,
        }])
        colormapFunction = (v: any) => {
            const valueProportion = (v - range[0]) / (range[1] - range[0])
            const maxIndex = rgbColors.length - 1
            if (valueProportion === 0) return rgbColors[0]
            if (valueProportion === 1) return rgbColors[maxIndex]
            const index = Math.floor(maxIndex * valueProportion)
            const indexProportion = index / maxIndex
            const interpolationProportion = (valueProportion - indexProportion) * maxIndex
            const interpolated = colorInterpolate(rgbColors[index], rgbColors[index + 1], interpolationProportion)
            return interpolated
        }
    } else {
        colorLegend.value.categories([{
            name: colorBy.value,
            type: 'discrete',
            scale: 'ordinal',
            domain: values,
            colors,
        }])
        colormapFunction = (v: any) => {
            const index = values.indexOf(v)
            if (index >= 0) {
                const proportion = values.indexOf(v) / values.length
                return rgbColors[Math.round(rgbColors.length * proportion)]
            }

            return { r: 0, g: 0, b: 0 }
        }
    }
    colorLegend.value.width(colorLegend.value.canvas().clientWidth - 20)

    if (colormapFunction) {
        const getCellColor = (cell: any) => {
            const value = getCellAttribute(cell, colorBy.value)
            if (value === undefined) return { r: 0, g: 0, b: 0 }
            return colormapFunction(value)
        }
        cellColors.value = Object.fromEntries(cells.value.map((cell: Cell) => [cell.id, getCellColor(cell)]))
        const styleCellFunction = (cell: any, i: number) => {
            if (cell.__cluster) {
                cell = clusterFirstPoint(cells.value, cell, i)
            }
            if (selectedCellIds.value.has(cell.id)) {
                return selectedColor.value
            }
            return cellColors.value[cell.id]
        }
        cellFeature.value.style('strokeColor', styleCellFunction).draw()
        pointFeature.value.style('fillColor', styleCellFunction).draw()
    }
}
