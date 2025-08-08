import geo from 'geojs'
import colorbrewer from 'colorbrewer'

import {
  cells, map, maxZoom, cellFeature, pointFeature,
  colorBy, colormapName, colorLegend, cellColors,
  histNumBuckets, showHistogram, histCellIds,
  selectedCellIds, selectedColor, annotationLayer,
  annotationMode, annotationBoolean, lastAnnotation,
  filterMatchCellIds,
} from '@/store'
import {
  selectCell,
  clusterFirstPoint, colorInterpolate,
  getCellAttribute, hexToRgb, rgbToHex,
} from './utils'
import type { Cell } from './types'

export async function createMap(mapId: string, tileUrl: string) {
  const tileInfo = await (await fetch(tileUrl)).json()
  maxZoom.value = tileInfo.levels - 1
  const params = geo.util.pixelCoordinateParams(
    '#' + mapId, tileInfo.sizeX, tileInfo.sizeY, tileInfo.tileWidth, tileInfo.tileHeight,
  )
  map.value = geo.map(params.map)
  params.layer.url = `${tileUrl}/zxy/{z}/{x}/{y}`
  map.value.createLayer('osm', params.layer)
  const ui = map.value.createLayer('ui')
  ui.createWidget('slider', { position: { right: 40, top: 40 } })
  colorLegend.value = ui.createWidget('colorLegend', {
    position: { bottom: 10, left: 10, right: 10 },
    ticks: 10,
    width: '1000',
  })
  annotationLayer.value = map.value.createLayer('annotation', {
    showLabels: false,
    clickToEdit: false,
  })
  annotationLayer.value.geoOn(
    geo.event.annotation.mode, (e: any) => {
      const mode = e.mode
      setTimeout(() => {
        annotationMode.value = mode
      }, 0)
      if (!mode) annotationLayer.value.removeAllAnnotations()
    },
  )
  annotationLayer.value.geoOn(
    geo.event.annotation.remove, (event: any) => {
      annotationBoolean.value = annotationLayer.value.currentBooleanOperation()
      const annotation = event.annotation.coordinates()
      // ensure that each annotation is only used once; union fires two remove events
      if (JSON.stringify(lastAnnotation.value) !== JSON.stringify(annotation)) {
        lassoSelect(annotation)
        lastAnnotation.value = annotation
      }
    },
  )
  map.value.draw()
}

export function createFeatures(color: string, zoomThreshold: number) {
  const cellLayer = map.value.createLayer('feature', {
    features: ['marker'],
  })
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
    if (cellFeature.value.visible()) selectCell(e, e.data.id)
  })

  pointFeature.value = cellLayer.createFeature('point', {
    style: {
      strokeWidth: 0,
      fillColor: color,
    },
  })
  pointFeature.value.clustering({ radius: 10, maxZoom: zoomThreshold })
  pointFeature.value.geoOn(geo.event.feature.mouseclick, (e: any) => {
    if (pointFeature.value.visible()) selectCell(e, undefined)
  })
}

export function addZoomCallback(callback: Function) {
  map.value.geoOn(geo.event.zoom, callback)
}

export function addHoverCallback(callback: Function, feature: any) {
  feature.geoOn(geo.event.feature.mouseover, callback)
}

export function lassoSelect(polygon: { x: number, y: number }[]) {
  const foundCells = cellFeature.value.polygonSearch({ outer: polygon }).found
  // create local copy without proxy for set operations
  let currentIds: Set<number> = new Set(selectedCellIds.value)
  const targetIds: Set<number> = new Set(foundCells.map((cell: Cell) => cell.id))
  if (annotationBoolean.value === 'union') {
    currentIds = currentIds.union(targetIds)
  }
  else if (annotationBoolean.value === 'difference') {
    currentIds = currentIds.difference(targetIds)
  }
  else {
    currentIds = targetIds
  }
  selectedCellIds.value = currentIds
}

function numericColormap(valMin: number, valMax: number, rgbColors: { r: number, g: number, b: number }[]) {
  const colormapFunction = (v: any) => {
    const valueProportion = (v - valMin) / (valMax - valMin)
    const maxIndex = rgbColors.length - 1
    if (valueProportion === 0) return rgbColors[0]
    if (valueProportion === 1) return rgbColors[maxIndex]
    const index = Math.floor(maxIndex * valueProportion)
    const indexProportion = index / maxIndex
    const interpolationProportion = (valueProportion - indexProportion) * maxIndex
    const interpolated = colorInterpolate(rgbColors[index], rgbColors[index + 1], interpolationProportion)
    return interpolated
  }
  return colormapFunction
}

