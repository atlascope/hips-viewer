import type { Cell } from './types';


export const baseURL = 'http://localhost:8000/api';

export async function cachedFetch(url: string, cacheName: string) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(url);
  let data;
  if (cachedResponse) {
    data = await cachedResponse.json()
  } else {
    const response = await fetch(url)
    // Clone the response because a Response object can only be consumed once
    await cache.put(url, response.clone())
    data = await response.json()
  }
  return data
}

export async function fetchImages() {
  const url = `${baseURL}/images`
  return (await fetch(url)).json()
}

export async function fetchImageCells(imageId: number) {
  const limit = 100000;
  let results: Cell[] = [];
  let total: number | undefined = undefined;
  while (!total || results.length < total) {
    const url = `${baseURL}/images/${imageId}/cells?offset=${results.length}&limit=${limit}`
    const response: {items: Cell[], count: number} = await cachedFetch(url, 'cell-data-cache')
    if (!total) total = response.count
    results = [...results, ...response.items]
  }
  return results
}
