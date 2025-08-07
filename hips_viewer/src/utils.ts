import {
  cellColumns,
  cells,
  selectedCellIds,
  map,
  maxZoom,
  annotationMode,
  filterVectorIndices,
  filterOptions,
  currentFilters,
  attributeOptions,
} from './store'
import type { Cell, FilterOption } from './types'

export interface RGB { r: number, g: number, b: number }

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    }
  }
  return null
}

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function rgbToHex(color: RGB) {
  let { r, g, b } = color
  r *= 255
  g *= 255
  b *= 255
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

// from https://stackoverflow.com/questions/66123016/interpolate-between-two-colours-based-on-a-percentage-value
export function colorInterpolate(rgbA: RGB, rgbB: RGB, proportion: number) {
  return {
    r: rgbA.r * (1 - proportion) + rgbB.r * proportion,
    g: rgbA.g * (1 - proportion) + rgbB.g * proportion,
    b: rgbA.b * (1 - proportion) + rgbB.b * proportion,
  }
}

export function clusterFirstPoint(data: any, current: any, i: number) {
  if (current.__cluster) {
    current = current.obj
  }
  if (current._points === undefined) return current
  if (current._points.length) {
    return data[current._points[0].index]
  }
  return clusterFirstPoint(data, current._clusters[0], i)
}

export function clusterAllPoints(data: any, current: any, i: number, allPoints: any[]) {
  if (current.__cluster) {
    current = current.obj
  }
  if (current._points === undefined) return [...allPoints, current]
  if (current._points.length) {
    const indexes = current._points.map((p: { index: number }) => p.index)
    const points = indexes.map((i: number) => data[i])
    allPoints = [...allPoints, ...points]
  }
  current._clusters.forEach((cluster: any) => {
    allPoints = clusterAllPoints(data, cluster, i, allPoints)
  })
  return allPoints
}

export function getCellAttribute(cell: Cell, attrName: string) {
  if (cell[attrName]) return cell[attrName]
  else if (cellColumns.value && cell.vector_text) {
    const index = cellColumns.value.indexOf(attrName)
    const vector = cell.vector_text.split(',')
    if (index >= 0 && vector && vector[index]) {
      const value = vector[index]
      if (!isNaN(parseFloat(value))) return parseFloat(value)
      return value
    }
  }
  return undefined
}

export function selectCell(event: any, cellId: number | undefined) {
  if (annotationMode.value === 'polygon') return
  // create local copy without proxy for set operations
  let currentIds = new Set(selectedCellIds.value)
  const shift = event.shiftKey != undefined ? event.shiftKey : event.sourceEvent.modifiers.shift
  const ctrl = event.ctrlKey != undefined ? event.ctrlKey : event.sourceEvent.modifiers.ctrl
  const toggleMode = shift || ctrl
  if (!cellId) {
    if (event.data.id) {
      return selectCell(event, event.data.id)
    }
    else if (event.data.__cluster) {
      const clusterPoints = clusterAllPoints(cells.value, event.data, event.index, [])
      const clusterPointIds = new Set(clusterPoints.map(cell => cell.id))
      if (toggleMode) {
        if (currentIds.intersection(clusterPointIds).size === clusterPointIds.size) {
          currentIds = currentIds.difference(clusterPointIds)
        }
        else {
          currentIds = currentIds.union(clusterPointIds)
        }
      }
      else {
        currentIds = clusterPointIds
      }
    }
  }
  else {
    if (toggleMode) {
      if (currentIds.has(cellId)) {
        currentIds.delete(cellId)
      }
      else {
        currentIds.add(cellId)
      }
    }
    else {
      currentIds = new Set([cellId])
    }
  }
  selectedCellIds.value = currentIds
}

const dblClickLength = 300
let clickCount = 0
let clickTimer: any = undefined
export function clickCellThumbnail(event: any, cellId: number | undefined) {
  clickCount += 1
  selectCell(event, cellId)
  if (clickCount === 2) {
    if (clickTimer) clearTimeout(clickTimer)
    clickCount = 0
    const cell = cells.value?.find((cell: Cell) => cell.id === cellId)
    if (cell && map.value && maxZoom.value) {
      map.value.center({ x: cell.x, y: cell.y })
      map.value.zoom(maxZoom.value)
    }
  }
  else {
    clickTimer = setTimeout(() => {
      clickCount = 0
    }, dblClickLength)
  }
}

export function resetFilterVectorIndices() {
  filterVectorIndices.value = {
    area: attributeOptions.value.indexOf('Size.Area'),
    orientation: attributeOptions.value.indexOf('Orientation.Orientation'),
    circularity: attributeOptions.value.indexOf('Shape.Circularity'),
    eccentricity: attributeOptions.value.indexOf('Shape.Eccentricity'),
    axisRatio: attributeOptions.value.indexOf('Shape.MinorMajorAxisRatio'),
  }
}

export function resetFilterOptions() {
  const classifications: Set<string> = new Set()
  const vectorRanges = {
    classification: { min: undefined, max: undefined },
    area: { min: undefined, max: undefined },
    orientation: { min: undefined, max: undefined },
    circularity: { min: undefined, max: undefined },
    eccentricity: { min: undefined, max: undefined },
    axisRatio: { min: undefined, max: undefined },
  }
  cells.value.forEach((cell: Cell) => {
    classifications.add(cell.classification)
    if (cell.vector_text) {
      const vector = cell.vector_text.split(',')
      Object.entries(filterVectorIndices.value).forEach(([key, index]) => {
        let value: number = parseFloat(vector[index])
        value = parseFloat(value.toPrecision(2))
        // @ts-ignore
        const range = vectorRanges[key]
        if (!range.min || range.min > value) range.min = value
        if (!range.max || range.max < value) range.max = value
      })
    }
  })
  filterOptions.value = [
    { label: 'classification', options: [...classifications] },
    { label: 'area', range: vectorRanges.area },
    { label: 'orientation', range: vectorRanges.orientation },
    { label: 'circularity', range: vectorRanges.circularity },
    { label: 'eccentricity', range: vectorRanges.eccentricity },
    { label: 'axis_ratio', range: vectorRanges.axisRatio },
  ]
}

export function resetCurrentFilters() {
  currentFilters.value = {}
  if (filterOptions.value) {
    filterOptions.value.forEach((filter: FilterOption) => {
      if (filter.range?.min && filter.range?.max) {
        currentFilters.value[filter.label] = [filter.range.min, filter.range.max]
      }
      else if (filter.options) {
        currentFilters.value[filter.label] = []
      }
    })
  }
}
