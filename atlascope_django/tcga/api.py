from ninja import NinjaAPI
from .models import Image, Cell

api = NinjaAPI()


@api.get("/images")
def images(request):
    return [
        dict(id=image.id, name=image.name, tile_url=image.tile_url)
        for image in Image.objects.all()
    ]


@api.get("/images/{image_id}/cells")
def cells(request, image_id):
    return [
        dict(
            x=cell.x, y=cell.y,
            width=cell.width, height=cell.height,
            orientation=cell.orientation,
        )
        for cell in Cell.objects.filter(image__id=image_id)
    ]
