from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='index'),
    path('api/properties/', views.api_properties, name='api_properties'),
    path('api/bookings/create/', views.api_create_booking, name='api_create_booking'),
    path('api/bookings/<int:booking_id>/status/', views.api_update_booking_status, name='api_update_booking_status'),
]
