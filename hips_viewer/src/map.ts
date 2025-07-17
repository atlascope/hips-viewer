import geo from 'geojs';

import {
    map, maxZoom, cellFeature, pointFeature
} from '@/store'


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
