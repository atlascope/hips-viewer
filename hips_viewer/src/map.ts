import geo from 'geojs';
import colorbrewer from 'colorbrewer';

import {
    cells, map, maxZoom, cellFeature, pointFeature,
    colorBy, colormapName, colorLegend,
} from '@/store'
import { colorInterpolate, hexToRgb } from './utils';


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
    ui.createWidget('slider', {position: {right: 40, top: 40}});
    colorLegend.value = ui.createWidget('colorLegend', {
        position: {bottom: 10, left: 10, right: 10},
        ticks: 10,
        width: '1000'
    })
    map.value.draw()
}

export function createFeatures(color: string) {
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

    pointFeature.value = cellLayer.createFeature('point', {
        style: {
            strokeWidth: 0,
            fillColor: color,
        }
    });
    pointFeature.value.clustering({radius: 10})
}

export function addZoomCallback(callback: Function) {
    map.value.geoOn(geo.event.zoom, callback)
}

export function addHoverCallback(callback: Function, feature: any) {
    feature.geoOn(geo.event.feature.mouseover, callback)
}

export function updateColors() {
    if (colormapName.value && colorBy.value && cells.value && colorLegend.value) {
        // TODO: update this for other columns
        // This only works for columns saved as fields
        const values = [...new Set(cells.value.map((cell: any) => cell[colorBy.value]))]
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
            colormapFunction = (v: number) => {
                const valueProportion = (v - range[0]) / (range[1] - range[0])
                const maxIndex = rgbColors.length - 1
                if (valueProportion === 1) return rgbColors[maxIndex]
                const index = Math.floor(maxIndex * valueProportion)
                const indexProportion = index / maxIndex
                const interpolationProportion = (valueProportion - indexProportion) * maxIndex
                const interpolated = colorInterpolate(rgbColors[index], rgbColors[index+1], interpolationProportion)
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
                const proportion = values.indexOf(v) / values.length
                return rgbColors[Math.round(rgbColors.length * proportion)]
            }
        }
        colorLegend.value.width(colorLegend.value.canvas().clientWidth - 20)

        if (colormapFunction) {
            const cellColors = cells.value.map((cell: any) => {
                // TODO: if selected, return selectedColor
                return colormapFunction(cell[colorBy.value])
            })
            cellFeature.value.updateStyleFromArray({
                strokeColor: cellColors
            }, null, true)
            pointFeature.value.updateStyleFromArray({
                fillColor: cellColors
            }, null, true)
        }
    } else {
        colorLegend.value.categories([])
    }
}
