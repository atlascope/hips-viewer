import colorbrewer from 'colorbrewer'

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
  filterMatchCellIds,
  clusterIds,
  histNumBuckets,
  histAttribute,
  showHistogram,
  histCellIds,
  histColormapName,
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

export function clusterAllPointIds(data: any, current: any, i: number, allPoints: number[]) {
  if (current.__cluster) {
    current = current.obj
  }
  const currentId = current._leaflet_id
  if (currentId && clusterIds.value[currentId]) {
    return clusterIds.value[currentId]
  }
  let currentPoints: number[] = []
  if (current._points === undefined) return [...allPoints, current.id]
  if (current._points.length) {
    const indexes = current._points.map((p: { index: number }) => p.index)
    currentPoints = indexes.map((index: number) => data[index].id)
  }
  current._clusters.forEach((cluster: any) => {
    currentPoints = clusterAllPointIds(data, cluster, i, currentPoints)
  })
  if (currentId) clusterIds.value[currentId] = currentPoints
  allPoints = [...allPoints, ...currentPoints]
  return allPoints
}

export function clusterFirstPointId(data: any, current: any, i: number) {
  // get all points in cluster
  let clusterPointIds = new Set(clusterAllPointIds(data, current, i, []))
  // exclude any cells that don't match filters
  if (filterMatchCellIds.value.size) {
    clusterPointIds = clusterPointIds.intersection(filterMatchCellIds.value)
  }
  // default to first cell
  let [cell] = clusterPointIds
  // if any selected, prioritize selected
  const selectedIds = clusterPointIds.intersection(selectedCellIds.value)
  if (selectedIds.size) {
    [cell] = selectedIds
  }
  return cell
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
      let clusterPointIds = new Set(clusterAllPointIds(cells.value, event.data, event.index, []))
      if (filterMatchCellIds.value.size) {
        clusterPointIds = clusterPointIds.intersection(filterMatchCellIds.value)
      }
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
    area: cellColumns.value.indexOf('Size.Area'),
    orientation: cellColumns.value.indexOf('Orientation.Orientation'),
    circularity: cellColumns.value.indexOf('Shape.Circularity'),
    eccentricity: cellColumns.value.indexOf('Shape.Eccentricity'),
    axis_ratio: cellColumns.value.indexOf('Shape.MinorMajorAxisRatio'),
  }
}

export function resetFilterOptions() {
  const classifications: Set<string> = new Set()
  const vectorRanges = {
    area: { min: undefined, max: undefined },
    orientation: { min: undefined, max: undefined },
    circularity: { min: undefined, max: undefined },
    eccentricity: { min: undefined, max: undefined },
    axis_ratio: { min: undefined, max: undefined },
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
        if (range.min === undefined || range.min > value) range.min = value
        if (range.max === undefined || range.max < value) range.max = value
      })
    }
  })
  filterOptions.value = [
    { label: 'classification', options: [...classifications] },
    { label: 'area', range: vectorRanges.area },
    { label: 'orientation', range: vectorRanges.orientation },
    { label: 'circularity', range: vectorRanges.circularity },
    { label: 'eccentricity', range: vectorRanges.eccentricity },
    { label: 'axis_ratio', range: vectorRanges.axis_ratio },
  ]
}

export function addFilterOption(attr: string) {
  const vectorIndex = cellColumns.value.indexOf(attr)
  const allValues = cells.value.map((cell: Cell) => {
    let cellValue = cell[attr]?.toString()
    if (cellValue === undefined && cell.vector_text) {
      const vector = cell.vector_text.split(',')
      cellValue = vector[vectorIndex]
    }
    if (cellValue && /^(-|\+|\.|e|\d)+$/.test(cellValue)) {
      return parseFloat(parseFloat(cellValue).toPrecision(2))
    }
    return cellValue
  })
  if (allValues.some((v: string | number) => typeof v === 'string')) {
    const valueSet = [...new Set(allValues)] as string[]
    filterOptions.value?.push({ label: attr, options: valueSet })
    currentFilters.value[attr] = []
  }
  else {
    const range = {
      min: parseFloat(Math.min(...allValues).toPrecision(2)),
      max: parseFloat(Math.max(...allValues).toPrecision(2)),
    }
    filterOptions.value?.push({ label: attr, range })
    currentFilters.value[attr] = [range.min, range.max]
  }
}

