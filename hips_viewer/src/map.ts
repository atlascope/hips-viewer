import geo from 'geojs'

import {
  cells, map, maxZoom, cellFeature, pointFeature,
  colorBy, colormapName, colorLegend, cellColors,
  selectedCellIds, selectedColor, annotationLayer,
  annotationMode, annotationBoolean, lastAnnotation,
  filterMatchCellIds,
} from '@/store'
import {
  selectCell, clusterFirstPointId,
} from './utils'
import type { Cell } from './types'
import { colormaps } from './colors'

export async function createMap(mapId: string, tileUrl: string) {
  const tileInfo = await (await fetch(tileUrl)).json()
  maxZoom.value = tileInfo.levels - 1
  const params = geo.util.pixelCoordinateParams(
    '#' + mapId, tileInfo.sizeX, tileInfo.sizeY, tileInfo.tileWidth, tileInfo.tileHeight,
  )
  map.value = geo.map(params.map)
  map.value.autoResize(true)
  map.value.geoOn('geo_resize', () => {
    if (colorLegend.value) {
      colorLegend.value.width(colorLegend.value.canvas().clientWidth - 20)
    }
  })
  params.layer.url = `${tileUrl}/zxy/{z}/{x}/{y}`
  map.value.createLayer('osm', params.layer)
  const ui = map.value.createLayer('ui')
  ui.createWidget('slider', { position: { right: 40, top: 40 } })
  colorLegend.value = ui.createWidget('colorLegend', {
    position: { bottom: 50, left: 10, right: 10 },
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
  const colormap = colormaps.find(cmap => cmap.name === colormapName.value)
  if (!(colormap && colorBy.value && cells.value && colorLegend.value)) {
    colorLegend.value.categories([])
    return
  }

  const values = [...new Set(cells.value.map(
    (cell: any) => cell[colorBy.value],
  ).map(
    (v: any) => isNaN(parseFloat(v)) ? v : parseFloat(v),
  ).filter((v: any) => v !== undefined))]

  let getCellColor
  const colors = colormap.colors
  if (values.every(v => typeof v === 'number')) {
    const domain: [number, number] = [Math.min(...values), Math.max(...values)]
    const colorFunction = colormap.getNumericColorFunction(domain)
    getCellColor = (cell: any) => {
      const value = cell[colorBy.value]
      if (value === undefined) return { r: 0, g: 0, b: 0 }
      return colorFunction(value as number)
    }
    colorLegend.value.categories([{
      name: colorBy.value,
      type: 'continuous',
      scale: 'linear',
      domain,
      colors,
    }])
  }
  else {
    const colorFunction = colormap.getStringColorFunction(values as string[])
    getCellColor = (cell: any) => {
      const value = cell[colorBy.value]
      if (value === undefined) return { r: 0, g: 0, b: 0 }
      return colorFunction(value as string)
    }
    colorLegend.value.categories([{
      name: colorBy.value,
      type: 'discrete',
      scale: 'ordinal',
      domain: values,
      colors,
    }])
  }
  colorLegend.value.width(colorLegend.value.canvas().clientWidth - 20)

  if (getCellColor) {
    cellColors.value = Object.fromEntries(cells.value.map((cell: Cell) => [cell.id, getCellColor(cell)]))
    updateColorFunctions()
  }
}

export function updateColorFunctions() {
  if (cellFeature.value && pointFeature.value) {
    const styleCellFunction = (cell: any, i: number) => {
      let cellId = cell.id
      if (cell.__cluster) {
        cellId = clusterFirstPointId(cells.value, cell, i)
      }
      if (!cellId) return 'transparent'
      if (selectedCellIds.value.has(cellId)) return selectedColor.value
      return cellColors.value[cellId]
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
      let cellId = cell.id
      if (cell.__cluster) {
        cellId = clusterFirstPointId(cells.value, cell, i)
      }
      if (!cellId) return 0
      if (filterMatchCellIds.value.size && !filterMatchCellIds.value.has(cellId)) {
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
