import json

from django.core.management.base import BaseCommand
from tcga.umap import fit_and_create_transform

# Example Usage
# python manage.py create_transform
# --name MyTransform --cases TCGA-3C-AALI-01Z-00-DX1
# --column_patterns Size.* Shape.* Nucleus.* Cytoplasm.*
# --classes CancerEpithelium TILsCell ActiveTILsCell
# --sample_size 500
# --umap_kwargs '{"n_neighbors": 16, "random_state": 1, "metric": "manhattan"}'

class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument('--name', type=str)
        parser.add_argument('--cases', nargs='*', type=str)
        parser.add_argument('--column_patterns', nargs='*', type=str)
        parser.add_argument('--classes', nargs='*', type=str)
        parser.add_argument('--sample_size', type=int)
        parser.add_argument('--umap_kwargs', type=json.loads)

    def handle(self, *args, **kwargs):
        fit_and_create_transform(**kwargs)
