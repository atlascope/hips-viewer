import geo from 'geojs'
import colorbrewer from 'colorbrewer'

import {
  cells, map, maxZoom, cellFeature, pointFeature,
  colorBy, colormapName, colorLegend, cellColors,
  selectedCellIds, selectedColor, annotationLayer,
  annotationMode, annotationBoolean, lastAnnotation,
  filterMatchCellIds,
} from '@/store'
import {
  selectCell,
  clusterFirstPoint, numericColormap,
  getCellAttribute, hexToRgb,
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
  let foundCells = cellFeature.value.polygonSearch({ outer: polygon }).found
  if (filterMatchCellIds.value.size) {
    foundCells = foundCells.filter((cell: Cell) => filterMatchCellIds.value.has(cell.id))
  }
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
    updateColorFunctions()
  }
}

export function updateColorFunctions() {
  if (cellFeature.value && pointFeature.value) {
    const styleCellFunction = (cell: any, i: number) => {
      if (cell.__cluster) {
        cell = clusterFirstPoint(cells.value, cell, i)
      }
      if (!cell) return 'transparent'
      if (selectedCellIds.value.has(cell.id)) return selectedColor.value
      return cellColors.value[cell.id]
    }
    cellFeature.value.style('strokeColor', styleCellFunction)
    pointFeature.value.style('fillColor', styleCellFunction)
    if (cellFeature.value.visible()) cellFeature.value.draw()
    if (pointFeature.value.visible()) pointFeature.value.draw()
  }
}

export function updateOpacityFunctions() {
  if (cellFeature.value && pointFeature.value) {
    const opacityFunction = (cell: any, i: number) => {
      if (cell.__cluster) {
        cell = clusterFirstPoint(cells.value, cell, i)
      }
      if (!cell) return 0
      if (filterMatchCellIds.value.size && !filterMatchCellIds.value.has(cell.id)) {
        return 0
      }
      return 1
    }
    cellFeature.value.style('strokeOpacity', opacityFunction)
    pointFeature.value.style('fillOpacity', opacityFunction)
    if (cellFeature.value.visible()) cellFeature.value.draw()
    if (pointFeature.value.visible()) pointFeature.value.draw()
  }
}
