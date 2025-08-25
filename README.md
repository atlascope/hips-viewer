# Atlascope Phase II - HIPS Viewer App

### Overview

TODO

### Initial Setup

1. To prepare the web client, install its requirements with `cd hips_viewer && npm i`.
2. Run the docker containers with `docker compose up`. Be sure to check that containers were able to start and stay running successfully before continuing.
3. While the containers are up, run the following commands in a separate terminal to prepare the database:

   a. Run `docker compose run --rm django ./manage.py migrate`.

   b. Run `docker compose run --rm django ./manage.py createsuperuser`
   and follow the prompts to create your own user.

### Populate sample data

The HIPS Server comes with a management script to populate the database with sample data from [demo.kitware.com](https://demo.kitware.com/histomicstk/#collection/686fddcaf5546bd5eacbe40a). Cases will be downloaded to the `data/downloads` directory.

By default, the populate script will download all cases except for the "test" case. The total size of all ten cases is approximately 33 GB. Each case takes a while to download, so it may be helpful to specify only a few desired case names to populate.

You can add the `--cases` argument to the populate script to specify which cases to populate. For example, `--cases TCGA-3C-AALI-01Z-00-DX1 TCGA-3C-AALK-01Z-00-DX1`. Visit the above link to see the list of the ten available case names. The smallest case is `TCGA-3C-AALK-01Z-00-DX1`.

You can also add the `--no-cache` argument to redownload case data and overwrite any existing local copies.

The populate script can either be run natively or within the Django docker container. In both contexts, the data will be downloaded to the same location.

To run natively:

1.  `cd hips_server`
2.  `pip install -r requirements.txt`
3.  `./manage.py populate`

To run within the Django docker container:

1.  `docker compose run --rm django ./manage.py populate`

### Transform data with UMAP

The HIPS Server comes with some management scripts that allow you to create, list, and apply UMAP Transforms. To learn more about UMAP Transforms, refer to the [documentation](https://umap-learn.readthedocs.io/en/latest/how_umap_works.html) for `umap-learn`, which is a python library used by these management commands.

#### Create UMAP Transforms

`python manage.py create_transform`

By default, this command will create a UMAP Transform object with default parameters, fit the transform to all existing cells in the database (using all columns in each cell vector), generate a name, and save a new `UMAPTransform` object in the database. To refine this behavior, you can use the following arguments to this command.

1. `--umap_kwargs` To overwrite any of the parameters used in the constructor of the UMAP Transform, pass a JSON string to this argument. To learn more about applicable parameters, refer to the [UMAP API Guide](https://umap-learn.readthedocs.io/en/latest/api.html).

2. `--cases` To narrow down the set of cells used for fitting, pass any number of case name strings to this argument. Cases must first exist in the database to use them (see "Populate Sample Data" above).

3. `--classes` To further narrow down the set of cells used for fitting, pass any number of cell classification strings to this argument. Any cells with a "classification" value not matching any of these strings will not be used.

4. `--sample_size` To further narrow down the set of cells used for fitting, pass an integer value N to this argument. After applying case and class filters, the first N matching cells will be used for fitting.

5. `--column_patterns` To narrow down the number of dimensions that the UMAP Transform must fit, pass any number of column name pattern strings to this argument. Any columns with names not matching any of these patterns will be excluded from the UMAP Transform fitting. Pattern strings must be compatible with the python `re.match` function.

6. `--name` To supply a custom name for the `UMAPTransform` object that will be created, pass a string to this argument. By default, names will follow this structure: "Transform of N cells in case1, case2 (M columns)"

Example usage:

```
python manage.py create_transform --cases TCGA-3C-AALI-01Z-00-DX1 --classes CancerEpithelium TILsCell ActiveTILsCell --sample_size 500 --column_patterns Size.* Shape.* Nucleus.* Cytoplasm.* --umap_kwargs '{"n_neighbors": 16, "random_state": 1, "metric": "manhattan"}' --name MyTransform
```

#### Apply a UMAP Transform

`python manage.py apply_transform [transformID]`

Once you have created a `UMAPTransform` object, you can refer to it by its integer ID and use it in this command. The Transform has already been fitted to one population of cells, so this function allows you to apply that fitted transform to another population of cells and get a result. This command will create a `UMAPResult` object that can be visualized as a scatterplot in the web application (in the "Transform Results" menu).

By default, this command will apply the specified Transform to all existing cells in the database. To narrow down the population of cells, this command also accepts the `--cases`, `--classes`, and `--sample_size` arguments, used the same way as for `create_transform`. The set of column names used during the creation of the transform must also be used when applying the transform, so the columns will be automatically filtered.

Example usage:

```
python manage.py apply_transform 1 --cases TCGA-3C-AALI-01Z-00-DX1 --classes CancerEpithelium TILsCell ActiveTILsCell --sample_size 1000
```

#### List existing UMAP Transforms

`python manage.py list_transforms`

This command takes no additional arguments; it will simply list any existing `UMAPTransform` objects in the database along with some relevant information for each one, including the ID, which can be used in the `apply_transform` command, and the total number of existing `UMAPResult` objects that used that transform.

Example usage:

```
python manage.py list_transforms
```

### Run Application

1. Run `docker compose up`.
2. You can access the admin page at port 8000: http://localhost:8000/admin/
3. The user interface is on port **8080**: http://localhost:8080/
4. When finished, use `Ctrl+C` to stop the docker compose command.

### Application Maintenance

Occasionally, new package dependencies or schema changes will necessitate
maintenance. To non-destructively update your development stack at any time:

1. Run `docker compose pull`
2. Run `docker compose build --pull --no-cache`
3. Run `docker compose run --rm django ./manage.py migrate`
