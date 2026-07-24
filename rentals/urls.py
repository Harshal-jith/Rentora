from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='index'),
    path('api/properties/', views.api_properties, name='api_properties'),
    path('api/bookings/create/', views.api_create_booking, name='api_create_booking'),
    path('api/bookings/<int:booking_id>/status/', views.api_update_booking_status, name='api_update_booking_status'),
    path('api/bookings/<int:booking_id>/cancel/', views.api_cancel_booking, name='api_cancel_booking'),
    path('api/bookings/export/csv/', views.api_export_bookings_csv, name='api_export_bookings_csv'),
    path('api/bookings/<int:booking_id>/qrcode/', views.api_booking_qrcode, name='api_booking_qrcode'),
    path('api/bookings/<int:booking_id>/pdf/', views.api_booking_pdf, name='api_booking_pdf'),
    path('api/analytics/', views.api_analytics_data, name='api_analytics_data'),
    path('api/auth/signup/', views.api_signup, name='api_signup'),
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/auth/logout/', views.api_logout, name='api_logout'),
    path('api/auth/user/', views.api_user_status, name='api_user_status'),
    path('api/user/bookings/', views.api_user_bookings, name='api_user_bookings'),
    path('test-404/', views.test_404_view, name='test_404'),
    path('test-500/', views.test_500_view, name='test_500'),
]
