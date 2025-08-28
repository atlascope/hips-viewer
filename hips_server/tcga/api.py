import json

from ninja import NinjaAPI, ModelSchema
from ninja.pagination import paginate
from typing import List
from .models import Image, Cell, UMAPTransform, UMAPResult

from tcga.constants import VECTOR_COLUMNS


api = NinjaAPI()


class ImageSchema(ModelSchema):
    class Config:
        model = Image
        model_fields = ['id', 'name', 'tile_url']


class CellSchema(ModelSchema):
    class Config:
        model = Cell
        model_fields = ['id', 'x', 'y', 'width', 'height', 'orientation', 'classification', 'vector']


class UMAPTransformSchema(ModelSchema):
    class Config:
        model = UMAPTransform
        model_fields = ['id', 'name', 'created', 'column_names', 'umap_kwargs']


class UMAPResultSchema(ModelSchema):
    class Config:
        model = UMAPResult
        model_fields = ['id', 'created', 'transform', 'scatterplot_data']

    @staticmethod
    def resolve_scatterplot_data(obj):
        return json.loads(obj.scatterplot_data)


@api.get('/images', response=List[ImageSchema])
def images(request):
    return Image.objects.all()


@api.get('/images/{image_id}/cells', response=List[CellSchema])
@paginate()
def cells(request, image_id):
    return Cell.objects.filter(image__id=image_id)


@api.get('/cells/columns')
def cell_columns(request):
    return VECTOR_COLUMNS


@api.get('/umap/transforms', response=List[UMAPTransformSchema])
def transforms(request):
    return UMAPTransform.objects.all()


@api.get('/umap/transforms/{transform_id}/fitted', response=List[int])
@paginate()
def transform_fitted(request, transform_id):
    return [cell.id for cell in UMAPTransform.objects.get(id=transform_id).fitted_cells.all()]


@api.get('/umap/transforms/{transform_id}/results', response=List[UMAPResultSchema])
def transform_results(request, transform_id):
    return UMAPResult.objects.filter(transform__id=transform_id)


@api.get('/umap/results/{result_id}/transformed', response=List[int])
@paginate()
def result_transformed(request, result_id):
    return [cell.id for cell in UMAPResult.objects.get(id=result_id).transformed_cells.all()]
