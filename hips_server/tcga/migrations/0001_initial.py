# Generated by Django 5.2.4 on 2025-07-09 20:47

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Image',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('tile_url', models.CharField(max_length=500)),
            ],
        ),
        migrations.CreateModel(
            name='Cell',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('x', models.FloatField()),
                ('y', models.FloatField()),
                ('width', models.FloatField()),
                ('height', models.FloatField()),
                ('orientation', models.FloatField()),
                ('classification', models.CharField(max_length=255)),
                ('vector_text', models.TextField()),
                ('image', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tcga.image')),
            ],
        ),
    ]
