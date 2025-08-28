export interface Image {
  id: number
  name: string
  tile_url: string
}

export interface Cell {
  id: number
  x: number
  y: number
  width: number
  height: number
  orientation: number
  classification: string
  vector?: string[]
  [vector_column: string]: string | number | undefined | (string | number)[]
}

export interface Thumbnail {
  id: number
  src: string
  width: number
  height: number
}

export interface TreeItem {
  title: string
  subtitle?: string
  disabled?: boolean
  value?: any
  children?: TreeItem[]
}

export interface FilterOption {
  label: string
  options?: string[]
  range?: {
    min: number | undefined
    max: number | undefined
  }
}

export interface RGB {
  r: number
  g: number
  b: number
}

export interface Colormap {
  name: string
  type: 'categorical' | 'sequential'
  colors: string[]
  getNumericColorFunction: (domain: [number, number]) => (value: number) => RGB
  getStringColorFunction: (domain: string[]) => (value: string) => RGB
}

export interface UMAPTransform {
  id: number
  name: string
  created: string
  column_names: string[]
  umap_kwargs: Record<string, any>
}

export interface UMAPResult {
  id: number
  created: string
  transform: number
  scatterplot_data: ScatterPoint[]
}

export interface ScatterPoint {
  id: number
  x: number
  y: number
}