export function getFilterMatchIds(selectedOnly: boolean) {
  return cells.value.filter((cell: Cell) => {
    if (selectedOnly && !selectedCellIds.value.has(cell.id)) return false
    for (const key in currentFilters.value) {
      const filterValue = currentFilters.value[key]
      let vectorIndex = cellColumns.value.indexOf(key)
      if (vectorIndex < 0) vectorIndex = filterVectorIndices.value[key]
      let cellValue = cell[key]?.toString()
      if (cellValue === undefined && vectorIndex >= 0 && cell.vector_text) {
        const vector = cell.vector_text.split(',')
        cellValue = vector[vectorIndex]
      }
      if (cellValue && /^(-|\+|\.|e|\d)+$/.test(cellValue)) {
        const numericValue = parseFloat(parseFloat(cellValue).toPrecision(2))
        if (filterValue.length === 2) {
          const range = filterValue as [number, number]
          if (numericValue < range[0] || numericValue > range[1]) {
            return false
          }
        }
      }
      else if (cellValue && filterValue.length && !filterValue.includes(cellValue)) {
        return false
      }
    }
    return true
  }).map((cell: Cell) => cell.id)
}

export function resetCurrentFilters() {
  currentFilters.value = {}
  filterMatchCellIds.value = new Set()
  if (filterOptions.value) {
    filterOptions.value.forEach((filter: FilterOption) => {
      if (filter.range?.min !== undefined && filter.range?.max !== undefined) {
        currentFilters.value[filter.label] = [filter.range.min, filter.range.max]
      }
      else if (filter.options) {
        currentFilters.value[filter.label] = []
      }
    })
  }
}

export function numericColormap(valMin: number, valMax: number, rgbColors: { r: number, g: number, b: number }[]) {
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

export function cellDistribution() {
  if (!(cells.value && histCellIds.value)) return []
  const histCells = cells.value.filter((cell: any) => histCellIds.value.has(cell.id))

  const values = [...new Set(cells.value.map(
    (cell: any) => getCellAttribute(cell, histAttribute.value),
  ).map(
    (v: any) => isNaN(parseFloat(v)) ? v : parseFloat(v),
  ).filter((v: any) => v !== undefined)),
  ].filter((v: any) => typeof v === 'number' || typeof v === 'string')

  const cellIds: Record<string | number, Set<number>> = {}
  const counts: Record<string | number, number> = {}
  histCells.forEach((cell: any) => {
    const key = getCellAttribute(cell, histAttribute.value)
    if (key !== undefined) {
      counts[key] = (counts[key] ?? 0) + 1

      if (!cellIds[key]) cellIds[key] = new Set<number>()
      cellIds[key].add(cell.id)
    }
  })

  showHistogram.value = values.length > histNumBuckets.value

  if (values.length < histNumBuckets.value || !values.every(v => typeof v === 'number')) {
    return values.map((v, i) => ({
      key: `${v}`,
      count: counts[v] ?? 0,
      cellIds: cellIds[v],
      color: () => {
        // @ts-ignore
        const colormapSets = colorbrewer[histColormapName.value]
        let colors = colormapSets[values.length]
        if (!colors) colors = colormapSets[Math.max(...Object.keys(colormapSets).map(v => parseInt(v)))]

        return colors[i]
      },
    }))
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

  return Object.keys(bucketedCounts).sort((a, b) => (parseFloat(a) - parseFloat(b))).map(v => ({
    key: `${bucketedMin[v].toFixed(2)}`,
    count: bucketedCounts[v],
    cellIds: bucketedCellIds[v],
    color: () => {
      // @ts-ignore
      const colormapSets = colorbrewer[histColormapName.value]
      let colors = colormapSets[Object.keys(bucketedCounts).length]
      if (!colors) colors = colormapSets[Math.max(...Object.keys(colormapSets).map(v => parseInt(v)))]
      const rgbColors = colors.map(hexToRgb)

      const colormapFunction = numericColormap(vmin, vmax, rgbColors)
      return rgbToHex(colormapFunction(bucketedMin[v]))
    },
  }))
}
