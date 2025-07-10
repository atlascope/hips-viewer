import axios from 'axios';


export const baseURL = 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL,
});

export async function fetchImages() {
  return (await apiClient.get('images')).data
}

export async function fetchImageCells(imageId: number) {
  return (await apiClient.get(`images/${imageId}/cells`)).data
}
