from django.urls import path
from breakfast.api import api

urlpatterns = [
    path('api/', api.urls),
]
