import geo from 'geojs';


export async function createMap(mapId: string, tileUrl: string) {
    const tileInfo = await (await fetch(tileUrl)).json()
    const maxZoom = tileInfo.levels - 1;
    let params = geo.util.pixelCoordinateParams(
        '#' + mapId, tileInfo.sizeX, tileInfo.sizeY, tileInfo.tileWidth, tileInfo.tileHeight
    );
    const map = geo.map(params.map);
    map.maxZoom = maxZoom;
    params.layer.url = `${tileUrl}/zxy/{z}/{x}/{y}`;
    map.createLayer('osm', params.layer);
    const ui = map.createLayer('ui');
    ui.createWidget('slider', {position: {right: 40, top: 40}});
    map.draw()
    return map;
}

export function createFeatures(map: any, color: string) {
    const cellLayer = map.createLayer('feature', {
        features: ['marker']
    });
    const cellFeature = cellLayer.createFeature('marker').style({
        radius: (item: any) => item.width / (2 ** (map.maxZoom + 1)),
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
    cellFeature.visible(false)

    const pointFeature = cellLayer.createFeature('point', {
        style: {
            strokeWidth: 0,
            fillColor: color,
        }
    });
    pointFeature.clustering({radius: 10})
    return { cellFeature, pointFeature }
}

export function addZoomCallback(map: any, callback: Function) {
    map.geoOn(geo.event.zoom, callback)
}

export function addHoverCallback(feature: any, callback: Function) {
    feature.geoOn(geo.event.feature.mouseover, callback)
}
