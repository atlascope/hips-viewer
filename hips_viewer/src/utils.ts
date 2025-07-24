import { cellColumns, cells, selectedCellIds } from "./store";
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

export function clickCell(event: any, cellId: number | undefined) {
	const toggleMode = event.ctrlKey != undefined ? event.ctrlKey : event.sourceEvent.modifiers.ctrl;
	if (!cellId) {
		if (event.data.__cluster) {
			const allPoints = clusterAllPoints(cells.value, event.data, event.index, [])
			allPoints.forEach((cell: { id: number }) => clickCell(
				{ ctrlKey: toggleMode }, cell.id
			))
		} else {
			cellId = cells.value[event.index]?.id
		}
	}
	if (cellId) {
		if (toggleMode) {
			if (selectedCellIds.value.includes(cellId)) {
				selectedCellIds.value = selectedCellIds.value.filter(
					(id) => id !== cellId
				);
			} else {
				selectedCellIds.value.push(cellId);
			}
		} else {
			selectedCellIds.value = [cellId];
		}
	}
}
