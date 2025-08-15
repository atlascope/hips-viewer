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
  vector_text?: string
  [vector_column: string]: string | number | undefined
}

export interface Thumbnail {
  id: number
  src: string
  width: number
  height: number
}

export interface TreeItem {
  title: string
  value?: string
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

export interface Colormap {
  name: string
  type: 'categorical' | 'sequential'
  colors: string[]
  getNumericColorFunction: (domain: [number, number]) => (value: number) => string
  getStringColorFunction: (domain: string[]) => (value: string) => string
}