export function updateColors() {
  if (!(colormapName.value && colorBy.value && cells.value && colorLegend.value)) {
    colorLegend.value.categories([])
    return
  }

  const values = [...new Set(cells.value.map(
    (cell: any) => getCellAttribute(cell, colorBy.value),
  ).map(
    (v: any) => isNaN(parseFloat(v)) ? v : parseFloat(v),
  ).filter((v: any) => v !== undefined))]
  // @ts-ignore
  const colormapSets = colorbrewer[colormapName.value]
  let colors = colormapSets[values.length]
  if (!colors) colors = colormapSets[Math.max(...Object.keys(colormapSets).map(v => parseInt(v)))]
  const rgbColors = colors.map(hexToRgb)

  let colormapFunction
  if (values.every(v => typeof v === 'number')) {
    const range = [Math.min(...values), Math.max(...values)]
    colorLegend.value.categories([{
      name: colorBy.value,
      type: 'continuous',
      scale: 'linear',
      domain: range,
      colors,
    }])
    colormapFunction = numericColormap(range[0], range[1], rgbColors)
  }
  else {
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
    cellFeature.value.style('strokeColor', styleCellFunction)
    pointFeature.value.style('fillColor', styleCellFunction)
    if (cellFeature.value.visible()) {
      cellFeature.value.draw()
    }
    if (pointFeature.value.visible()) {
      pointFeature.value.draw()
    }
  }
}

export function updateOpacities() {
  if (pointFeature.value && cellFeature.value) {
    const opacityFunction = (cell: any, i: number) => {
      if (cell.__cluster) {
        cell = clusterFirstPoint(cells.value, cell, i)
      }
      if (filterMatchCellIds.value.size && !filterMatchCellIds.value.has(cell.id)) {
        return 0
      }
      return 1
    }
    cellFeature.value.style('strokeOpacity', opacityFunction)
    pointFeature.value.style('fillOpacity', opacityFunction)
    if (cellFeature.value.visible()) {
      cellFeature.value.draw()
    }
    if (pointFeature.value.visible()) {
      pointFeature.value.draw()
    }
  }
}

export function cellDistribution() {
  if (!(colormapName.value && cells.value && histCellIds.value)) return []
  const histCells = cells.value.filter((cell: any) => histCellIds.value.has(cell.id))

  const values = [...new Set(cells.value.map(
    (cell: any) => getCellAttribute(cell, colorBy.value),
  ).map(
    (v: any) => isNaN(parseFloat(v)) ? v : parseFloat(v),
  ).filter((v: any) => v !== undefined)),
  ].filter((v: any) => typeof v === 'number' || typeof v === 'string')

  const cellIds: Record<string | number, Set<number>> = {}
  const counts: Record<string | number, number> = {}
  histCells.forEach((cell: any) => {
    const key = getCellAttribute(cell, colorBy.value)
    if (key !== undefined) {
      counts[key] = (counts[key] ?? 0) + 1

      if (!cellIds[key]) cellIds[key] = new Set<number>()
      cellIds[key].add(cell.id)
    }
  })

  // @ts-ignore
  const colormapSets = colorbrewer[colormapName.value]

  showHistogram.value = values.length > histNumBuckets.value

  if (values.length < histNumBuckets.value || !values.every(v => typeof v === 'number')) {
    let colors = colormapSets[values.length]
    if (!colors) colors = colormapSets[Math.max(...Object.keys(colormapSets).map(v => parseInt(v)))]
    return values.map((v, i) => ({ key: `${v}`, count: counts[v] ?? 0, cellIds: cellIds[v], color: colors[i] }))
  }

  const vmin = Math.min(...values)
  const vmax = Math.max(...values)
  const step = (vmax - vmin) / histNumBuckets.value

  const bucketedCellIds: Record<string | number, Set<number>> = {}
  const bucketedCounts: Record<string, number> = {}
  const bucketedMin: Record<string, number> = {}
  values.sort((a, b) => a - b).forEach((value) => {
    const bucketIndex = Math.floor((value - vmin) / step)
    const bucketKey = `${bucketIndex * step}`
    bucketedCounts[bucketKey] = (bucketedCounts[bucketKey] ?? 0) + (counts[value] ?? 0)
    bucketedMin[bucketKey] = Math.min(bucketedMin[bucketKey] ?? vmax, value)

    if (!bucketedCellIds[bucketKey]) bucketedCellIds[bucketKey] = new Set<number>()
    cellIds[value]?.forEach(id => bucketedCellIds[bucketKey].add(id))
  })

  let colors = colormapSets[Object.keys(bucketedCounts).length]
  if (!colors) colors = colormapSets[Math.max(...Object.keys(colormapSets).map(v => parseInt(v)))]
  const rgbColors = colors.map(hexToRgb)

  const colormapFunction = numericColormap(vmin, vmax, rgbColors)

  return Object.keys(bucketedCounts).sort((a, b) => (parseFloat(a) - parseFloat(b))).map(v => ({
    key: `${bucketedMin[v].toFixed(2)}`,
    count: bucketedCounts[v],
    cellIds: bucketedCellIds[v],
    color: rgbToHex(colormapFunction(bucketedMin[v])),
  }))
}
