from ninja import NinjaAPI, Schema
from ninja.pagination import paginate
from typing import List
from .models import Image, Cell


api = NinjaAPI()


class ImageSchema(Schema):
    id: int
    name: str
    tile_url: str


class CellSchema(Schema):
    id: int
    x: float
    y: float
    width: float
    height: float
    orientation: float
    classification: str


@api.get("/images", response=List[ImageSchema])
def images(request):
    return Image.objects.all()


@api.get("/images/{image_id}/cells", response=List[CellSchema])
@paginate()
def cells(request, image_id):
    return Cell.objects.filter(image__id=image_id)
