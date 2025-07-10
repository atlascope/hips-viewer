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
