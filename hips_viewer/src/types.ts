export interface Image {
    id: number;
    name: string,
    tile_url: string,
}

export interface Cell  {
    x: number;
    y: number;
    width: number;
    height: number;
    orientation: number;
}

export interface Thumbnail {
    src: string;
    width: number;
    height: number;
}
