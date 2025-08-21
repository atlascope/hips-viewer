from django.core.management.base import BaseCommand
from tcga.umap import fit_and_create_transform
from tcga.models import UMAPTransform, UMAPResult

# Example Usage
# python manage.py list_transforms

class Command(BaseCommand):
    requires_migrations_checks = True

    def handle(self, *args, **kwargs):
        transforms = UMAPTransform.objects.all()
        if not len(transforms):
            print('No UMAPTransform objects exist.')
        for transform in transforms:
            print(transform.name)
            print('\t', 'ID:', transform.id)
            print('\t', 'Created', transform.created)
            print('\t', UMAPResult.objects.filter(transform=transform).count(), 'results')
            print('\t', transform.fitted_cells.count(), 'fitted cells')
            print('\t', len(transform.column_names), 'included columns')
