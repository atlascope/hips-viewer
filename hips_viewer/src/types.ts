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
  scatterplot_data: number[][]
}
