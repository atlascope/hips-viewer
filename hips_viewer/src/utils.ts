import { cellColumns, cells, selectedCellIds, map, maxZoom } from "./store";
import type { Cell } from "./types";

export interface RGB { r: number, g: number, b: number }

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex: string) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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
	r *= 255;
	g *= 255;
	b *= 255;
	return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// from https://stackoverflow.com/questions/66123016/interpolate-between-two-colours-based-on-a-percentage-value
export function colorInterpolate(rgbA: RGB, rgbB: RGB, proportion: number) {
	return {
		r: rgbA.r * (1 - proportion) + rgbB.r * proportion,
		g: rgbA.g * (1 - proportion) + rgbB.g * proportion,
		b: rgbA.b * (1 - proportion) + rgbB.b * proportion,
	}
}

export function clusterFirstPoint(data: any, d: any, i: number) {
	if (d.__cluster) {
		d = d.obj;
	}
	if (d._points === undefined) return d;
	if (d._points.length) {
		return data[d._points[0].index];
	}
	return clusterFirstPoint(data, d._clusters[0], i);
}

export function clusterAllPoints(data: any, d: any, i: number, allPoints: any[]) {
	if (d.__cluster) {
		d = d.obj;
	}
	if (d._points === undefined) return [...allPoints, d];
	if (d._points.length) {
		const indexes = d._points.map((p: { index: number }) => p.index)
		const points = indexes.map((i: number) => data[i])
		allPoints = [...allPoints, ...points];
	}
	d._clusters.forEach((cluster: any) => {
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
	// create local copy without proxy for set operations
	let currentIds = new Set(selectedCellIds.value)
	const toggleMode = event.ctrlKey != undefined ? event.ctrlKey : event.sourceEvent.modifiers.ctrl;
	if (!cellId) {
		if (event.data.__cluster) {
			const clusterPoints = clusterAllPoints(cells.value, event.data, event.index, [])
			const clusterPointIds = new Set(clusterPoints.map((cell) => cell.id))
			if (toggleMode) {
				if (currentIds.intersection(clusterPointIds).size === clusterPointIds.size) {
					currentIds = currentIds.difference(clusterPointIds)
				} else {
					currentIds = currentIds.union(clusterPointIds)
				}
			} else {
				currentIds = clusterPointIds
			}
		}
	} else {
		if (toggleMode) {
			if (currentIds.has(cellId)) currentIds.delete(cellId)
			else currentIds.add(cellId);
		} else {
			currentIds = new Set([cellId]);
		}
	}
	selectedCellIds.value = currentIds
}

const dblClickLength = 300;
let clickCount = 0;
let clickTimer: any = undefined;
export function clickCell(event: any, cellId: number | undefined) {
	clickCount += 1;
	selectCell(event, cellId)
	if (clickCount === 2) {
		if (clickTimer) clearTimeout(clickTimer)
		clickCount = 0
		const cell = cells.value?.find((cell: Cell) => cell.id === cellId)
		if (cell && map.value && maxZoom.value) {
			map.value.center({ x: cell.x, y: cell.y })
			map.value.zoom(maxZoom.value)
		}
	} else {
		clickTimer = setTimeout(() => {
			clickCount = 0
		}, dblClickLength)
	}
}
