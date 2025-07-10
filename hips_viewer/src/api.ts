import axios from 'axios';
import type { Cell } from './types';


export const baseURL = 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL,
});

export async function fetchImages() {
  return (await apiClient.get('images')).data
}

export async function fetchImageCells(imageId: number) {
  const limit = 100000;
  let results: Cell[] = [];
  let total: number | undefined = undefined;
  while (!total || results.length < total) {
    const response: {items: Cell[], count: number} = (
      await apiClient.get(`images/${imageId}/cells?offset=${results.length}&limit=${limit}`)
    ).data
    if (!total) total = response.count
    results = [...results, ...response.items]
  }
  return results
}
