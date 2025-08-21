import re
import umap
import tempfile
import pickle
import pandas as pd

from datetime import datetime
from pathlib import Path
from sklearn.preprocessing import normalize

from django.core.files.base import ContentFile
from tcga.models import Image, Cell, UMAPTransform
from tcga.constants import VECTOR_COLUMNS, DEFAULT_UMAP_KWARGS


def fit_and_create_transform(**kwargs):
    start = datetime.now()

    name = kwargs.get('name')
    cases = kwargs.get('cases')
    column_patterns = kwargs.get('column_patterns')
    classes = kwargs.get('classes')
    sample_size = kwargs.get('sample_size')
    umap_kwargs = kwargs.get('umap_kwargs')
    if cases is not None and len(cases):
        images = Image.objects.filter(name__in=cases)
        if not len(images):
            raise Exception('No images found matching cases list.')
        if len(cases) != len(images):
            print('Warning: Could not match all cases to existing images.')
            print(f'Found {[im.name for im in images]}. Proceeding with found data.')
    else:
        images = Image.objects.all()
    if column_patterns is not None and len(column_patterns):
        columns = [
            c for c in VECTOR_COLUMNS
            if any(re.match(pattern, c) for pattern in column_patterns)
        ]
        if not len(columns):
            raise Exception('No columns found matching column patterns list.')
    else:
        columns = VECTOR_COLUMNS
    cells = Cell.objects.filter(image__in=images)
    cell_classes = cells.values_list('classification', flat=True).distinct()
    if classes is not None and len(classes):
        cell_classes = [c for c in cell_classes if c in classes]
        if not len(cell_classes):
            raise Exception('No cell classifications found matching classes list.')
    cells = cells.filter(classification__in=cell_classes).all()
    if sample_size:
        cells = cells[:sample_size]
    umap_kwarg_set = DEFAULT_UMAP_KWARGS
    if umap_kwargs:
        for key in umap_kwargs:
            if key not in umap_kwarg_set:
                raise Exception(f'Unrecognized UMAP kwarg "{key}".')
        umap_kwarg_set.update(umap_kwargs)
    if not name:
        name = (
            'Transform of ' +
            ', '.join(cell_classes) +
            ' in ' +
            ', '.join([im.name for im in images]) +
            f' ({len(columns)} columns)'
        )

    print('Generating data structure to fit UMAP Transform.')
    column_indexes = {k: VECTOR_COLUMNS.index(k) for k in columns}
    data = []
    for cell in cells:
        cell_vector = cell.vector_text.split(',')
        data.append({
            k: float(cell_vector[i]) for k, i in column_indexes.items()
        })
    df = pd.DataFrame(data, columns=columns)
    # Drop non-numeric columns and fill NaNs
    df = df.drop([
        c for c in df.columns
        if str(df[c].dtype) != 'float64'
    ], axis=1).fillna(-1)
    shape = df.shape
    print(f'Generated DataFrame with {shape[0]} rows and {shape[1]} columns.')

    print('Fitting UMAP Transform.')
    input_data = normalize(df, axis=1, norm='l1')
    transform = umap.UMAP(**umap_kwarg_set).fit(input_data)

    print('Pickling UMAP Transform to save to database.')
    content_file = None
    content_file_name = 'transform.pkl'
    with tempfile.TemporaryDirectory() as tmp:
        filepath = Path(tmp) / content_file_name
        with open(filepath, 'wb') as f:
            pickle.dump(transform, f)
        with open(filepath, 'rb') as f:
            content_file = ContentFile(f.read(), content_file_name)

    print('Creating UMAPTransform object.')
    instance = UMAPTransform.objects.create(
        name=name,
        column_names=columns,
        umap_kwargs=umap_kwarg_set,
    )
    instance.fitted_cells.set(cells)
    instance.pickled.save(content_file_name, content_file)

    seconds = (datetime.now() - start).total_seconds()
    print(f'Completed in {seconds} seconds.')
