from django.contrib import admin

from .models import Image, Cell, UMAPTransform, UMAPResult

admin.site.register(Image)
admin.site.register(Cell)
admin.site.register(UMAPTransform)
admin.site.register(UMAPResult)
