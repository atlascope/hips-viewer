import math
import girder_client
from datetime import datetime

from django.core.management.base import BaseCommand
from tcga.models import Image, Cell
from tcga.read_vectors import get_case_vector
from tcga.constants import (
    SAMPLE_DATA_SERVER,
    SAMPLE_DATA_COLLECTION,
    DOWNLOADS_FOLDER,
    IMAGE_SUFFIXES,
    VECTOR_COLUMNS,
)

# Example Usage
# python manage.py populate --cases TCGA-3C-AALI-01Z-00-DX1 --no_cache

class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument('--no-cache', action='store_true')
        parser.add_argument('--cases', nargs='*', type=str)

    def handle(self, *args, **kwargs):
        no_cache = kwargs.get('no_cache')
        cases = kwargs.get('cases') or []
        print(f'Populating cases {cases}...')
        print('Note: Initial data downloads may take a while...')
        client = girder_client.GirderClient(apiUrl=SAMPLE_DATA_SERVER)
        for folder in client.listFolder(SAMPLE_DATA_COLLECTION):
            case_name = folder.get('name')
            if case_name in cases or (
                len(cases) == 0 and case_name != 'test'
            ):
                # Delete existing objects from database
                # (Image deletion cascades to related Cells)
                Image.objects.filter(name=case_name).delete()

                # Find image item
                folder_id = folder.get('_id')
                image_matches = [
                    item for item in client.listItem(folder_id)
                    if any(
                        item.get('name', '').endswith(suffix)
                        for suffix in IMAGE_SUFFIXES
                    )
                ]
                if not len(image_matches):
                    print(f'ERROR: Could not find an item in {case_name} that ends with an image suffix. Skipping case.')
                    continue
                image = image_matches[0]

                # Save Image to database
                image_id = image.get('_id')
                image_object = Image.objects.create(
                    name=case_name,
                    tile_url=f'{SAMPLE_DATA_SERVER}/item/{image_id}/tiles'
                )
                print(f'\nCreated Image object for {case_name}.')

                # Download data
                case_folder = DOWNLOADS_FOLDER / case_name
                print(f'Downloading vector data for {case_name} to {case_folder}.')
                start = datetime.now()
                for data_folder in client.listFolder(folder_id):
                    # Find nucleiMeta and nucleiProps folders
                    data_folder_name = data_folder.get('name')
                    data_folder_path =  case_folder / data_folder_name
                    if 'nuclei' in data_folder_name and (
                        not data_folder_path.exists() or no_cache
                    ):
                        client.downloadFolderRecursive(
                            data_folder.get('_id'), data_folder_path, sync=True
                        )
                seconds = (datetime.now() - start).total_seconds()
                print(f'Completed download in {seconds} seconds.')

                # Read case vector
                print(f'Reading vector data for {case_name}.')
                start = datetime.now()
                vector = get_case_vector(case_folder)
                # Ensure correct column ordering for vector field
                vector = vector[VECTOR_COLUMNS]

                def _clean(v):
                    # ints/floats stay numeric; strings pass through; NaN/Inf -> None (JSON null)
                    if isinstance(v, float):
                        if math.isnan(v) or math.isinf(v):
                            return ''
                        return int(v) if v.is_integer() else v
                    return v

                # Save Cells to database
                cell_data = []
                total_cells = 0
                for roi_name, roi_group in list(vector.groupby('roiname')):
                    components = roi_name.split('_')[2:]
                    roi = {}
                    for component in components:
                        key, value = component.split('-')
                        roi[key] = int(value)
                    for index, row in roi_group.iterrows():
                        cell_data.append(Cell(
                            image=image_object,
                            x=row['Unconstrained.Identifier.CentroidX'] * 2 + roi.get('left'),
                            y=row['Unconstrained.Identifier.CentroidY'] * 2 + roi.get('top'),
                            width=row['Size.MinorAxisLength'] * 2,
                            height=row['Size.MajorAxisLength'] * 2,
                            orientation=0 - row['Orientation.Orientation'],
                            classification=row['Classif.StandardClass'],
                            vector=[str(_clean(v)) for v in row],
                        ))
                        if len(cell_data) >= 10000:
                            cells = Cell.objects.bulk_create(cell_data)
                            total_cells += len(cells)
                            print(f'Created {total_cells} Cells so far...')
                            cell_data = []
                cells = Cell.objects.bulk_create(cell_data)
                seconds = (datetime.now() - start).total_seconds()
                print(f'Created {total_cells} Cells in {seconds} seconds.')

        print('Done.')
