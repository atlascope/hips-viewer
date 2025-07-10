import pandas


def get_case_vector(case_folder, rois=None):
    results = None
    meta_vectors = case_folder / 'nucleiMeta'
    prop_vectors = case_folder / 'nucleiProps'
    meta_vector_files = list(meta_vectors.glob('*.csv'))
    prop_vector_files = list(prop_vectors.glob('*.csv'))

    for meta_vector_file in meta_vector_files:
        roi_name = meta_vector_file.name.replace('.csv', '')
        if rois is None or roi_name in rois:
            prop_vector_file = next((
                f for f in prop_vector_files
                if f.name == meta_vector_file.name
            ), None)
            if prop_vector_file:
                meta = pandas.read_csv(
                    str(meta_vector_file),
                    usecols=lambda x: 'Unnamed' not in x
                ).reset_index(drop=True)
                props = pandas.read_csv(
                    str(prop_vector_file),
                    usecols=lambda x: 'Unnamed' not in x
                ).reset_index(drop=True)
                intersection_cols = list(meta.columns.intersection(props.columns))
                props = props.drop(intersection_cols, axis=1)
                vector = pandas.concat([meta, props], axis=1)
                if results is None:
                    results = vector
                else:
                    results = pandas.concat([results, vector])
            else:
                print('No prop file for', meta_vector_file.name)
    return results
