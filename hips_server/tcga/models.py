from django.db import models
from django.core.files.storage import FileSystemStorage

from .constants import DEFAULT_UMAP_KWARGS, VECTOR_COLUMNS, TRANSFORMS_FOLDER


transforms_fs = FileSystemStorage(location=TRANSFORMS_FOLDER)


def get_default_umap_kwargs():
    return DEFAULT_UMAP_KWARGS


def get_vector_columns():
    return VECTOR_COLUMNS


class Image(models.Model):
    name = models.CharField(max_length=255)
    tile_url = models.CharField(max_length=500)


class Cell(models.Model):
    image = models.ForeignKey(Image, on_delete=models.CASCADE)
    x = models.FloatField()
    y = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()
    orientation = models.FloatField()
    classification = models.CharField(max_length=255)

    # Simple text storage of vector; investigate alternatives
    vector = models.JSONField(default=list)


class UMAPTransform(models.Model):
    name = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    fitted_cells = models.ManyToManyField(Cell)
    column_names = models.JSONField(default=get_vector_columns)
    umap_kwargs = models.JSONField(default=get_default_umap_kwargs)
    pickled = models.FileField(storage=transforms_fs)


class UMAPResult(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    transform = models.ForeignKey(UMAPTransform, on_delete=models.CASCADE)
    transformed_cells = models.ManyToManyField(Cell)
    scatterplot_data = models.JSONField()
