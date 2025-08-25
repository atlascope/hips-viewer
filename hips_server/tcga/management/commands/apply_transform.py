from django.core.management.base import BaseCommand
from tcga.umap import create_transform_result

# Example Usage
# python manage.py apply_transform 1
# --cases TCGA-3C-AALI-01Z-00-DX1
# --classes CancerEpithelium TILsCell ActiveTILsCell
# --sample_size 500

class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument('transform_id', type=int)
        parser.add_argument('--cases', nargs='*', type=str)
        parser.add_argument('--classes', nargs='*', type=str)
        parser.add_argument('--sample_size', type=int)

    def handle(self, *args, **kwargs):
        create_transform_result(**kwargs)
