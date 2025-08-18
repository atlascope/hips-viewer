// Import any schemes available at https://d3js.org/d3-scale-chromatic
import {
  schemeCategory10,
  schemeAccent,
  schemeDark2,
  schemeObservable10,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
  interpolateTurbo,
  interpolateViridis,
  interpolateMagma,
  interpolatePlasma,
  interpolateCividis,
  interpolateWarm,
  interpolateCool,
} from 'd3-scale-chromatic'
import type { Colormap } from './types'

const N_SAMPLES = 10

function createCategoricalColormap(name: string, scheme: readonly string[]): Colormap {
  return {
    name,
    type: 'categorical',
    colors: [...scheme],
    getStringColorFunction: (domain: string[]) => {
      return (value: string) => {
        const index = domain.indexOf(value)
        if (index >= 0) {
          return scheme[index % scheme.length]
        }
        return 'transparent'
      }
    },
    getNumericColorFunction: (domain: [number, number]) => {
      return (value: number) => {
        const proportion = (value - domain[0]) / (domain[1] - domain[0])
        return scheme[Math.round(scheme.length * proportion)]
      }
    },
  }
}

function createSequentialColormap(name: string, interpolate: (v: number) => string): Colormap {
  return {
    name,
    type: 'sequential',
    colors: [...Array(N_SAMPLES).keys()].map(i => interpolate(i / (N_SAMPLES - 1))),
    getStringColorFunction: (domain: string[]) => {
      return (value: string) => {
        const index = domain.indexOf(value)
        if (index >= 0) {
          const proportion = index / domain.length
          return interpolate(proportion)
        }
        return 'transparent'
      }
    },
    getNumericColorFunction: (domain: [number, number]) => {
      return (value: number) => {
        const proportion = (value - domain[0]) / (domain[1] - domain[0])
        return interpolate(proportion)
      }
    },
  }
}

export const colormaps: Colormap[] = [
  {
    name: 'Category10',
    scheme: schemeCategory10,
  }, {
    name: 'Accent',
    scheme: schemeAccent,
  }, {
    name: 'Dark2',
    scheme: schemeDark2,
  }, {
    name: 'Observable10',
    scheme: schemeObservable10,
  }, {
    name: 'Paired',
    scheme: schemePaired,
  }, {
    name: 'Pastel1',
    scheme: schemePastel1,
  }, {
    name: 'Pastel2',
    scheme: schemePastel2,
  }, {
    name: 'Set1',
    scheme: schemeSet1,
  }, {
    name: 'Set2',
    scheme: schemeSet2,
  }, {
    name: 'Set3',
    scheme: schemeSet3,
  }, {
    name: 'Tableau10',
    scheme: schemeTableau10,
  }, {
    name: 'Turbo',
    interpolate: interpolateTurbo,
  }, {
    name: 'Viridis',
    interpolate: interpolateViridis,
  }, {
    name: 'Magma',
    interpolate: interpolateMagma,
  }, {
    name: 'Plasma',
    interpolate: interpolatePlasma,
  }, {
    name: 'Cvidis',
    interpolate: interpolateCividis,
  }, {
    name: 'Warm',
    interpolate: interpolateWarm,
  }, {
    name: 'Cool',
    interpolate: interpolateCool,
  },
].map((cmap) => {
  if (cmap.scheme !== undefined) {
    return createCategoricalColormap(cmap.name, cmap.scheme)
  }
  if (cmap.interpolate !== undefined) {
    return createSequentialColormap(cmap.name, cmap.interpolate)
  }
}).filter(cmap => cmap !== undefined)
